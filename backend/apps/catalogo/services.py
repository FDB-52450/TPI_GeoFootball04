from django.db.models import Q

from .models import Confederacion, Pais, Competicion, Temporada, Equipo, Estadio
from apps.partidos.models import Partido


class ResourceNotFound(Exception):
    def __init__(self, resource: str, resource_id: int):
        self.resource = resource
        self.resource_id = resource_id
        super().__init__(f"{resource} with id {resource_id} was not found")


#region Confederaciones
def get_confederaciones(nombre: str | None = None) -> list[dict]:
    confederaciones = Confederacion.objects.all()

    if nombre:
        confederaciones = confederaciones.filter(nombre__icontains=nombre)

    return list(
        confederaciones.order_by("nombre").values("id", "nombre", "region", "logo_url")
    )

def get_confederacion(confederacion_id: int) -> dict | None:
    instance = Confederacion.objects.filter(pk=confederacion_id).first()

    if instance is None:
        raise ResourceNotFound("confederacion", confederacion_id)

    confederacion = {
        "id": instance.id, "nombre": instance.nombre, 
        "region": instance.region, "logo_url": instance.logo_url,
    }

    confederacion["paises"] = list(
        instance.paises.order_by("nombre").values("id", "nombre", "codigo_iso3", "bandera_url")
    )

    confederacion["competiciones"] = list(
        instance.competiciones.order_by("nombre").values("id", "nombre", "tipo", "logo_url")
    )
    
    return confederacion
#endregion

#region Paises
def get_paises(nombre: str | None = None) -> list[dict]:
    paises = Pais.objects.all()

    if nombre:
        paises = paises.filter(nombre__icontains=nombre)

    return list(
        paises.order_by("nombre").values("id", "nombre", "codigo_iso3", "bandera_url")
    )

def get_pais(pais_id: int) -> dict | None:
    instance = Pais.objects.filter(pk=pais_id).first()

    if instance is None:
        raise ResourceNotFound("pais", pais_id)

    pais = {
        "id": instance.id, "nombre": instance.nombre,
        "codigo_iso3": instance.codigo_iso3, "bandera_url": instance.bandera_url,
    }

    pais["confederacion"] = {
        "id": instance.confederacion.id,
        "nombre": instance.confederacion.nombre,
        "region": instance.confederacion.region,
    }

    pais["competiciones"] = list(
        instance.competiciones.order_by("nombre").values("id", "nombre", "tipo", "logo_url")
    )

    # TODO: Agregar listado de jugadores de pais.
    
    return pais
#endregion

#region Competicion
def get_competiciones(nombre: str | None = None) -> list[dict]:
    competiciones = Competicion.objects.all()

    if nombre:
        competiciones = competiciones.filter(nombre__icontains=nombre)

    return list(
        competiciones.order_by("nombre").values("id", "nombre", "tipo", "logo_url")
    )


def get_competicion(competicion_id: int) -> dict | None:
    instance = Competicion.objects.filter(pk=competicion_id).first()

    if instance is None:
        raise ResourceNotFound("competicion", competicion_id)

    competicion = {
        "id": instance.id, "nombre": instance.nombre,
        "tipo": instance.tipo, "logo_url": instance.logo_url,
    }

    if instance.confederacion is not None:
        competicion["confederacion"] = {
            "id": instance.confederacion.id,
            "nombre": instance.confederacion.nombre,
            "region": instance.confederacion.region,
        }

    if instance.pais is not None:
        competicion["pais"] = {
            "id": instance.pais.id,
            "nombre": instance.pais.nombre,
            "codigo_iso3": instance.pais.codigo_iso3,
            "bandera_url": instance.pais.bandera_url
        }

    competicion["temporadas"] = list(
        instance.temporadas.order_by("periodo").values("id", "periodo", "fecha_inicio", "fecha_fin")
    )
    
    return competicion


