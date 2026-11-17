from datetime import date, timedelta
from decimal import Decimal
from django.db.models import Prefetch, Q
from django.utils import timezone
from django.conf import settings

from .models import Convocatoria, Evento, Partido, Jugador, Plantilla, EstadisticaPartido
from ..catalogo.models import Temporada
from ..ingesta import sync

class ResourceNotFound(Exception):
    def __init__(self, resource: str, resource_id: int):
        self.resource = resource
        self.resource_id = resource_id
        super().__init__(f"{resource} with id {resource_id} was not found")

#region Partido
def get_partidos(
        temporada_id: int | None = None, equipo_id: int | None = None,
        estado: str | None = None, fecha_desde: date | None = None, fecha_hasta: date | None = None,
        today: bool = False, count: int | None = 30
    ) -> list[dict]:

    partidos = Partido.objects.all()

    if today:
        if settings.USE_LIVE_MOCK_DATA:
            partidos = partidos.filter(estado = "PROGRAMADO")
        else:
            fecha_desde = fecha_hasta = timezone.localdate()

    if temporada_id is not None:
        partidos = partidos.filter(temporada_id=temporada_id)

    if equipo_id is not None:
        partidos = partidos.filter(
            Q(equipo_local_id=equipo_id) | Q(equipo_visitante_id=equipo_id)
        )

    if estado:
        partidos = partidos.filter(estado=estado)

    if fecha_desde:
        partidos = partidos.filter(fecha__date__gte=fecha_desde)

    if fecha_hasta:
        partidos = partidos.filter(fecha__date__lte=fecha_hasta)

    partidos = partidos.select_related(
        "equipo_local", "equipo_visitante", "temporada__competicion", "estadio",
    ).order_by("fecha", "id")[:count]

    if settings.USE_LIVE_MOCK_DATA and today:
        import random

        partidos = list(partidos[:10])
        start = random.randint(1, 4)
        end = random.randint(4, 8)

        for idx, partido in enumerate(partidos):
            if idx >= start and idx <= end:
                partido.estado = Partido.Estado.EN_JUEGO
                partido.minuto_actual = random.randint(1, 100)
                partido.goles_local = random.randint(0, 5)
                partido.goles_vis = random.randint(0, 5)
            elif idx > end:
                partido.estado = Partido.Estado.FINALIZADO
                partido.goles_local = random.randint(0, 5)
                partido.goles_vis = random.randint(0, 5)

    return [
        {
            "id": partido.id,
            "equipos": {
                "local": {
                    "id": partido.equipo_local_id,
                    "nombre": partido.equipo_local.nombre,
                    "imagen": partido.equipo_local.escudo_url,
                },
                "visitante": {
                    "id": partido.equipo_visitante_id,
                    "nombre": partido.equipo_visitante.nombre,
                    "imagen": partido.equipo_visitante.escudo_url,
                },
            },
            "competicion": {
                "id": partido.temporada.competicion_id,
                "nombre": partido.temporada.competicion.nombre,
                "imagen": partido.temporada.competicion.logo_url,
                "pais": {
                    "id": partido.temporada.competicion.pais_id if partido.temporada.competicion.pais else None,
                    "nombre": partido.temporada.competicion.pais.nombre if partido.temporada.competicion.pais else None
                }
            },
            "temporada": {
                "id": partido.temporada_id,
            },
            "fecha": partido.fecha,
            "estado": partido.estado,
            "minuto_actual": partido.minuto_actual,
            "semana": partido.semana,
            "goles": {
                "local": partido.goles_local,
                "visitante": partido.goles_vis,
            },
            "estadio": {
                "nombre": (
                    partido.estadio.nombre
                    if partido.estadio_id is not None
                    else partido.sede_nombre
                ),
                "latitud": (
                    partido.estadio.latitud
                    if partido.estadio_id is not None
                    else partido.sede_latitud
                ),
                "longitud": (
                    partido.estadio.longitud
                    if partido.estadio_id is not None
                    else partido.sede_longitud
                ),
            },
        }
        for partido in partidos
    ]


