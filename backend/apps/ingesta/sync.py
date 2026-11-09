from django.conf import settings
from django.db import transaction

from difflib import SequenceMatcher

from .providers.footballdata_io import (mapper as ioMapper, client as ioClient, mock as ioMock)
from .providers.apifootball import (mapper as apiMapper, client as apiClient, mock as apiMock)
from .providers.openstreetmap import (mapper as mapMapper, client as mapClient, mock as mapMock)

from .providers.local import get_confederations, map_confederations, get_league_types

from ..catalogo.models import Confederacion, Pais, Competicion, Temporada, Equipo, Estadio, EquipoTemporada
from ..partidos.models import Partido, Evento, Convocatoria, Jugador, Plantilla

# TODO: Reemplazar esto por un metodo mas robusto

DUPLICATE_COUNTRIES = {
    "48": "China PR [48] - Duplicado de China [47]",
    "43": "Côte d'Ivoire [43] - Duplicado de Ivory Coast [118]",
    "41": "Cape Verde Islands [41] - Duplicado de Cape Verde [40]",
    "63": "Czechia [63] - Duplicado de Czech Republic [62]",
    "106": "Hong Kong, China [106] - Duplicado de Hong Kong [105]",
    "114": "Ireland [194] - Duplicado de Republic of Ireland [114]",
    "131": "Kyrgyz Republic [130] - Duplicado de Kyrgyzstan [131]",
    "126": "Korea [126] - Duplicado de South Korea [219]",
    "127": "Korea Republic [127] - Duplicado de South Korea [219]",
    "142": "Macau [142] - Duplicado de Macao [141]",
    "175": "North Macedonia [86] - Duplicado de NYR Macedonia [175]",
    "143": "Macedonia [143] - Duplicado de NYR Macedonia [175]",
    "223": "St Kitts and Nevis [223] - Duplicado de St. Kitts and Nevis [224]",
    "77": "Eswatini [77] - Duplicado de Swaziland [229]",
    "49": "Chinese Taipei [49] - Duplicado de Taiwan [234]",
    "237": "Türkiye [237] - Duplicado de Turkey [244]",
    "247": "UAE [247] - Duplicado de United Arab Emirates [250]"
}


def get_provider(type_provider: str):
    source = settings.USE_MOCK_DATA

    if not source:
        if type_provider == 'api-football':
            return apiClient.ApiFootballApiClient()
        elif type_provider == 'footballdataio':
            return ioClient.FootballDataIoApiClient()
        elif type_provider == 'openstreetmap':
            return mapClient.OpenStreetMapApiClient()
    else:
        if type_provider == 'api-football':
            return apiMock.MockProvider()
        elif type_provider == 'footballdataio':
            return ioMock.MockProvider()
        elif type_provider == 'openstreetmap':
            return mapMock.MockProvider()


def _defaults(datos: dict) -> dict:
    return {k: v for k, v in datos.items() if k != "api_id"}


# region Sincronismo de Catalogo
def sync_confederations():
    data = get_confederations()
    mapped_data = map_confederations(data)

    with transaction.atomic():
        for datos in mapped_data:
            Confederacion.objects.update_or_create(
                api_id = datos["api_id"],
                defaults=_defaults(datos),
            )


def sync_countries(provider=None):
    provider = get_provider('footballdataio')
    confederation_codes = ioMapper.map_country_confederations(get_confederations())

    page = 1
    total_pages = 1

    while page <= total_pages:
        data, meta = provider.get_countries(page)
        mapped_data = ioMapper.map_countries(data)

        total_pages = meta["pagination"]["total_pages"]

        with transaction.atomic():
            for datos in mapped_data:
                if datos.get('codigo_iso3') == '':
                    continue

                if datos.get('api_id') in DUPLICATE_COUNTRIES:
                    continue

                conf_codigo = confederation_codes.get(datos.get('codigo_iso3'))

                if conf_codigo is None:
                    continue

                try:
                    confederacion = Confederacion.objects.get(api_id = conf_codigo)
                except Confederacion.DoesNotExist:
                    continue

                Pais.objects.update_or_create(
                    api_id=datos["api_id"],
                    defaults={**_defaults(datos), "confederacion": confederacion},
                )

        page += 1


