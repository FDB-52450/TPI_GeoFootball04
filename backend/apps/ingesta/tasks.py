from django.conf import settings
from apps.ingesta import sync

def sincronizar_catalogo():
    comp_ids = None
    season_ids = None
    team_ids = None

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