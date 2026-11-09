from datetime import date, timedelta
from django.db.models import Prefetch, Q
from django.utils import timezone

from .models import Convocatoria, Evento, Partido, Jugador, Plantilla
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
        today: bool = False,
    ) -> list[dict]:

    partidos = Partido.objects.all()

    if today:
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
    ).order_by("fecha", "id")

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


def get_partido(partido_id: int) -> dict | None:
    instance = Partido.objects.filter(pk=partido_id).first()

    if instance is None:
        raise ResourceNotFound("partido", partido_id)

    # El partido solo se debe actualizar cuando esta su estado es en juego 
    # (todos los datos del detalle son solo relevantes cuando esta en juego)

    update_match = instance.nivel_datos == Partido.NivelDatos.PARCIAL or (
        instance.ultima_actualizacion >= timedelta(minutes=5) and 
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
        )
        .filter(pk=partido_id)
        .first()
    )

    if partido is None:
        raise ResourceNotFound("partido", partido_id)

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

    if nombre:
        jugadores = jugadores.filter(nombre__icontains=nombre)

    if temporada_id:
        jugadores = jugadores.filter(plantillas__equipo_temporada__temporada_id = temporada_id).distinct()

    if equipo_id:
        jugadores = jugadores.filter(plantillas__equipo_temporada__equipo_id = equipo_id).distinct()

    if pais_id:
        jugadores = jugadores.filter(pais__id = pais_id)

    return jugadores.order_by("nombre").values("id", "nombre", "foto_url")



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
            "equipo_temporada__temporada__fecha_inicio",
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
        ultimos_partidos.append(
            {
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