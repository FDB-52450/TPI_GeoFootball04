# apps/partidos/models.py
from django.db import models

from apps.catalogo.models import Equipo, Estadio

from datetime import date

class Jugador(models.Model):
    class NivelDatos(models.TextChoices):
        PARCIAL = "PARCIAL", "Parcial"
        COMPLETO = "COMPLETO", "Completo"

    api_id = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=120)
    apodo = models.CharField(max_length=60, blank=True)
    fecha_nacimiento = models.DateTimeField(null=True, blank=True)
    altura = models.PositiveSmallIntegerField(null=True, blank=True)  # cm
    peso = models.PositiveSmallIntegerField(null=True, blank=True)    # kg
    foto_url = models.URLField(blank=True)

    # Nacionalidad. Se deja nullable porque la carga parcial puede no traerla.
    pais = models.ForeignKey(
        "catalogo.Pais",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="jugadores",
    )

    nivel_datos = models.CharField(
        max_length=10,
        choices=NivelDatos.choices,
        default=NivelDatos.PARCIAL,
    )

    completo_en = models.DateTimeField(null=True, blank=True)

    @property
    def age(self):
        today = date.today()
        age = today.year - self.fecha_nacimiento.year

        if (today.month, today.day) < (self.fecha_nacimiento.month, self.fecha_nacimiento.day):
            age -= 1

        return age

    def __str__(self):
        return self.nombre


class Partido(models.Model):
    class NivelDatos(models.TextChoices):
        PARCIAL = "PARCIAL", "Parcial"
        COMPLETO = "COMPLETO", "Completo"

    class Estado(models.TextChoices):
        PROGRAMADO = "PROGRAMADO", "Programado"
        EN_JUEGO = "EN_JUEGO", "En juego"
        FINALIZADO = "FINALIZADO", "Finalizado"
        APLAZADO = "APLAZADO", "Aplazado"
        # Ajustar a los valores reales que devuelve la API

    api_id = models.CharField(max_length=50, unique=True)
    temporada = models.ForeignKey(
        "catalogo.Temporada",
        on_delete=models.PROTECT,
        related_name="partidos",
    )

    equipo_local = models.ForeignKey(
        Equipo,
        on_delete=models.PROTECT,
        related_name="partidos_local",
    )

    equipo_visitante = models.ForeignKey(
        Equipo,
        on_delete=models.PROTECT,
        related_name="partidos_visitante",
    )

    estadio = models.ForeignKey(
        Estadio,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="estadio_partidos",
    )

    fecha = models.DateTimeField()
    estado = models.CharField(max_length=20, choices=Estado.choices)
    minuto_actual = models.PositiveSmallIntegerField(null=True, blank=True)
    semana = models.PositiveSmallIntegerField(null=True, blank=True)

    goles_local = models.PositiveSmallIntegerField(null=True, blank=True)
    goles_vis = models.PositiveSmallIntegerField(null=True, blank=True)

    # Se actualiza en cada save(), incluido el de update_or_create
    ultima_actualizacion = models.DateTimeField(auto_now=True)

    nivel_datos = models.CharField(
        max_length=10,
        choices=NivelDatos.choices,
        default=NivelDatos.PARCIAL,
    )

    def __str__(self):
        return f"{self.equipo_local} vs {self.equipo_visitante} ({self.fecha:%Y-%m-%d})"


class Evento(models.Model):
    class Tipo(models.TextChoices):
        GOL = "Goal", "GOL"
        TARJETA_AMARILLA = "Yellow", "Tarjeta Amarilla"
        TARJETA_ROJA = "Red", "Tarjeta Roja"
        # Ajustar a los valores reales que devuelve la API

    api_id = models.CharField(max_length=50, unique=True)
    partido = models.ForeignKey(
        Partido,
        on_delete=models.CASCADE,
        related_name="eventos",
    )
    # Nullable: algunos eventos pueden no tener jugador asociado
    jugador = models.ForeignKey(
        Jugador,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="eventos",
    )
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    minuto = models.PositiveSmallIntegerField()

    class Meta:
        ordering = ["minuto"]

    def __str__(self):
        return f"{self.get_tipo_display()} {self.minuto}'"


class Convocatoria(models.Model):
    partido = models.ForeignKey(
        Partido,
        on_delete=models.CASCADE,
        related_name="convocatorias",
    )

    equipo = models.ForeignKey(
        Equipo,
        on_delete=models.PROTECT,
        related_name="convocatorias",
    )

    jugador = models.ForeignKey(
        Jugador,
        on_delete=models.PROTECT,
        related_name="convocatorias",
    )

    titular = models.BooleanField(default=False)
    dorsal = models.PositiveSmallIntegerField(null=True, blank=True)
    posicion = models.CharField(max_length=10, blank=True)
    min_entrada = models.PositiveSmallIntegerField(null=True, blank=True)
    min_salida = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["partido", "jugador"],
                name="unica_convocatoria_por_partido",
            )
        ]

    def __str__(self):
        return f"{self.jugador} ({self.partido})"


class Plantilla(models.Model):
    jugador = models.ForeignKey(
        Jugador,
        on_delete=models.CASCADE,
        related_name="plantillas",
    )
    
    equipo_temporada = models.ForeignKey(
        "catalogo.EquipoTemporada",
        on_delete=models.CASCADE,
        related_name="plantillas",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["jugador", "equipo_temporada"],
                name="unica_plantilla",
            )
        ]

    def __str__(self):
        participacion = self.equipo_temporada
        return (
            f"{self.jugador} en {participacion.equipo} "
            f"({participacion.temporada.etiqueta})"
        )