def get_competicion_temporada(competicion_id: int, temporada_id: int) -> dict:
    temporada = (
        Temporada.objects.filter(pk=temporada_id, competicion_id=competicion_id).first()
    )

    if temporada is None:
        if not Competicion.objects.filter(pk=competicion_id).exists():
            raise ResourceNotFound("competicion", competicion_id)
        
        raise ResourceNotFound("temporada", temporada_id)

    matches = Partido.objects.filter(temporada=temporada).order_by("-fecha", "-id")
    temporada_data = {
        "id": temporada.id,
        "periodo": temporada.periodo,
        "fecha_inicio": temporada.fecha_inicio,
        "fecha_fin": temporada.fecha_fin,
        "partidos": [
            {
                "id": match["id"],
                "fecha": match["fecha"],
                "estado": match["estado"],
                "semana": match["semana"],
                "goles_local": match["goles_local"],
                "goles_vis": match["goles_vis"],
                "equipo_local": {
                    "id": match["equipo_local_id"],
                    "nombre": match["equipo_local__nombre"],
                },
                "equipo_visitante": {
                    "id": match["equipo_visitante_id"],
                    "nombre": match["equipo_visitante__nombre"],
                },
            }
            for match in matches.values(
                "id",
                "fecha",
                "estado",
                "semana",
                "goles_local",
                "goles_vis",
                "equipo_local_id",
                "equipo_local__nombre",
                "equipo_visitante_id",
                "equipo_visitante__nombre",
            )[:10]
        ],
        "equipos": list(
            temporada.equipos.order_by("nombre").values(
                "id",
                "nombre",
                "siglas",
                "escudo_url",
            )
        ),
        "tabla": get_competicion_temporada_table(competicion_id, temporada_id)
    }

    return temporada_data


def get_competicion_temporada_table(competicion_id: int, temporada_id: int) -> list[dict]:
    temporada = (
        Temporada.objects.filter(pk=temporada_id, competicion_id=competicion_id).first()
    )

    if temporada is None:
        if not Competicion.objects.filter(pk=competicion_id).exists():
            raise ResourceNotFound("competicion", competicion_id)
        
        raise ResourceNotFound("temporada", temporada_id)

    if temporada.competicion.tipo == Competicion.Tipo.COPA:
        return []

    table = {}
    teams = temporada.equipos.order_by("nombre").values(
        "id",
        "nombre",
        "escudo_url",
    )
    for team in teams:
        table[team["id"]] = {
            "equipo": {
                "id": team["id"],
                "nombre": team["nombre"],
                "imagen": team["escudo_url"],
            },
            "partidos_jugados": 0,
            "ganados": 0,
            "empatados": 0,
            "perdidos": 0,
            "goles_favor": 0,
            "goles_contra": 0,
            "diferencia_goles": 0,
            "puntos": 0,
            "forma": [],
        }

    completed_matches = (
        Partido.objects.filter(
            temporada=temporada,
            estado__in=(Partido.Estado.FINALIZADO, "complete"),
            goles_local__isnull=False,
            goles_vis__isnull=False,
        )
        .order_by("fecha", "id")
        .values(
            "equipo_local_id", "equipo_visitante_id",
            "goles_local", "goles_vis",
        )
    )

    for match in completed_matches:
        home_id = match["equipo_local_id"]
        away_id = match["equipo_visitante_id"]
        home = table.get(home_id)
        away = table.get(away_id)

        if home is None or away is None:
            continue

        home_goals = match["goles_local"]
        away_goals = match["goles_vis"]
        home["partidos_jugados"] += 1
        away["partidos_jugados"] += 1
        home["goles_favor"] += home_goals
        home["goles_contra"] += away_goals
        away["goles_favor"] += away_goals
        away["goles_contra"] += home_goals

        if home_goals > away_goals:
            home["ganados"] += 1
            home["puntos"] += 3
            away["perdidos"] += 1
            home["forma"].append("W")
            away["forma"].append("L")
        elif home_goals < away_goals:
            away["ganados"] += 1
            away["puntos"] += 3
            home["perdidos"] += 1
            home["forma"].append("L")
            away["forma"].append("W")
        else:
            home["empatados"] += 1
            away["empatados"] += 1
            home["puntos"] += 1
            away["puntos"] += 1
            home["forma"].append("D")
            away["forma"].append("D")

    rows = list(table.values())
    
    for row in rows:
        row["diferencia_goles"] = row["goles_favor"] - row["goles_contra"]
        row["forma"] = "".join(row["forma"][-5:])

    return sorted(
        rows,
        key=lambda row: (
            -row["puntos"],
            -row["diferencia_goles"],
            -row["goles_favor"],
            row["equipo"]["nombre"],
        ),
    )


