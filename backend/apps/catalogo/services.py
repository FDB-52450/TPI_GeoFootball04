from django.db.models import Q
from django.utils import timezone

from .models import Confederacion, Pais, Competicion, Temporada, Equipo, Estadio
from apps.partidos.models import Evento, Partido

from ..ingesta import sync


class ResourceNotFound(Exception):
    def __init__(self, resource: str, resource_id: int):
        self.resource = resource
        self.resource_id = resource_id
        super().__init__(f"{resource} with id {resource_id} was not found")


#region Confederaciones
def get_confederaciones(nombre: str | None = None) -> list[dict]:
    confederaciones = Confederacion.objects.all()

    if nombre:
        confederaciones = confederaciones.filter(nombre__icontains=nombre)

    return list(
        confederaciones.order_by("nombre").values("id", "nombre", "region", "logo_url")
    )

def get_confederacion(confederacion_id: int) -> dict | None:
    instance = Confederacion.objects.filter(pk=confederacion_id).first()

    if instance is None:
        raise ResourceNotFound("confederacion", confederacion_id)

    confederacion = {
        "id": instance.id, "nombre": instance.nombre, 
        "region": instance.region, "logo_url": instance.logo_url,
    }

    confederacion["paises"] = list(
        instance.paises.order_by("nombre").values("id", "nombre", "codigo_iso3", "bandera_url")
    )

    confederacion["competiciones"] = list(
        instance.competiciones.order_by("nombre").values("id", "nombre", "tipo", "logo_url")
    )
    
    return confederacion
#endregion

#region Paises
def get_paises(nombre: str | None = None) -> list[dict]:
    paises = Pais.objects.all()

    if nombre:
        paises = paises.filter(nombre__icontains=nombre)

    return list(
        paises.order_by("nombre").values("id", "nombre", "codigo_iso3", "bandera_url")
    )

def get_pais(pais_id: int) -> dict | None:
    instance = Pais.objects.filter(pk=pais_id).first()

    if instance is None:
        raise ResourceNotFound("pais", pais_id)

    pais = {
        "id": instance.id, "nombre": instance.nombre,
        "codigo_iso3": instance.codigo_iso3, "bandera_url": instance.bandera_url,
    }

    pais["confederacion"] = {
        "id": instance.confederacion.id,
        "nombre": instance.confederacion.nombre,
        "region": instance.confederacion.region,
    }

    pais["competiciones"] = list(
        instance.competiciones.order_by("nombre").values("id", "nombre", "tipo", "logo_url")
    )

    # TODO: Agregar listado de jugadores de pais.
    
    return pais
#endregion

#region Competicion
def get_competiciones(
        nombre: str | None = None, confederacion_id: int | None = None,
        pais_id: int | None = None,
    ) -> list[dict]:
    competiciones = Competicion.objects.all()

    if nombre:
        competiciones = competiciones.filter(nombre__icontains=nombre)

    filters = {}

    if confederacion_id is not None:
        filters["confederacion__id"] = confederacion_id

    if pais_id is not None:
        filters["pais__id"] = pais_id

    if filters:
        competiciones = competiciones.filter(**filters).distinct()

    return list(
        competiciones.order_by("nombre").values("id", "nombre", "tipo", "logo_url")
    )


def get_competicion(competicion_id: int) -> dict | None:
    instance = Competicion.objects.filter(pk=competicion_id).first()

    if instance is None:
        raise ResourceNotFound("competicion", competicion_id)

    competicion = {
        "id": instance.id, "nombre": instance.nombre,
        "tipo": instance.tipo, "logo_url": instance.logo_url,
    }

    if instance.confederacion is not None:
        competicion["confederacion"] = {
            "id": instance.confederacion.id,
            "nombre": instance.confederacion.nombre,
            "region": instance.confederacion.region,
        }

    if instance.pais is not None:
        competicion["pais"] = {
            "id": instance.pais.id,
            "nombre": instance.pais.nombre,
            "codigo_iso3": instance.pais.codigo_iso3,
            "bandera_url": instance.pais.bandera_url
        }

    competicion["temporadas"] = list(
        instance.temporadas.order_by("-periodo").values("id", "periodo", "fecha_inicio", "fecha_fin")
    )
    
    return competicion


