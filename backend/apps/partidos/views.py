from django.http import JsonResponse
from django.views.decorators.http import require_GET

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


#region Partidos
@require_GET
def partidos_list(request):
    #pagina = int(request.GET.get("pagina"))
    temporada_id = request.GET.get("temporada_id")
    temporada_id = int(temporada_id) if temporada_id is not None else temporada_id
    
    today = request.GET.get("today", "").lower() == "true"

    partidos = services.get_partidos(temporada_id, today = today)

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