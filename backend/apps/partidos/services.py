from datetime import date, timedelta
from django.db.models import Prefetch, Q
from django.utils import timezone

from .models import Convocatoria, Evento, Partido
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

    update_match = instance.estado == Partido.Estado.EN_JUEGO and (
        instance.nivel_datos == Partido.NivelDatos.PARCIAL
        or instance.ultima_actualizacion >= timedelta(minutes=5)
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