def get_competicion_temporada_stats(competicion_id: int, temporada_id: int) -> dict:
    temporada = (
        Temporada.objects.filter(pk=temporada_id, competicion_id=competicion_id).first()
    )

    if temporada is None:
        if not Competicion.objects.filter(pk=competicion_id).exists():
            raise ResourceNotFound("competicion", competicion_id)
        
        raise ResourceNotFound("temporada", temporada_id)

    # TODO: Determinar que stats devolver.

    return temporada
#endregion

#region Equipo
def get_equipos(nombre: str | None = None) -> list[dict]:
    equipos = Equipo.objects.all()

    if nombre:
        equipos = equipos.filter(nombre__icontains=nombre)

    return list(
        equipos.order_by("nombre").values("id", "nombre", "siglas", "escudo_url")
    )


def get_equipo(equipo_id: int) -> dict | None:
    instance = Equipo.objects.filter(pk=equipo_id).first()

    if instance is None:
        raise ResourceNotFound("equipo", equipo_id)

    equipo = {
        "id": instance.id, "nombre": instance.nombre,
        "siglas": instance.siglas, "escudo_url": instance.escudo_url,
    }

    if instance.estadio is not None:
        equipo["estadio"] = {
            "id": instance.estadio.id,
            "nombre": instance.estadio.nombre,
            "ciudad": instance.estadio.ciudad,
            "capacidad": instance.estadio.capacidad,
            "foto_url": instance.estadio.foto_url,
        }
    else:
        equipo["estadio"] = None

    temporadas = list(
        instance.temporadas.order_by("periodo").values(
            "id",
            "periodo",
            "fecha_inicio",
            "fecha_fin",
            "competicion_id",
            "competicion__api_id",
            "competicion__nombre",
            "competicion__tipo",
            "competicion__logo_url",
        )
    )

    equipo["temporadas"] = [
        {
            "id": temporada["id"],
            "periodo": temporada["periodo"],
            "fecha_inicio": temporada["fecha_inicio"],
            "fecha_fin": temporada["fecha_fin"],
        }
        for temporada in temporadas
    ]

    competiciones_by_id = {}

    for temporada in temporadas:
        competicion = competiciones_by_id.setdefault(
            temporada["competicion_id"],
            {
                "id": temporada["competicion_id"],
                "api_id": temporada["competicion__api_id"],
                "nombre": temporada["competicion__nombre"],
                "tipo": temporada["competicion__tipo"],
                "logo_url": temporada["competicion__logo_url"],
                "temporadas": [],
            },
        )
        competicion["temporadas"].append(
            {
                "id": temporada["id"],
                "periodo": temporada["periodo"],
                "fecha_inicio": temporada["fecha_inicio"],
                "fecha_fin": temporada["fecha_fin"],
            }
        )

    equipo["competiciones"] = list(competiciones_by_id.values())

    equipo["partidos"] = [
        {
            "id": partido["id"],
            "api_id": partido["api_id"],
            "fecha": partido["fecha"],
            "semana": partido["semana"],
            "goles_local": partido["goles_local"],
            "goles_vis": partido["goles_vis"],
            "equipo_local": {
                "id": partido["equipo_local_id"],
                "nombre": partido["equipo_local__nombre"],
            },
            "equipo_visitante": {
                "id": partido["equipo_visitante_id"],
                "nombre": partido["equipo_visitante__nombre"],
            },
            "temporada": {
                "id": partido["temporada_id"],
                "periodo": partido["temporada__periodo"],
            },
            "competicion": {
                "id": partido["temporada__competicion_id"],
                "nombre": partido["temporada__competicion__nombre"],
            },
        }
        for partido in Partido.objects.filter(
            Q(equipo_local=instance) | Q(equipo_visitante=instance),
            estado=Partido.Estado.FINALIZADO,
        )
        .order_by("-fecha", "-id")
        .values(
            "id",
            "api_id",
            "fecha",
            "semana",
            "goles_local",
            "goles_vis",
            "equipo_local_id",
            "equipo_local__nombre",
            "equipo_visitante_id",
            "equipo_visitante__nombre",
            "temporada_id",
            "temporada__periodo",
            "temporada__competicion_id",
            "temporada__competicion__nombre",
        )[:10]
    ]
    
    return equipo


def get_equipo_players(equipo_id: int) -> dict:
    # TODO: Completar metodo
    players = None

    return players


def get_equipo_stats(equipo_id: int, temporada_id: int) -> dict:
    estadisticas = None
    # TODO: Determinar que stats devolver.

    return estadisticas
#endregion