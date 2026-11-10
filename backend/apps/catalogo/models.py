# apps/catalogo/models.py
from django.db import models


class Confederacion(models.Model):
    api_id = models.CharField(max_length=20, unique=True)
    nombre = models.CharField(max_length=120)
    region = models.CharField(max_length=150)
    logo_url = models.URLField(blank=True)

    def __str__(self):
        return self.nombre


class Pais(models.Model):
    api_id = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=120)
    codigo_iso3 = models.CharField(max_length=3, unique=True)
    bandera_url = models.URLField(blank=True)

    latitud = models.FloatField(null=True, blank=True)
    longitud = models.FloatField(null=True, blank=True)

    confederacion = models.ForeignKey(
        Confederacion,
        on_delete=models.PROTECT,
        related_name="paises",
    )

    class Meta:
        verbose_name_plural = "países"

    def __str__(self):
        return self.nombre


class Competicion(models.Model):
    class Tipo(models.TextChoices):
        LIGA = "LIGA", "Liga"
        COPA = "COPA", "Copa"
        MIXTO = "MIXTO", "Mixto"
        # Ajustar a los valores reales que devuelve la API

    api_id = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=120)
    tipo = models.CharField(max_length=10, choices=Tipo.choices)
    logo_url = models.URLField(blank=True)

    pais = models.ForeignKey(
        Pais,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="competiciones",
    )

    confederacion = models.ForeignKey(
        Confederacion,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="competiciones",
    )

    def __str__(self):
        return self.nombre


class Temporada(models.Model):
    class EstadoDatos(models.TextChoices):
        NO_CARGADA = "NO_CARGADA", "No cargada"
        PARTIDOS_CARGADOS = "PARTIDOS_CARGADOS", "Partidos cargados"
        DETALLE_PARCIAL = "DETALLE_PARCIAL", "Detalles parcialmente cargados"
        DETALLE_CARGADO = "DETALLE_CARGADO", "Detalles cargados"

    api_id = models.CharField(max_length=50, unique=True)
    competicion = models.ForeignKey(
        Competicion, 
        on_delete=models.PROTECT, 
        related_name="temporadas",
    )
    
    periodo = models.CharField(max_length=50)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    
    estado_datos = models.CharField(
        max_length=30,
        choices=EstadoDatos.choices,
        default=EstadoDatos.NO_CARGADA,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["competicion", "periodo"],
                name="unica_temporada_por_competicion",
            )
        ]

    @property
    def etiqueta(self) -> str:
        if self.fecha_inicio.year == self.fecha_fin.year:
            return str(self.fecha_inicio.year)
        else:
            return f"{self.fecha_inicio.year}/{self.fecha_fin.year}"
        

    def __str__(self):
        return f"{self.competicion} {self.etiqueta}"


class Equipo(models.Model):
    class NivelDatos(models.TextChoices):
        PARCIAL = "PARCIAL", "Parcial"
        COMPLETO = "COMPLETO", "Completo"

    api_id = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=120)
    siglas = models.CharField(max_length=10, blank=True)
    escudo_url = models.URLField(blank=True)
    es_nacional = models.BooleanField(default=False)

    temporadas = models.ManyToManyField(
        "catalogo.Temporada",
        through="EquipoTemporada",
        related_name="equipos",
        blank=True,
    )

    pais = models.ForeignKey(
        "catalogo.Pais",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="equipos",
    )

    estadio = models.ForeignKey(
        "catalogo.Estadio",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="equipos",
    )

    nivel_datos = models.CharField(
        max_length=10,
        choices=NivelDatos.choices,
        default=NivelDatos.PARCIAL,
    )

    def __str__(self):
        return self.nombre


class EquipoTemporada(models.Model):
    equipo = models.ForeignKey(
        Equipo,
        on_delete=models.CASCADE,
        related_name="participaciones",
    )

    temporada = models.ForeignKey(
        Temporada,
        on_delete=models.CASCADE,
        related_name="participaciones",
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["equipo", "temporada"],
                name="unica_participacion_equipo_temporada",
            )
        ]


class Estadio(models.Model):
    # Api_id is from api-football
    api_id = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=120)
    ciudad = models.CharField(max_length=100, blank=True)
    capacidad = models.PositiveIntegerField(null=True, blank=True)
    foto_url = models.URLField(blank=True)

    latitud = models.FloatField(null=True, blank=True)
    longitud = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.nombre