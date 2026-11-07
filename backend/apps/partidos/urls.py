from django.urls import path

from . import views

urlpatterns = [
    path("partidos/", views.partidos_list, name = "partidos-list"),
    path("partidos/<int:partido_id>", views.partido_detail, name = "partido-detail"),
]

'''
path("jugadores/", views.jugadors_list, name = "jugadors-list"),
path("jugadores/<int:jugador_id>", views.jugador_detail, name = "jugador-detail"),
path("jugadors/<int:jugador_id>/partidos", views.jugador_fixtures, name = "jugador-fixtures"),
path("jugadors/<int:jugador_id>/estadisticas", views.jugador_stats, name = "jugador-stats"),
'''