def sync_leagues():
    provider = get_provider('footballdataio')
    
    data, meta = provider.get_leagues()
    mapped_data = ioMapper.map_leagues(data)

    league_types = get_league_types()

    with transaction.atomic():
        for datos in mapped_data:
            league_id = datos.get('api_id')
            league_info = league_types.get(league_id)

            if league_info is not None:
                tipo_comp = league_info["type"]
            else:
                tipo_comp = 'LIGA' # Tipo de competicion por determinado

            country = None
            conf = None

            try:
                country = Pais.objects.get(nombre = datos['country'])
            except Pais.DoesNotExist:
                try:
                    conf = Confederacion.objects.get(region = datos['country'])
                except Confederacion.DoesNotExist:
                    pass  # La competicion es internacional

            del datos['country']

            Competicion.objects.update_or_create(
                api_id=datos["api_id"],
                defaults={**_defaults(datos), "tipo": tipo_comp, "pais": country, "confederacion": conf},
            )


def sync_seasons(comp_ids: list[str] = None):
    provider = get_provider('footballdataio')

    competitions = Competicion.objects.all()

    if comp_ids is not None:
        competitions = competitions.filter(api_id__in = comp_ids)

    for comp in competitions:
        data, meta = provider.get_seasons(comp.api_id)
        mapped_data = ioMapper.map_seasons(data)

        with transaction.atomic():
            for datos in mapped_data:
                if comp.api_id == '50' and datos['api_id'] == '4433':
                    continue  # Esa temporada no pertenece a la Copa del Mundo

                Temporada.objects.update_or_create(
                    api_id=datos["api_id"],
                    defaults={**_defaults(datos), 'competicion': comp},
                )


def sync_teams(comp_ids: list[str] = None, season_ids: list[str] = None):
    ioProvider = get_provider('footballdataio')
    competitions = Competicion.objects.all()

    if comp_ids is not None:
        competitions = competitions.filter(api_id__in = comp_ids)

    for comp in competitions:
        seasons = Temporada.objects.filter(competicion = comp)

        if season_ids is not None:
            seasons = seasons.filter(api_id__in = season_ids)

        for season in seasons:
            # Este endpoint fue utilizado ya que los otros no tienen informacion completa
            data, meta = ioProvider.get_matches(comp.api_id, season.api_id)
            mapped_data = ioMapper.map_teams(data)

            with transaction.atomic():
                for datos in mapped_data:
                    pais = None

                    if comp.pais is not None:
                        pais = comp.pais
                    elif 'National Team' in datos['nombre']:
                        clean_country_name = data['nombre'].replace('National Team', '').strip()
                        pais = Pais.objects.get(nombre = clean_country_name)
                    else:
                        try:
                            team = Equipo.objects.get(api_id = datos['api_id'])
                            pais = team.pais
                        except Equipo.DoesNotExist:
                            data, meta = ioProvider.get_team_data(datos['api_id'])

                            try:
                                pais = Pais.objects.get(nombre = data['country'])
                            except Pais.DoesNotExist:
                                pais = None  # No es lo ideal
                            
                    team, _ = Equipo.objects.update_or_create(
                        api_id=datos["api_id"],
                        defaults={**_defaults(datos), 'pais': pais},
                    )

                    team.temporadas.add(season)

