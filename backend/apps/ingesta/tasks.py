from django.utils import timezone
from django.conf import settings
from celery import shared_task

from apps.ingesta import sync
from ..partidos.models import Partido

def sincronizar_catalogo():
    comp_ids = None
    season_ids = None
    team_ids = None
    # 126 (not found) / 138, 144, 145 (country mismatch) / 194 (name mismatch)

    if settings.USE_MOCK_DATA:
        comp_ids = ['15']  # Premier League
        season_ids = ['103535']  # Season 2026/2027 (Premier League)
        team_ids = ['57']  # Arsenal FC (Premier League)

    sync.sync_confederations()
    sync.sync_countries()
    sync.sync_leagues()
    sync.sync_seasons(comp_ids)
    sync.sync_teams(comp_ids, season_ids)
    sync.sync_team_data_and_venues(team_ids)


def sincronizar_partidos():
    comp_ids = None
    season_ids = None
    match_ids = None
    player_ids = None
    semanas = None

    if settings.USE_MOCK_DATA:
        comp_ids = ['15']  # Premier League
        season_ids = ['103535']  # Season 2026/2027 (Premier League)
        match_ids = ['']
        player_ids = None
        semanas = 1

    sync.sync_matches(comp_ids, season_ids)
    sync.sync_match_detail(match_ids, comp_ids, season_ids, semanas)
    sync.sync_player_detail(player_ids)


# Tasks utilizadas para sincronizar datos automaticamente (Celery)
@shared_task
def refrescar_partidos_del_dia():
    """Corre una vez al día: trae el calendario de partidos."""
    sync.refresh_current_matches()


@shared_task
def sondear_partidos_en_vivo():
    """Refresh today's fixtures at kickoff and sync details for newly finished matches."""

    ahora = timezone.now()
    hoy = timezone.localdate()

    partidos_hoy = list(Partido.objects.filter(fecha__date = hoy).only("api_id", "estado", "fecha"))

    debe_refrescar = any(
        partido.estado == Partido.Estado.EN_JUEGO
        or (partido.estado == Partido.Estado.PROGRAMADO and partido.fecha <= ahora)

        for partido in partidos_hoy
    )

    if not debe_refrescar:
        return {"refrescado": False, "detalles_sincronizados": 0}

    ids_no_finalizados = {
        partido.api_id for partido in partidos_hoy if partido.estado != Partido.Estado.FINALIZADO
    }

    refrescar_partidos_del_dia()

    partidos_finalizados = list(
        Partido.objects.filter(api_id__in=ids_no_finalizados, estado=Partido.Estado.FINALIZADO)
        .values_list("api_id", flat=True)
    )

    if partidos_finalizados:
        sync.sync_match_detail(match_ids=partidos_finalizados)

    return {
        "refrescado": True,
        "detalles_sincronizados": len(partidos_finalizados),
    }
