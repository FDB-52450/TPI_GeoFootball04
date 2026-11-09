from django.urls import path

from . import views

urlpatterns = [
    path("partidos/", views.partidos_list, name = "partidos-list"),
    path("partidos/<int:partido_id>", views.partido_detail, name = "partido-detail"),

    path("jugadores/", views.jugadores_list, name = "jugadores-list"),
    path("jugadores/<int:jugador_id>", views.jugador_detail, name = "jugador-detail"),
]