def sync_team_data_and_venues(team_ids: list[str] = None):
    # TODO: Determinar la resilencia de este metodo en especifico
    apiProvider = get_provider('api-football')
    teams = Equipo.objects.select_related('pais').all()

    if team_ids is not None:
        teams = teams.filter(api_id__in = team_ids)

    for team in teams:
        name = team.nombre.replace("AFC", "").replace("FC", "").strip()
        data = apiProvider.get_team_data(name, team.pais.nombre)

        if data == []:
            simple_name = name.split(" ")[0].strip()
            data = apiProvider.get_team_data(simple_name, team.pais.nombre)

            if data == []:
                if len(name.split(" ")) >= 3:
                    less_simple_name = " ".join(name.split()[:2])
                    data = apiProvider.get_team_data(less_simple_name, team.pais.nombre)

                    if data == []:
                        continue
                else:
                    continue

        # Esto no es ideal ya que podria guardar datos de otro equipo, pero la probabilidad
        # de que dos equipos de un mismo pais tengan el mismo nombre y esten registrados en
        # el sistema (API) es muy, muy baja.
        first_team_data = data[0]

        team_data = apiMapper.map_team_data(first_team_data)
        venue = sync_venue(None, data)

        with transaction.atomic():
            Equipo.objects.update_or_create(
                api_id = team.api_id,
                defaults={**_defaults(team_data), 'estadio': venue}
            )

def sync_venue(venue_name: str = None, raw_data: dict = None):
    apiProvider = get_provider('api-football')
    mapProvider = get_provider('openstreetmap')

    if raw_data is None:
        data = apiProvider.get_venue(venue_name)
    else:
        data = raw_data

    if len(data) == 0:
        return None

    first_team_data = data[0]
    venue_data = apiMapper.map_venue(first_team_data)

    venue_location_data = mapProvider.get_venue_location(venue_data['nombre'])

    if len(venue_location_data) == 0:
        return None

    mapped_venues_locations = mapMapper.map_location(venue_location_data)
    stadium_location = mapped_venues_locations[0]

    complete_data = {
        "nombre": venue_data["nombre"], "ciudad": venue_data["ciudad"],
        "capacidad": venue_data["capacidad"], "foto_url": venue_data["foto_url"],
        "latitud": (
            float(stadium_location["lat"])
            if stadium_location is not None
            else None
        ),
        "longitud": (
            float(stadium_location["lon"])
            if stadium_location is not None
            else None
        ),
    }

    with transaction.atomic():
        venue, _ = Estadio.objects.update_or_create(
            api_id = venue_data["api_id"],
            defaults = complete_data,
        )

    return venue
# endregion

# region Sincronismo de Partidos
def sync_matches(comp_ids: list[str] = None, season_ids: list[str] = None):
    provider = get_provider('footballdataio')
    competitions = Competicion.objects.all()

    if comp_ids is not None:
        competitions = competitions.filter(api_id__in = comp_ids)

    for comp in competitions:
        seasons = Temporada.objects.filter(competicion = comp)

        if season_ids is not None:
            seasons = seasons.filter(api_id__in = season_ids)

        for season in seasons:
            page = 1
            total_pages = 1

            while page <= total_pages:
                data, meta = provider.get_matches(comp.api_id, season.api_id, page)
                mapped_matches = ioMapper.map_matches(data)

                total_pages = meta["pagination"]["total_pages"]

                with transaction.atomic():
                    for match_data in mapped_matches:
                        _save_match_data(match_data)

                page += 1

            refresh_season_detail_status(season)


def refresh_current_matches():
    provider = get_provider('footballdataio')

    data, meta = provider.get_today_matches()
    mapped_matches = ioMapper.map_matches(data)
    
    season_ids = set()

    with transaction.atomic():
        for match_data in mapped_matches:
            season_ids.add(match_data["temporada_id"])
            _save_match_data(match_data)

    for season in Temporada.objects.filter(api_id__in=season_ids):
        refresh_season_detail_status(season)


