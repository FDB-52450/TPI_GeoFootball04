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
    api_id = models.CharField(max_length=50, unique=True)
    competicion = models.ForeignKey(
        Competicion, 
        on_delete=models.PROTECT, 
        related_name="temporadas",
    )
    
    periodo = models.CharField(max_length=50, unique=True)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["competicion", "periodo"],
                name="unica_temporada_por_competicion",
            )
        ]

    @property
    def etiqueta(self) -> str:
        if self.inicio == self.fin:
            return str(self.inicio)
        return f"{self.inicio}/{self.fin}"

    def __str__(self):
        return f"{self.competicion} {self.etiqueta}"


class Equipo(models.Model):
    api_id = models.CharField(max_length=50, unique=True)
    nombre = models.CharField(max_length=120)
    siglas = models.CharField(max_length=10, blank=True)
    escudo_url = models.URLField(blank=True)
    es_nacional = models.BooleanField(default=False)

    temporadas = models.ManyToManyField(
        "catalogo.Temporada",
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

    def __str__(self):
        return self.nombre


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