def _percentile_ranks_by_team(values: dict[int, Decimal]) -> dict[int, float]:
    ranked_values = sorted(values.items(), key=lambda item: item[1])
    team_count = len(ranked_values)
    if team_count == 0:
        return {}
    if team_count == 1:
        return {ranked_values[0][0]: 50.0}

    percentiles = {}
    start = 0
    while start < team_count:
        end = start
        while end + 1 < team_count and ranked_values[end + 1][1] == ranked_values[start][1]:
            end += 1

        # Midranks keep ties equal and scale unique extrema to 0 and 100.
        average_rank = (start + end) / 2
        percentile = average_rank / (team_count - 1) * 100
        for team_id, _ in ranked_values[start : end + 1]:
            percentiles[team_id] = percentile
        start = end + 1

    return percentiles


def _get_season_team_performance(temporada_id: int, extra_team_ids: tuple[int, ...]) -> tuple[dict[int, float], dict[int, float]]:
    team_ids = {
        team_id
        for team_id in Temporada.objects.filter(pk=temporada_id).values_list(
            "equipos__id",
            flat=True,
        )
        if team_id is not None
    }
    team_ids.update(extra_team_ids)

    team_totals = {
        team_id: {
            "goals": 0,
            "xg": Decimal("0"),
            "opponent_xg": Decimal("0"),
            "dangerous_attacks": 0,
            "opponent_dangerous_attacks": 0,
            "attacks": 0,
            "shots": 0,
            "opponent_shots": 0,
            "shots_on_target": 0,
            "fouls": 0,
            "cards": 0,
        }
        for team_id in team_ids
    }

    completed_matches = list(
        Partido.objects.filter(
            temporada_id=temporada_id,
            estado__in=(Partido.Estado.FINALIZADO, "complete"),
            goles_local__isnull=False,
            goles_vis__isnull=False,
        ).values(
            "id",
            "equipo_local_id",
            "equipo_visitante_id",
            "goles_local",
            "goles_vis",
        )
    )
    match_teams = {}
    for match in completed_matches:
        home = team_totals.get(match["equipo_local_id"])
        away = team_totals.get(match["equipo_visitante_id"])
        match_teams[match["id"]] = (
            match["equipo_local_id"],
            match["equipo_visitante_id"],
        )
        if home is not None:
            home["goals"] += match["goles_local"]
        if away is not None:
            away["goals"] += match["goles_vis"]

    match_ids = [match["id"] for match in completed_matches]
    stats = EstadisticaPartido.objects.filter(
        partido_id__in=match_ids,
        equipo_id__in=team_ids,
    ).values(
        "partido_id",
        "equipo_id",
        "xg",
        "ataques_peligrosos",
        "ataques",
        "tiros_total",
        "tiros_a_puerta",
        "faltas",
        "tarjetas_amarillas",
        "tarjetas_rojas",
    )
    for stat in stats:
        totals = team_totals[stat["equipo_id"]]
        if stat["xg"] is not None:
            totals["xg"] += stat["xg"]
        totals["fouls"] += stat["faltas"] or 0
        totals["cards"] += (stat["tarjetas_amarillas"] or 0) + (
            stat["tarjetas_rojas"] or 0
        )
        for field, total_field in (
            ("ataques_peligrosos", "dangerous_attacks"),
            ("ataques", "attacks"),
            ("tiros_total", "shots"),
            ("tiros_a_puerta", "shots_on_target"),
        ):
            if stat[field] is not None:
                totals[total_field] += stat[field]

        home_id, away_id = match_teams[stat["partido_id"]]
        if stat["equipo_id"] == home_id:
            opponent_totals = team_totals.get(away_id)
        elif stat["equipo_id"] == away_id:
            opponent_totals = team_totals.get(home_id)
        else:
            opponent_totals = None

        if opponent_totals is not None:
            if stat["xg"] is not None:
                opponent_totals["opponent_xg"] += stat["xg"]
            if stat["ataques_peligrosos"] is not None:
                opponent_totals["opponent_dangerous_attacks"] += stat[
                    "ataques_peligrosos"
                ]
            if stat["tiros_total"] is not None:
                opponent_totals["opponent_shots"] += stat["tiros_total"]

    metric_values = {
        "xg": {},
        "dangerous_attacks": {},
        "dangerous_attacks_ratio": {},
        "goal_xg_efficiency": {},
        "shots_on_target_ratio": {},
    }
    defensive_metric_values = {
        "opponent_xg": {},
        "opponent_dangerous_attacks": {},
        "opponent_shots": {},
        "fouls": {},
        "fouls_per_card": {},
    }
    for team_id, totals in team_totals.items():
        metric_values["xg"][team_id] = totals["xg"]
        metric_values["dangerous_attacks"][team_id] = Decimal(
            totals["dangerous_attacks"]
        )
        metric_values["dangerous_attacks_ratio"][team_id] = (
            Decimal(totals["dangerous_attacks"]) / totals["attacks"]
            if totals["attacks"]
            else Decimal("0")
        )
        metric_values["goal_xg_efficiency"][team_id] = (
            Decimal(totals["goals"]) / totals["xg"]
            if totals["xg"]
            else Decimal("0")
        )
        metric_values["shots_on_target_ratio"][team_id] = (
            Decimal(totals["shots_on_target"]) / totals["shots"]
            if totals["shots"]
            else Decimal("0")
        )
        defensive_metric_values["opponent_xg"][team_id] = totals["opponent_xg"]
        defensive_metric_values["opponent_dangerous_attacks"][team_id] = Decimal(
            totals["opponent_dangerous_attacks"]
        )
        defensive_metric_values["opponent_shots"][team_id] = Decimal(
            totals["opponent_shots"]
        )
        defensive_metric_values["fouls"][team_id] = Decimal(totals["fouls"])
        defensive_metric_values["fouls_per_card"][team_id] = (
            Decimal(totals["fouls"]) / totals["cards"]
            if totals["cards"]
            else Decimal("0")
        )

    offensive_weights = {
        "xg": 0.40,
        "dangerous_attacks": 0.15,
        "dangerous_attacks_ratio": 0.05,
        "goal_xg_efficiency": 0.25,
        "shots_on_target_ratio": 0.15,
    }
    offensive_percentiles = {
        metric: _percentile_ranks_by_team(values)
        for metric, values in metric_values.items()
    }
    offensive_performance = {
        team_id: round(
            sum(
                offensive_percentiles[metric][team_id] * weight
                for metric, weight in offensive_weights.items()
            ),
            2,
        )
        for team_id in team_ids
    }
    defensive_weights = {
        "opponent_xg": 0.35,
        "opponent_dangerous_attacks": 0.25,
        "opponent_shots": 0.15,
        "fouls": 0.10,
        "fouls_per_card": 0.15,
    }
    defensive_percentiles = {
        metric: _percentile_ranks_by_team(values)
        for metric, values in defensive_metric_values.items()
    }
    inverse_defensive_metrics = {
        "opponent_xg",
        "opponent_dangerous_attacks",
        "opponent_shots",
        "fouls",
    }
    defensive_performance = {
        team_id: round(
            sum(
                (
                    100 - defensive_percentiles[metric][team_id]
                    if metric in inverse_defensive_metrics
                    else defensive_percentiles[metric][team_id]
                )
                * weight
                for metric, weight in defensive_weights.items()
            ),
            2,
        )
        for team_id in team_ids
    }
    return offensive_performance, defensive_performance