def _save_match_data(match_data):
    mapProvider = get_provider('openstreetmap')

    season = Temporada.objects.filter(api_id = match_data['temporada_id']).first()
    home_team = Equipo.objects.filter(api_id = match_data['equipo_local_id']).first()
    away_team = Equipo.objects.filter(api_id = match_data['equipo_vis_id']).first()

    comp_type = season.competicion.tipo

    if comp_type == Competicion.Tipo.LIGA:
        venue = home_team.estadio
    else:
        try:
            venue = Estadio.objects.get(nombre = match_data['sede_nombre'])
        except Estadio.DoesNotExist:
            venue = sync_venue(match_data['sede_nombre'], None)

            if venue is None:
                locations = mapProvider.get_venue_location(match_data['sede_nombre'])

                # TODO: Determinar que hacer en caso de que no haya informacion de la ubicacion de un partido.

                if len(locations) > 0:
                    location = locations[0]

                    match_data['sede_latitud'] = float(location["lat"]) if location is not None else None
                    match_data['sede_longitud'] = float(location["lon"]) if location is not None else None

    del match_data['temporada_id']
    del match_data['equipo_local_id']
    del match_data['equipo_vis_id']
    del match_data['sede_nombre']

    defaults = {**_defaults(match_data), 'temporada': season,
                'equipo_local': home_team, 'equipo_visitante': away_team,
                'estadio': venue}

    if venue and venue.latitud is not None and venue.longitud is not None:
        defaults.update({
            "sede_nombre": "",
            "sede_direccion": "",
            "sede_latitud": None,
            "sede_longitud": None,
        })

    Partido.objects.update_or_create(
        api_id = match_data['api_id'],
        defaults = defaults
    )


def sync_match_detail(match_ids: list[str] = None, comp_ids: list[str] = None, season_ids: list[str] = None):
    if not any([match_ids, comp_ids, season_ids]):
        raise ValueError("Indica al menos match_ids, comp_ids o season_ids")
    
    provider = get_provider('footballdataio')
    partidos = Partido.objects.select_related("temporada__competicion")

    if match_ids:
        matches = partidos.filter(api_id__in=match_ids)
    if comp_ids:
        matches = partidos.filter(temporada__competicion__api_id__in=comp_ids)
    if season_ids:
        matches = partidos.filter(temporada__api_id__in=season_ids)

    for match in matches:
        match_data, meta = provider.get_match_detail(match.api_id)

        if match.estado == Partido.Estado.FINALIZADO:
            minuto_actual = None
        else:
            minuto_actual = ioMapper.map_match_detail(match_data)["minuto"]

        with transaction.atomic():
            partido, _ = Partido.objects.update_or_create(
                api_id = match_data['match_id'],
                defaults = {'minuto_actual': minuto_actual, 'nivel_datos': 'COMPLETO'}
            )
            
            sync_players_and_callups(match_data, partido)
            sync_events(match_data, partido)

            refresh_season_detail_status(partido.temporada)


def sync_players_and_callups(raw_data, partido):
    mapped_players = ioMapper.map_players(raw_data)
    mapped_callups = ioMapper.map_callups(raw_data)

    team_ids = {callup["equipo_id"] for callup in mapped_callups}
    teams_by_id = Equipo.objects.in_bulk(team_ids, field_name="api_id")
    players_by_id = {}

    with transaction.atomic():
        for player_data in mapped_players:
            player, _ = Jugador.objects.update_or_create(
                api_id=player_data["api_id"],
                defaults={
                    "nombre": player_data["nombre"],
                    "apodo": player_data["apodo"],
                    "foto_url": player_data["foto_url"],
                },
            )
            players_by_id[str(player.api_id)] = player

        for callup_data in mapped_callups:
            player = players_by_id.get(str(callup_data["jugador_id"]))
            team = teams_by_id.get(callup_data["equipo_id"])

            if team is None:
                raise Equipo.DoesNotExist(
                    f"Team {callup_data['equipo_id']} not found for "
                    f"match {partido.api_id}"
                )

            if player is None:
                raise Jugador.DoesNotExist(
                    f"Player {callup_data['jugador_id']} not found for "
                    f"match {partido.api_id}"
                )

            Convocatoria.objects.update_or_create(
                partido=partido,
                jugador=player,
                defaults={
                    "equipo": team,
                    "titular": callup_data["titular"],
                    "dorsal": callup_data["dorsal"],
                    "posicion": callup_data["posicion"],
                    "min_entrada": callup_data["min_entrada"],
                    "min_salida": callup_data["min_salida"],
                },
            )

            sync_plantilla(player, team, partido.temporada)


