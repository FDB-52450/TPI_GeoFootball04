from django.conf import settings
from apps.ingesta import sync

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

    if settings.USE_MOCK_DATA:
        comp_ids = ['15']  # Premier League
        season_ids = ['103535']  # Season 2026/2027 (Premier League)
        match_ids = ['']
        player_ids = None

    sync.sync_matches(comp_ids, season_ids)
    sync.sync_match_detail(match_ids, comp_ids, season_ids)
    sync.sync_player_detail(player_ids)