from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.utils.dateparse import parse_date

from . import services

def _resource_not_found(error: services.ResourceNotFound) -> JsonResponse:
    return JsonResponse(
        {
            "error": {
                "code": "resource_not_found",
                "resource": error.resource,
                "id": error.resource_id,
            }
        },

        status=404,
    )

def _parametro_id(request, nombre):
    valor = request.GET.get(nombre)

    if not valor:
        return None
    try:
        return int(valor)
    except ValueError:
        raise ValueError(f"{nombre} debe ser un entero.")

def _parametro_fecha(request, nombre: str):
    valor = request.GET.get(nombre)
    if not valor:
        return None

    fecha = parse_date(valor)
    
    if fecha is None:
        raise ValueError(f"{nombre} debe tener formato AAAA-MM-DD.")
    return fecha

#region Partidos
@require_GET
def partidos_list(request):
    #pagina = int(request.GET.get("pagina"))
    try:
        temporada_id = _parametro_id(request, "temporada_id")
        fecha_desde = _parametro_fecha(request, "fecha_desde")
        fecha_hasta = _parametro_fecha(request, "fecha_hasta")
        count = _parametro_id(request, 'count')
    except ValueError as exc:
        return JsonResponse({"detail": str(exc)}, status=400)
    
    today = request.GET.get("today", "").lower() == "true"

    partidos = services.get_partidos(
        temporada_id, today = today, fecha_desde = fecha_desde, fecha_hasta = fecha_hasta,
        count = count
    )

    return JsonResponse(
        {
            "partidos": partidos,
            "pagination": None,
        }
    )

@require_GET
def partido_detail(request, partido_id: int):
    try:
        partido = services.get_partido(partido_id)
    except services.ResourceNotFound as error:
        return _resource_not_found(error)

    return JsonResponse({"partido": partido})
#endregion

#region Jugadores
def jugadores_list(request):
    nombre = request.GET.get("nombre")

    try:
        temporada_id = _parametro_id(request, "temporada_id")
        equipo_id = _parametro_id(request, "equipo_id")
        pais_id = _parametro_id(request, "pais_id")
    except ValueError as exc:
        return JsonResponse({"detail": str(exc)}, status=400)

    jugadores = services.get_jugadores(nombre, temporada_id, equipo_id, pais_id)

    return JsonResponse(
        {
            "jugadores": jugadores,
            "pagination": None,
        }
    )

@require_GET
def jugador_detail(request, jugador_id: int):
    try:
        jugador = services.get_jugador(jugador_id)
    except services.ResourceNotFound as error:
        return _resource_not_found(error)

    return JsonResponse({"jugador": jugador})
#endregion