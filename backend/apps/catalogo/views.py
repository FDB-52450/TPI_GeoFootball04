from django.http import JsonResponse
from django.views.decorators.http import require_GET

from . import services
from ..partidos import services as partidoService

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


#region Confederaciones
@require_GET
def confederaciones_list(request):
    nombre = request.GET.get("nombre")
    confederaciones = services.get_confederaciones(nombre)

    return JsonResponse({"confederaciones": confederaciones})


@require_GET
def confederacion_detail(request, confederacion_id: int):
    try:
        confederacion = services.get_confederacion(confederacion_id)
    except services.ResourceNotFound as error:
        return _resource_not_found(error)

    return JsonResponse({"confederacion": confederacion})
#endregion

#region Paises
@require_GET
def paises_list(request):
    nombre = request.GET.get("nombre")
    paises = services.get_paises(nombre)

    return JsonResponse({"paises": paises})


@require_GET
def pais_detail(request, pais_id: int):
    try:
        pais = services.get_pais(pais_id)
    except services.ResourceNotFound as error:
        return _resource_not_found(error)

    return JsonResponse({"pais": pais})
#endregion

#region Competiciones
@require_GET
def competiciones_list(request):
    nombre = request.GET.get("nombre")
    competiciones = services.get_competiciones(nombre)

    return JsonResponse({"competiciones": competiciones})

@require_GET
def competicion_detail(request, competicion_id: int):
    try:
        competicion = services.get_competicion(competicion_id)
    except services.ResourceNotFound as error:
        return _resource_not_found(error)

    return JsonResponse({"competicion": competicion})

@require_GET
def competicion_temporada_detail(request, competicion_id: int, temporada_id: int):
    try:
        temporada = services.get_competicion_temporada(competicion_id, temporada_id)
    except services.ResourceNotFound as error:
        return _resource_not_found(error)

    return JsonResponse({"temporada": temporada})

@require_GET
def competicion_temporada_table(request, competicion_id: int, temporada_id: int):
    try:
        temporada = services.get_competicion_temporada_table(competicion_id, temporada_id)
    except services.ResourceNotFound as error:
        return _resource_not_found(error)

    return JsonResponse({"tabla": temporada})

@require_GET
def competicion_temporada_fixtures(request, competicion_id: int, temporada_id: int):
    partidos = partidoService.get_partidos(temporada_id = temporada_id)

    return JsonResponse({"partidos": partidos})

@require_GET
def competicion_temporada_stats(request, competicion_id: int, temporada_id: int):
    try:
        estadisticas = services.get_competicion_temporada_stats(competicion_id, temporada_id)
    except services.ResourceNotFound as error:
        return _resource_not_found(error)

    return JsonResponse({"estadisticas": estadisticas})
#endregion

#region Equipos
@require_GET
def equipos_list(request):
    nombre = request.GET.get("nombre")

    try:
        competicion_id = _parametro_id(request, 'competicion_id')
        temporada_id = _parametro_id(request, 'temporada_id')
        pais_id = _parametro_id(request, "pais_id")
    except ValueError as exc:
        return JsonResponse({"detail": str(exc)}, status=400)

    equipos = services.get_equipos(
        nombre, competicion_id = competicion_id, 
        temporada_id = temporada_id, pais_id = pais_id
    )

    return JsonResponse({"equipos": equipos})

@require_GET
def equipo_detail(request, equipo_id: int):
    try:
        equipo = services.get_equipo(equipo_id)
    except services.ResourceNotFound as error:
        return _resource_not_found(error)

    return JsonResponse({"equipo": equipo})

@require_GET
def equipo_players(request, equipo_id: int):
    temporada_id = request.GET.get("temporada_id")

    try:
        temporada = services.get_equipo_players(equipo_id)
    except services.ResourceNotFound as error:
        return _resource_not_found(error)

    return JsonResponse({"temporada": temporada})

@require_GET
def equipo_fixtures(request, equipo_id: int):
    temporada_id = request.GET.get("temporada_id")

    try:
        temporada_id = int(request.GET["temporada_id"]) if "temporada_id" in request.GET else None
    except ValueError:
        return JsonResponse({"detail": "temporada_id debe ser un entero."}, status=400)

    try:
        partidos = partidoService.get_partidos(temporada_id = temporada_id, equipo_id = equipo_id)
    except services.ResourceNotFound as error:
        return _resource_not_found(error)

    return JsonResponse({"partidos": partidos})

@require_GET
def equipo_stats(request, equipo_id: int):
    temporada_id = request.GET.get("temporada_id")

    try:
        estadisticas = services.get_equipo_stats(equipo_id)
    except services.ResourceNotFound as error:
        return _resource_not_found(error)

    return JsonResponse({"estadisticas": estadisticas})
#endregion