def get_competicion_temporada(competicion_id: int, temporada_id: int) -> dict:
    temporada = (
        Temporada.objects.filter(pk=temporada_id, competicion_id=competicion_id).first()
    )

    if temporada is None:
        if not Competicion.objects.filter(pk=competicion_id).exists():
            raise ResourceNotFound("competicion", competicion_id)
        
        raise ResourceNotFound("temporada", temporada_id)

    if temporada.estado_datos == Temporada.EstadoDatos.NO_CARGADA:
        sync.sync_matches([temporada.competicion.api_id], [temporada.api_id])

    season_matches = Partido.objects.filter(temporada=temporada)
    live_matches = season_matches.filter(estado=Partido.Estado.EN_JUEGO).order_by("-fecha", "-id")
    live_count = live_matches.count()

    finished_count = max(0, 5 - (live_count + 1) // 2)
    upcoming_count = max(0, 5 - live_count // 2)

    selected_matches = list(
        season_matches.filter(estado=Partido.Estado.FINALIZADO)
        .order_by("-fecha", "-id")
        .values(
            "id", "fecha", "estado", "semana",
            "goles_local", "goles_vis",
            "equipo_local_id", "equipo_local__nombre", "equipo_local__escudo_url",
            "equipo_visitante_id", "equipo_visitante__nombre", "equipo_visitante__escudo_url"
        )[:finished_count]
    )
    selected_matches.extend(
        live_matches.values(
            "id", "fecha", "estado", "semana",
            "goles_local", "goles_vis",
            "equipo_local_id", "equipo_local__nombre", "equipo_local__escudo_url",
            "equipo_visitante_id", "equipo_visitante__nombre", "equipo_visitante__escudo_url"
        )
    )
    selected_matches.extend(
        season_matches.filter(
            estado=Partido.Estado.PROGRAMADO,
            fecha__gte=timezone.now(),
        )
        .order_by("fecha", "id")
        .values(
            "id", "fecha", "estado", "semana",
            "goles_local", "goles_vis",
            "equipo_local_id", "equipo_local__nombre", "equipo_local__escudo_url",
            "equipo_visitante_id", "equipo_visitante__nombre", "equipo_visitante__escudo_url"
        )[:upcoming_count]
    )
    selected_matches.sort(
        key=lambda match: (match["fecha"], match["id"]),
        reverse=False,
    )

    temporada_data = {
        "id": temporada.id,
        "periodo": temporada.periodo,
        "fecha_inicio": temporada.fecha_inicio,
        "fecha_fin": temporada.fecha_fin,
        "partidos_totales": len(season_matches),
        "partidos": [
            {
                "id": match["id"],
                "fecha": match["fecha"],
                "estado": match["estado"],
                "semana": match["semana"],
                "goles_local": match["goles_local"],
                "goles_vis": match["goles_vis"],
                "equipo_local": {
                    "id": match["equipo_local_id"],
                    "nombre": match["equipo_local__nombre"],
                    "imagen": match['equipo_local__escudo_url']
                },
                "equipo_visitante": {
                    "id": match["equipo_visitante_id"],
                    "nombre": match["equipo_visitante__nombre"],
                    "imagen": match['equipo_visitante__escudo_url']
                },
            }
            for match in selected_matches
        ],
        "equipos": list(
            temporada.equipos.order_by("nombre").values(
                "id",
                "nombre",
                "siglas",
                "escudo_url",
            )
        ),
        "tabla": get_competicion_temporada_table(competicion_id, temporada_id)
    }

    return temporada_data


def get_competicion_temporada_table(competicion_id: int, temporada_id: int) -> list[dict]:
    temporada = (
        Temporada.objects.filter(pk=temporada_id, competicion_id=competicion_id).first()
    )

    if temporada is None:
        if not Competicion.objects.filter(pk=competicion_id).exists():
            raise ResourceNotFound("competicion", competicion_id)
        
        raise ResourceNotFound("temporada", temporada_id)

    if temporada.competicion.tipo == Competicion.Tipo.COPA:
        return []

    table = {}
    teams = temporada.equipos.order_by("nombre").values(
        "id",
        "nombre",
        "escudo_url",
    )
    for team in teams:
        table[team["id"]] = {
            "equipo": {
                "id": team["id"],
                "nombre": team["nombre"],
                "imagen": team["escudo_url"],
            },
            "partidos_jugados": 0,
            "ganados": 0,
            "empatados": 0,
            "perdidos": 0,
            "goles_favor": 0,
            "goles_contra": 0,
            "diferencia_goles": 0,
            "puntos": 0,
            "forma": [],
        }

    completed_matches = (
        Partido.objects.filter(
            temporada=temporada,
            estado__in=(Partido.Estado.FINALIZADO, "complete"),
            goles_local__isnull=False,
            goles_vis__isnull=False,
        )
        .order_by("fecha", "id")
        .values(
            "equipo_local_id", "equipo_visitante_id",
            "goles_local", "goles_vis",
        )
    )

    for match in completed_matches:
        home_id = match["equipo_local_id"]
        away_id = match["equipo_visitante_id"]
        home = table.get(home_id)
        away = table.get(away_id)

        if home is None or away is None:
            continue

        home_goals = match["goles_local"]
        away_goals = match["goles_vis"]
        home["partidos_jugados"] += 1
        away["partidos_jugados"] += 1
        home["goles_favor"] += home_goals
        home["goles_contra"] += away_goals
        away["goles_favor"] += away_goals
        away["goles_contra"] += home_goals

        if home_goals > away_goals:
            home["ganados"] += 1
            home["puntos"] += 3
            away["perdidos"] += 1
            home["forma"].append("W")
            away["forma"].append("L")
        elif home_goals < away_goals:
            away["ganados"] += 1
            away["puntos"] += 3
            home["perdidos"] += 1
            home["forma"].append("L")
            away["forma"].append("W")
        else:
            home["empatados"] += 1
            away["empatados"] += 1
            home["puntos"] += 1
            away["puntos"] += 1
            home["forma"].append("D")
            away["forma"].append("D")

    rows = list(table.values())
    
    for row in rows:
        row["diferencia_goles"] = row["goles_favor"] - row["goles_contra"]
        row["forma"] = "".join(row["forma"][-5:])

    return sorted(
        rows,
        key=lambda row: (
            -row["puntos"],
            -row["diferencia_goles"],
            -row["goles_favor"],
            row["equipo"]["nombre"],
        ),
    )


def get_competicion_temporada_stats(competicion_id: int, temporada_id: int) -> dict:
    temporada = (
        Temporada.objects.filter(pk=temporada_id, competicion_id=competicion_id).first()
    )

    if temporada is None:
        if not Competicion.objects.filter(pk=competicion_id).exists():
            raise ResourceNotFound("competicion", competicion_id)
        
        raise ResourceNotFound("temporada", temporada_id)

    matches = list(
        Partido.objects.filter(
            temporada=temporada,
            estado=Partido.Estado.FINALIZADO,
        )
        .select_related("equipo_local", "equipo_visitante")
        .prefetch_related(
            "estadisticas_equipo",
            "convocatorias__jugador",
            "eventos__jugador",
            "eventos__jugador_sale",
        )
        .order_by("fecha", "id")
    )

    team_stats = {}
    player_stats = {}
    match_stats = []

    def get_team_stats(team):
        return team_stats.setdefault(
            team.id,
            {
                "team": team,
                "matches": 0,
                "clean_sheets": 0,
                "xg_for": [],
                "xg_against": [],
                "current_unbeaten": 0,
                "longest_unbeaten": 0,
            },
        )

    for match in matches:
        if match.goles_local is None or match.goles_vis is None:
            continue

        home = match.equipo_local
        away = match.equipo_visitante
        home_stats = get_team_stats(home)
        away_stats = get_team_stats(away)
        home_stats["matches"] += 1
        away_stats["matches"] += 1

        if match.goles_vis == 0:
            home_stats["clean_sheets"] += 1
        if match.goles_local == 0:
            away_stats["clean_sheets"] += 1

        if match.goles_local >= match.goles_vis:
            home_stats["current_unbeaten"] += 1
        else:
            home_stats["current_unbeaten"] = 0
        home_stats["longest_unbeaten"] = max(
            home_stats["longest_unbeaten"],
            home_stats["current_unbeaten"],
        )

        if match.goles_vis >= match.goles_local:
            away_stats["current_unbeaten"] += 1
        else:
            away_stats["current_unbeaten"] = 0
        away_stats["longest_unbeaten"] = max(
            away_stats["longest_unbeaten"],
            away_stats["current_unbeaten"],
        )

        stats_by_team = {
            stat.equipo_id: stat for stat in match.estadisticas_equipo.all()
        }
        home_match_stats = stats_by_team.get(home.id)
        away_match_stats = stats_by_team.get(away.id)

        if home_match_stats is not None and home_match_stats.xg is not None:
            home_stats["xg_for"].append(float(home_match_stats.xg))
            away_stats["xg_against"].append(float(home_match_stats.xg))
        if away_match_stats is not None and away_match_stats.xg is not None:
            away_stats["xg_for"].append(float(away_match_stats.xg))
            home_stats["xg_against"].append(float(away_match_stats.xg))

        home_xg = (
            float(home_match_stats.xg)
            if home_match_stats is not None and home_match_stats.xg is not None
            else None
        )
        away_xg = (
            float(away_match_stats.xg)
            if away_match_stats is not None and away_match_stats.xg is not None
            else None
        )

        match_stats.append(
            {
                "partido": {"id": match.id},
                "equipos": {
                    "local": {
                        "id": home.id,
                        "nombre": home.nombre,
                        "imagen": home.escudo_url,
                    },
                    "visitante": {
                        "id": away.id,
                        "nombre": away.nombre,
                        "imagen": away.escudo_url,
                    },
                },
                "goles": {
                    "local": match.goles_local,
                    "visitante": match.goles_vis,
                },
                "xg": {"local": home_xg, "visitante": away_xg},
                "total_goles": match.goles_local + match.goles_vis,
                "diferencia_goles": abs(match.goles_local - match.goles_vis),
                "diferencia_xg": (
                    round(abs(home_xg - away_xg), 2)
                    if home_xg is not None and away_xg is not None
                    else None
                ),
            }
        )

        player_match_ids = set()
        for callup in match.convocatorias.all():
            if not callup.titular and callup.min_entrada is None:
                continue

            player = callup.jugador
            player_data = player_stats.setdefault(
                player.id,
                {
                    "player": player,
                    "matches": 0,
                    "goals": 0,
                    "yellow_cards": 0,
                    "red_cards": 0,
                    "minutes": 0,
                },
            )
            player_match_ids.add(player.id)
            start_minute = 0 if callup.titular else callup.min_entrada
            end_minute = callup.min_salida if callup.min_salida is not None else 90
            player_data["minutes"] += max(0, end_minute - start_minute)

        for event in match.eventos.all():
            if event.jugador_id is not None:
                player_match_ids.add(event.jugador_id)
                player_data = player_stats.setdefault(
                    event.jugador_id,
                    {
                        "player": event.jugador,
                        "matches": 0,
                        "goals": 0,
                        "yellow_cards": 0,
                        "red_cards": 0,
                        "minutes": 0,
                    },
                )
                if event.tipo in (Evento.Tipo.GOL, Evento.Tipo.PENAL):
                    player_data["goals"] += 1
                elif event.tipo == Evento.Tipo.TARJETA_AMARILLA or event.tipo == Evento.Tipo.SEGUNDA_TARJETA_AMARILLA:
                    player_data["yellow_cards"] += 1
                elif event.tipo == Evento.Tipo.TARJETA_ROJA or event.tipo == Evento.Tipo.SEGUNDA_TARJETA_AMARILLA:
                    player_data["red_cards"] += 1

            if event.jugador_sale_id is not None:
                player_match_ids.add(event.jugador_sale_id)
                player_stats.setdefault(
                    event.jugador_sale_id,
                    {
                        "player": event.jugador_sale,
                        "matches": 0,
                        "goals": 0,
                        "yellow_cards": 0,
                        "red_cards": 0,
                        "minutes": 0,
                    },
                )

        for player_id in player_match_ids:
            player_stats[player_id]["matches"] += 1

    def team_entry(team_data, value, unit):
        team = team_data["team"]
        return {
            "partidos_jugados": team_data["matches"],
            "equipo": {
                "id": team.id,
                "nombre": team.nombre,
                "imagen": team.escudo_url,
            },
            "valor": value,
            "unidad": unit,
        }

    def player_entries(stat_name, unit):
        entries = [
            {
                "partidos_jugados": data["matches"],
                "jugador": {
                    "id": data["player"].id,
                    "nombre": data["player"].nombre,
                    "imagen": data["player"].foto_url,
                },
                "valor": data[stat_name],
                "unidad": unit,
            }
            for data in player_stats.values()
            if data[stat_name] > 0
        ]
        return sorted(
            entries,
            key=lambda entry: (-entry["valor"], entry["jugador"]["nombre"]),
        )[:5]

    team_entries = list(team_stats.values())
    unbeaten = sorted(
        team_entries,
        key=lambda data: (
            -data["longest_unbeaten"],
            data["team"].nombre,
        ),
    )[:5]
    clean_sheets = sorted(
        team_entries,
        key=lambda data: (-data["clean_sheets"], data["team"].nombre),
    )[:5]
    best_attack = sorted(
        (data for data in team_entries if data["xg_for"]),
        key=lambda data: (
            -sum(data["xg_for"]) / len(data["xg_for"]),
            data["team"].nombre,
        ),
    )[:5]
    best_defense = sorted(
        (data for data in team_entries if data["xg_against"]),
        key=lambda data: (
            sum(data["xg_against"]) / len(data["xg_against"]),
            data["team"].nombre,
        ),
    )[:5]

    def match_entries(matches_to_format, value_key, unit):
        entries = []
        for match_data in matches_to_format:
            entry = {
                key: value
                for key, value in match_data.items()
                if key not in {
                    "total_goles",
                    "diferencia_goles",
                    "diferencia_xg",
                }
            }
            entry["valor"] = match_data[value_key]
            entry["unidad"] = unit
            entries.append(entry)
        return entries

    most_goals = sorted(
        match_stats,
        key=lambda data: (-data["total_goles"], data["partido"]["id"]),
    )[:5]
    biggest_wins = sorted(
        match_stats,
        key=lambda data: (-data["diferencia_goles"], data["partido"]["id"]),
    )[:5]
    xg_matches = [data for data in match_stats if data["diferencia_xg"] is not None]
    most_uneven_xg = sorted(
        xg_matches,
        key=lambda data: (-data["diferencia_xg"], data["partido"]["id"]),
    )[:5]
    most_even_xg = sorted(
        xg_matches,
        key=lambda data: (data["diferencia_xg"], data["partido"]["id"]),
    )[:5]

    return {
        "partidos": {
            "partidos_jugados": len(match_stats),
            "partido_con_mas_goles": match_entries(
                most_goals, "total_goles", "goles"
            ),
            "mayor_goleada": match_entries(
                biggest_wins, "diferencia_goles", "goles"
            ),
            "partido_mas_disparejo": match_entries(
                most_uneven_xg, "diferencia_xg", "xG"
            ),
            "partido_mas_parejo": match_entries(
                most_even_xg, "diferencia_xg", "xG"
            ),
        },
        "equipo": {
            "mayor_racha_invicto": [
                team_entry(data, data["longest_unbeaten"], "partidos")
                for data in unbeaten
            ],
            "mayor_vallas_invictas": [
                team_entry(data, data["clean_sheets"], "partidos")
                for data in clean_sheets
            ],
            "mejor_ataque": [
                team_entry(
                    data,
                    round(sum(data["xg_for"]) / len(data["xg_for"]), 3),
                    "xG por partido",
                )
                for data in best_attack
            ],
            "mejor_defensa": [
                team_entry(
                    data,
                    round(sum(data["xg_against"]) / len(data["xg_against"]), 3),
                    "xG recibido por partido",
                )
                for data in best_defense
            ],
        },
        "jugadores": {
            "goles": player_entries("goals", "goles"),
            "tarjetas_amarillas": player_entries("yellow_cards", "tarjetas"),
            "tarjetas_rojas": player_entries("red_cards", "tarjetas"),
            "minutos": player_entries("minutes", "minutos"),
        },
    }
#endregion

#region Equipo
def get_equipos(
    nombre: str | None = None, competicion_id: int | None = None,
    temporada_id: int | None = None, pais_id: int | None = None,
) -> list[dict]:
    equipos = Equipo.objects.all()

    if nombre:
        equipos = equipos.filter(nombre__icontains=nombre)

    filters = {}

    if competicion_id is not None:
        filters["temporadas__competicion_id"] = competicion_id

    if temporada_id is not None:
        filters["temporadas__id"] = temporada_id

    if pais_id is not None:
        filters["pais_id"] = pais_id

    if filters:
        equipos = equipos.filter(**filters).distinct()
        
    return list(
        equipos.order_by("nombre").values("id", "nombre", "siglas", "escudo_url")
    )


def get_equipo(equipo_id: int) -> dict | None:
    instance = Equipo.objects.filter(pk=equipo_id).first()

    if instance is None:
        raise ResourceNotFound("equipo", equipo_id)

    equipo = {
        "id": instance.id, "nombre": instance.nombre,
        "siglas": instance.siglas, "escudo_url": instance.escudo_url,
    }

    if instance.estadio is not None:
        equipo["estadio"] = {
            "id": instance.estadio.id,
            "nombre": instance.estadio.nombre,
            "ciudad": instance.estadio.ciudad,
            "capacidad": instance.estadio.capacidad,
            "foto_url": instance.estadio.foto_url,
        }
    else:
        equipo["estadio"] = None

    temporadas = list(
        instance.temporadas.order_by("-periodo").values(
            "id",
            "periodo",
            "fecha_inicio",
            "fecha_fin",
            "competicion_id",
            "competicion__api_id",
            "competicion__nombre",
            "competicion__tipo",
            "competicion__logo_url",
        )
    )

    equipo["temporadas"] = [
        {
            "id": temporada["id"],
            "periodo": temporada["periodo"],
            "fecha_inicio": temporada["fecha_inicio"],
            "fecha_fin": temporada["fecha_fin"],
        }
        for temporada in temporadas
    ]

    competiciones_by_id = {}

    for temporada in temporadas:
        competicion = competiciones_by_id.setdefault(
            temporada["competicion_id"],
            {
                "id": temporada["competicion_id"],
                "api_id": temporada["competicion__api_id"],
                "nombre": temporada["competicion__nombre"],
                "tipo": temporada["competicion__tipo"],
                "logo_url": temporada["competicion__logo_url"],
                "temporadas": [],
            },
        )
        competicion["temporadas"].append(
            {
                "id": temporada["id"],
                "periodo": temporada["periodo"],
                "fecha_inicio": temporada["fecha_inicio"],
                "fecha_fin": temporada["fecha_fin"],
            }
        )

    equipo["competiciones"] = list(competiciones_by_id.values())

    equipo["partidos"] = [
        {
            "id": partido["id"],
            "api_id": partido["api_id"],
            "fecha": partido["fecha"],
            "semana": partido["semana"],
            "goles_local": partido["goles_local"],
            "goles_vis": partido["goles_vis"],
            "equipo_local": {
                "id": partido["equipo_local_id"],
                "nombre": partido["equipo_local__nombre"],
            },
            "equipo_visitante": {
                "id": partido["equipo_visitante_id"],
                "nombre": partido["equipo_visitante__nombre"],
            },
            "temporada": {
                "id": partido["temporada_id"],
                "periodo": partido["temporada__periodo"],
            },
            "competicion": {
                "id": partido["temporada__competicion_id"],
                "nombre": partido["temporada__competicion__nombre"],
            },
        }
        for partido in Partido.objects.filter(
            Q(equipo_local=instance) | Q(equipo_visitante=instance),
            estado=Partido.Estado.FINALIZADO,
        )
        .order_by("-fecha", "-id")
        .values(
            "id",
            "api_id",
            "fecha",
            "semana",
            "goles_local",
            "goles_vis",
            "equipo_local_id",
            "equipo_local__nombre",
            "equipo_visitante_id",
            "equipo_visitante__nombre",
            "temporada_id",
            "temporada__periodo",
            "temporada__competicion_id",
            "temporada__competicion__nombre",
        )[:10]
    ]
    
    return equipo

def get_equipo_stats(equipo_id: int, temporada_id: int) -> dict:
    estadisticas = None
    # TODO: Determinar que stats devolver.

    return estadisticas
#endregion