def get_partido(partido_id: int) -> dict | None:
    instance = Partido.objects.filter(pk=partido_id).first()

    if instance is None:
        raise ResourceNotFound("partido", partido_id)

    # El partido solo se debe actualizar cuando esta su estado es en juego 
    # (todos los datos del detalle son solo relevantes cuando esta en juego)

    update_match = instance.nivel_datos == Partido.NivelDatos.PARCIAL or (
        timezone.now() - instance.ultima_actualizacion >= timedelta(minutes=5) and 
        (instance.estado == Partido.Estado.EN_JUEGO or instance.eventos == [] or instance.convocatorias == [])
    )

    if update_match:
        sync.sync_match_detail([instance.api_id])

    partido = (
        Partido.objects.select_related(
            "equipo_local",
            "equipo_visitante",
            "temporada__competicion",
            "estadio",
        )
        .prefetch_related(
            Prefetch(
                "eventos",
                queryset=Evento.objects.select_related(
                    "jugador", "jugador_sale"
                ).order_by("minuto", "id"),
            ),
            Prefetch(
                "convocatorias",
                queryset=Convocatoria.objects.select_related(
                    "jugador", "equipo"
                )
                .filter(
                    equipo_id__in=[
                        instance.equipo_local_id,
                        instance.equipo_visitante_id,
                    ]
                )
                .order_by("-titular", "dorsal", "jugador__nombre"),
            ),
            Prefetch(
                "estadisticas_equipo",
                queryset=EstadisticaPartido.objects.all(),
            ),
        )
        .filter(pk=partido_id)
        .first()
    )

    if partido is None:
        raise ResourceNotFound("partido", partido_id)

    offensive_performance, defensive_performance = _get_season_team_performance(
        partido.temporada_id,
        (partido.equipo_local_id, partido.equipo_visitante_id),
    )

    def jugador_data(jugador):
        if jugador is None:
            return None

        return {
            "id": jugador.id,
            "nombre": jugador.nombre,
            "apodo": jugador.apodo,
            "imagen": jugador.foto_url,
        }

    convocatorias = {"home": [], "away": []}
    for convocatoria in partido.convocatorias.all():
        lado = (
            "home"
            if convocatoria.equipo_id == partido.equipo_local_id
            else "away"
        )
        convocatorias[lado].append(
            {
                "jugador": jugador_data(convocatoria.jugador),
                "titular": convocatoria.titular,
                "dorsal": convocatoria.dorsal,
                "posicion": convocatoria.posicion,
                "min_entrada": convocatoria.min_entrada,
                "min_salida": convocatoria.min_salida,
            }
        )

    estadisticas_por_equipo = {
        estadistica.equipo_id: estadistica
        for estadistica in partido.estadisticas_equipo.all()
    }

    def estadisticas_data(equipo_id):
        estadisticas = estadisticas_por_equipo.get(equipo_id)
        
        return {
            "xg": estadisticas.xg,
            "xg_prematch": estadisticas.xg_prematch,
            "tiros_total": estadisticas.tiros_total,
            "tiros_a_puerta": estadisticas.tiros_a_puerta,
            "tiros_fuera": estadisticas.tiros_fuera,
            "posesion": estadisticas.posesion,
            "corners": estadisticas.corners,
            "offsides": estadisticas.offsides,
            "tarjetas_amarillas": estadisticas.tarjetas_amarillas,
            "tarjetas_rojas": estadisticas.tarjetas_rojas,
            "faltas": estadisticas.faltas,
            "ataques": estadisticas.ataques,
            "ataques_peligrosos": estadisticas.ataques_peligrosos,
            "rendimiento_ofensivo": offensive_performance[equipo_id] if estadisticas.xg else None,
            "rendimiento_defensivo": defensive_performance[equipo_id] if estadisticas.xg else None,
            "rendimiento_general": (offensive_performance[equipo_id] * 0.55 + defensive_performance[equipo_id] * 0.45) if estadisticas.xg else None
        }

    partido_data = {
        "id": partido.id,
        "equipos": {
            "local": {
                "id": partido.equipo_local_id,
                "nombre": partido.equipo_local.nombre,
                "imagen": partido.equipo_local.escudo_url,
            },
            "visitante": {
                "id": partido.equipo_visitante_id,
                "nombre": partido.equipo_visitante.nombre,
                "imagen": partido.equipo_visitante.escudo_url,
            },
        },
        "competicion": {
            "id": partido.temporada.competicion_id,
            "nombre": partido.temporada.competicion.nombre,
            "imagen": partido.temporada.competicion.logo_url,
        },
        "temporada": {
            "id": partido.temporada_id,
            "periodo": partido.temporada.periodo
        },
        "fecha": partido.fecha,
        "estado": partido.estado,
        "minuto_actual": partido.minuto_actual,
        "semana": partido.semana,
        "goles": {
            "local": partido.goles_local,
            "visitante": partido.goles_vis,
        },
        "estadisticas": {
            "local": estadisticas_data(partido.equipo_local_id),
            "visitante": estadisticas_data(partido.equipo_visitante_id),
        },
        "estadio": {
            "nombre": (
                partido.estadio.nombre
                if partido.estadio_id is not None
                else partido.sede_nombre
            ),
            "latitud": (
                partido.estadio.latitud
                if partido.estadio_id is not None
                else partido.sede_latitud
            ),
            "longitud": (
                partido.estadio.longitud
                if partido.estadio_id is not None
                else partido.sede_longitud
            ),
        },
        "eventos": [
            {
                "id": evento.id,
                "tipo": evento.get_tipo_display(),
                "tipo_codigo": evento.tipo,
                "minuto": evento.minuto,
                "jugador": jugador_data(evento.jugador),
                "jugador_sale": jugador_data(evento.jugador_sale),
            }
            for evento in partido.eventos.all()
        ],
        "convocatorias": convocatorias,
    }

    return partido_data