def sync_plantilla(jugador, equipo, temporada):
    equipo_temporada, _ = EquipoTemporada.objects.get_or_create(
        equipo=equipo,
        temporada=temporada,
    )

    Plantilla.objects.get_or_create(
        jugador=jugador,
        equipo_temporada=equipo_temporada,
    )

def sync_events(raw_data, partido):
    mapped_events = ioMapper.map_events(raw_data)
    Evento.objects.filter(partido=partido).delete()

    for mapped_event in mapped_events:
        jugador = Jugador.objects.filter(api_id = mapped_event['jugador_id']).first()
        jugador_sale = None

        if 'jugador_sale_id' in mapped_event:
            jugador_sale = Jugador.objects.filter(api_id = mapped_event['jugador_sale_id']).first()
        
        Evento.objects.create(
            partido = partido,
            jugador = jugador,
            jugador_sale = jugador_sale,
            tipo = mapped_event["tipo"],
            minuto = mapped_event["minuto"],
        )


def sync_player_detail(player_ids: list[str] = None):
    provider = get_provider('footballdataio')
    players = Jugador.objects.all()

    competiciones_soportadas = set(Competicion.objects.values_list("api_id", flat=True))

    if player_ids is not None:
        players = players.filter(api_id__in = player_ids)

    for player in players:
        data, meta = provider.get_player_detail(player.api_id)
        mapped_data = ioMapper.map_player_detail(data)

        pais = Pais.objects.filter(nombre = mapped_data['nacionalidad']).first()

        with transaction.atomic():
            jugador, _ = Jugador.objects.update_or_create(
                api_id = mapped_data['api_id'],
                defaults = {
                    "pais": pais,
                    "fecha_nacimiento": mapped_data['fecha_nacimiento'], 
                    "altura": mapped_data['altura'], 
                    "peso": mapped_data['peso'],
                    "nivel_datos": Jugador.NivelDatos.COMPLETO
                }
            )

            for comp_data in mapped_data['competiciones']:
                if comp_data['api_id'] not in competiciones_soportadas:
                    continue

                for season in comp_data['temporadas']:
                    temporada = Temporada.objects.get(api_id = season['api_id'])

                    try:
                        equipo = Equipo.objects.get(api_id = season['equipo']['api_id'])
                    except Equipo.DoesNotExist:
                        equipo_data = season['equipo']

                        equipo = Equipo.objects.create(
                            api_id = equipo_data['api_id'],
                            nombre = equipo_data['nombre'],
                            escudo_url = equipo_data['escudo_url']
                        )

                    equipoTemporada, _ = EquipoTemporada.objects.get_or_create(
                        temporada = temporada,
                        equipo = equipo
                    )

                    Plantilla.objects.update_or_create(
                        equipo_temporada = equipoTemporada,
                        jugador = jugador
                    )
#endregion

def refresh_season_detail_status(temporada):
    eligible = temporada.partidos.filter(
        estado__in=[
            Partido.Estado.EN_JUEGO,
            Partido.Estado.FINALIZADO,
        ]
    )
    total = eligible.count()
    complete = eligible.filter(
        nivel_datos=Partido.NivelDatos.COMPLETO
    ).count()

    if total > 0 and complete == total:
        status = Temporada.EstadoDatos.DETALLE_CARGADO
    elif complete > 0:
        status = Temporada.EstadoDatos.DETALLE_PARCIAL
    else:
        status = Temporada.EstadoDatos.PARTIDOS_CARGADOS

    Temporada.objects.filter(pk=temporada.pk).update(estado_datos=status)