from apps.ingesta import sync

def sincronizar_catalogo():
    sync.sync_confederations()
    sync.sync_countries()
    sync.sync_leagues()
    sync.sync_seasons()