#endregion

#region Jugadores
def get_jugadores(
        nombre: str | None = None,
        temporada_id: int | None = None, equipo_id: int | None = None, pais_id: int | None = None
    ) -> list[dict]:
    jugadores = Jugador.objects.all()

    if equipo_id and not temporada_id:
        qs = Plantilla.objects.filter(equipo_temporada__equipo_id=equipo_id)

        temporada_id = qs.order_by(
            "-equipo_temporada__temporada__fecha_inicio",
            "-equipo_temporada__temporada_id",
        ).values_list("equipo_temporada__temporada_id", flat=True).first()

        if temporada_id is None:
            return []

    if nombre:
        jugadores = jugadores.filter(nombre__icontains=nombre)

    if temporada_id:
        jugadores = jugadores.filter(plantillas__equipo_temporada__temporada_id = temporada_id).distinct()

    if equipo_id:
        jugadores = jugadores.filter(plantillas__equipo_temporada__equipo_id = equipo_id).distinct()

    if pais_id:
        jugadores = jugadores.filter(pais__id = pais_id)

    return list(jugadores.order_by("nombre").values("id", "nombre", "foto_url"))



def get_jugador(jugador_id: int) -> dict | None:
    instance = Jugador.objects.select_related("pais").filter(pk=jugador_id).first()

    if instance is None:
        raise ResourceNotFound("jugador", jugador_id)

    if instance.nivel_datos == Jugador.NivelDatos.PARCIAL:
        sync.sync_player_detail([instance.api_id])
        instance = Jugador.objects.select_related("pais").get(pk=jugador_id)

    if instance.pais:
        jugador_pais = {
            "id": instance.pais.id if instance.pais is not None else None,
            "nombre": instance.pais.nombre if instance.pais is not None else None,
            "bandera_url": instance.pais.bandera_url if instance.pais is not None else None
        }
    else:
        jugador_pais = None

    current_year = timezone.localdate().year
    roster_entries = list(
        Plantilla.objects.filter(jugador=instance)
        .select_related(
            "equipo_temporada__equipo",
            "equipo_temporada__temporada__competicion",
        )
        .order_by(
            "-equipo_temporada__temporada__fecha_inicio",
            "equipo_temporada__equipo__nombre",
        )
    )

    convocatorias = list(
        Convocatoria.objects.filter(
            jugador=instance,
            partido__estado__in=(Partido.Estado.FINALIZADO, "complete"),
        )
        .select_related(
            "equipo",
            "partido__temporada__competicion",
            "partido__equipo_local",
            "partido__equipo_visitante",
        )
        .order_by("-partido__fecha", "-partido_id")
    )

    player_events = list(
        Evento.objects.filter(
            Q(jugador=instance) | Q(jugador_sale=instance)
        ).values("partido_id", "tipo", "jugador_id")
    )

    goals_by_match = {}
    event_match_ids = set()

    for event in player_events:
        event_match_ids.add(event["partido_id"])

        if (event["tipo"] == Evento.Tipo.GOL or event["tipo"] == Evento.Tipo.PENAL) and event["jugador_id"] == instance.id:
            goals_by_match[event["partido_id"]] = (
                goals_by_match.get(event["partido_id"], 0) + 1
            )

    appearances = []

    for convocatoria in convocatorias:
        played = (
            convocatoria.titular
            or convocatoria.min_entrada is not None
            or convocatoria.partido_id in event_match_ids
        )
        if not played:
            continue

        match_minutes = 90
        start_minute = 0 if convocatoria.titular else convocatoria.min_entrada

        if start_minute is None:
            minutes = 0
        else:
            end_minute = (
                convocatoria.min_salida
                if convocatoria.min_salida is not None
                else match_minutes
            )
            minutes = max(0, end_minute - start_minute)

        match = convocatoria.partido
        appearances.append(
            {
                "match": match,
                "team": convocatoria.equipo,
                "minutes": minutes,
                "goals": goals_by_match.get(match.id, 0),
            }
        )

    performance_by_season = {}

    for roster_entry in roster_entries:
        season = roster_entry.equipo_temporada.temporada
        
        if season.fecha_inicio.year <= current_year <= season.fecha_fin.year:
            competition = season.competicion
            performance_by_season.setdefault(
                season.id,
                {
                    "competicion": {
                        "id": competition.id,
                        "nombre": competition.nombre,
                        "logo_url": competition.logo_url,
                    },
                    "temporada": {
                        "id": season.id,
                        "periodo": season.periodo,
                    },
                    "partidos": 0,
                    "minutos": 0,
                    "goles": 0,
                },
            )

    clubs_by_id = {}

    for roster_entry in roster_entries:
        team_season = roster_entry.equipo_temporada
        team = team_season.equipo
        season = team_season.temporada
        club = clubs_by_id.setdefault(
            team.id,
            {
                "equipo": {
                    "id": team.id,
                    "nombre": team.nombre,
                    "escudo_url": team.escudo_url,
                },
                "fecha_desde": season.fecha_inicio,
                "fecha_hasta": season.fecha_fin,
                "partidos": 0,
                "goles": 0,
            },
        )
        club["fecha_desde"] = min(club["fecha_desde"], season.fecha_inicio)
        club["fecha_hasta"] = max(club["fecha_hasta"], season.fecha_fin)

    for appearance in appearances:
        match = appearance["match"]
        season = match.temporada
        performance = performance_by_season.get(season.id)

        if performance is not None:
            performance["partidos"] += 1
            performance["minutos"] += appearance["minutes"]
            performance["goles"] += appearance["goals"]

        club = clubs_by_id.get(appearance["team"].id)

        if club is not None:
            club["partidos"] += 1
            club["goles"] += appearance["goals"]

    datos_rendimiento = []

    for performance in performance_by_season.values():
        goals = performance["goles"]
        performance["min/gol"] = (round(performance["minutos"] / goals, 1) if goals else None)

        datos_rendimiento.append(performance)

    ultimos_partidos = []

    for appearance in appearances[:5]:
        match = appearance["match"]
        team = appearance["team"]
        rival = (
            match.equipo_visitante
            if team.id == match.equipo_local_id
            else match.equipo_local
        )
        equipo_jugador_local = team.id == match.equipo_local_id
        ultimos_partidos.append(
            {
                "fecha": match.fecha,
                "competicion": {
                    "id": match.temporada.competicion_id,
                    "nombre": match.temporada.competicion.nombre,
                    "logo_url": match.temporada.competicion.logo_url,
                },
                "temporada": {
                    "id": match.temporada_id,
                    "periodo": match.temporada.periodo,
                },
                "equipo_jugador": {
                    "id": team.id,
                    "nombre": team.nombre,
                    "escudo_url": team.escudo_url,
                },
                "equipo_rival": {
                    "id": rival.id,
                    "nombre": rival.nombre,
                    "escudo_url": rival.escudo_url,
                },
                "marcador": {
                    "equipo_jugador": (
                        match.goles_local if equipo_jugador_local else match.goles_vis
                    ),
                    "equipo_rival": (
                        match.goles_vis if equipo_jugador_local else match.goles_local
                    ),
                },
                "minutos": appearance["minutes"],
                "goles": appearance["goals"],
            }
        )

    jugador_data = {
        "id": instance.id,
        "nombre": instance.nombre,
        "apodo": instance.apodo,
        "fecha_nacimiento": instance.fecha_nacimiento,
        "altura": instance.altura,
        "peso": instance.peso,
        "foto_url": instance.foto_url,
        "pais": jugador_pais,
        "datos_rendimiento": datos_rendimiento,
        "historial_clubes": list(clubs_by_id.values()),
        "ultimos_partidos": ultimos_partidos,
    }

    return jugador_data
#endregion