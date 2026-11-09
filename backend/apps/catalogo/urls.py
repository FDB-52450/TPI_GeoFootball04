from django.urls import path

from . import views

urlpatterns = [
    path("confederaciones/", views.confederaciones_list, name = "confederaciones-list"),
    path("confederaciones/<int:confederacion_id>/", views.confederacion_detail, name = "confederacion-detail"),

    path("paises/", views.paises_list, name = "paises-list"),
    path("paises/<int:pais_id>/", views.pais_detail, name = "pais-detail"),

    path("competiciones/", views.competiciones_list, name = "competiciones-list"),
    path("competiciones/<int:competicion_id>", views.competicion_detail, name = "competicion-detail"),
    path("competiciones/<int:competicion_id>/temporadas/<int:temporada_id>", views.competicion_temporada_detail, name = "competicion-temporada-detail"),
    path("competiciones/<int:competicion_id>/temporadas/<int:temporada_id>/tabla", views.competicion_temporada_table, name = "competicion-temporada-table"),
    path("competiciones/<int:competicion_id>/temporadas/<int:temporada_id>/partidos", views.competicion_temporada_fixtures, name = "competicion-temporada-fixtures"),
    path("competiciones/<int:competicion_id>/temporadas/<int:temporada_id>/estadisticas", views.competicion_temporada_stats, name = "competicion-temporada-stats"),

    path("equipos/", views.equipos_list, name = "equipos-list"),
    path("equipos/<int:equipo_id>", views.equipo_detail, name = "equipo-detail"),
    path("equipos/<int:equipo_id>/jugadores", views.equipo_players, name = "equipo-players"),
    path("equipos/<int:equipo_id>/partidos", views.equipo_fixtures, name = "equipo-fixtures"),
    path("equipos/<int:equipo_id>/estadisticas", views.equipo_stats, name = "equipo-stats"),
]

'''
TODOS LOS STATS SON TOP 5

JUGADORES
- Goles
- Tarjetas Amarillas
- Tarjetas Rojas
- Minutos

EQUIPOS
- Mayor racha invicto
- Vallas invictas
'''