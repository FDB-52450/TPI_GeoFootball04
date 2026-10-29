from django.conf import settings
from django.db import transaction

import time

from .providers.footballdata_io import (mapper as ioMapper, client as ioClient, mock as ioMock)
from .providers.apifootball import (mapper as apiMapper, client as apiClient, mock as apiMock)
from .providers.openstreetmap import (mapper as mapMapper, client as mapClient, mock as mapMock)

from .providers.local import get_confederations, map_confederations, get_league_types

from ..catalogo.models import Confederacion, Pais, Competicion, Temporada, Equipo, Estadio


DUPLICATE_COUNTRIES = {
    "48": "China PR [48] - Duplicado de China [47]",
    "43": "Côte d'Ivoire [43] - Duplicado de Ivory Coast [118]",
    "41": "Cape Verde Islands [41] - Duplicado de Cape Verde [40]",
    "63": "Czechia [63] - Duplicado de Czech Republic [62]",
    "106": "Hong Kong, China [106] - Duplicado de Hong Kong [105]",
    "194": "Republic of Ireland [194] - Duplicado de Ireland [114]",
    "131": "Kyrgyz Republic [130] - Duplicado de Kyrgyzstan [131]",
    "126": "Korea [126] - Duplicado de South Korea [219]",
    "127": "Korea Republic [127] - Duplicado de South Korea [219]",
    "142": "Macau [142] - Duplicado de Macao [141]",
    "86": "FYR Macedonia [86] - Duplicado de North Macedonia [175]",
    "143": "FYR Macedonia [143] - Duplicado de North Macedonia [175]",
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
    
    data = provider.get_countries()
    mapped_data = ioMapper.map_countries(data)

    confederation_codes = ioMapper.map_country_confederations(get_confederations())

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


def sync_leagues():
    provider = get_provider('footballdataio')
    
    data = provider.get_leagues()
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
        data = provider.get_seasons(comp.api_id)
        mapped_data = ioMapper.map_seasons(data)

        with transaction.atomic():
            for datos in mapped_data:
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
            data = ioProvider.get_teams(comp.api_id, season.api_id)
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
                            data = ioProvider.get_team_data(datos['api_id'])
                            pais = Pais.objects.get(nombre = data['country'])
                            
                    team, _ = Equipo.objects.update_or_create(
                        api_id=datos["api_id"],
                        defaults={**_defaults(datos), 'pais': pais},
                    )

                    team.temporadas.add(season)


def sync_team_data_and_venues(team_ids: list[str] = None):
    # TODO: Determinar la resilencia de este metodo en especifico
    apiProvider = get_provider('api-football')
    mapProvider = get_provider('openstreetmap')
    teams = Equipo.objects.select_related('pais').all()

    if team_ids is not None:
        teams = teams.filter(api_id__in = team_ids)

    for team in teams:
        data = apiProvider.get_team_data(team.nombre, team.pais.nombre)

        if data == []:
            continue

        # Esto no es ideal ya que podria guardar datos de otro equipo, pero la probabilidad
        # de que dos equipos de un mismo pais tengan el mismo nombre y esten registrados en
        # el sistema (API) es muy, muy baja.
        first_team_data = data[0]

        team_data = apiMapper.map_team_data(first_team_data)
        venue_data = apiMapper.map_venue(first_team_data)

        venue_location_data = mapProvider.get_venue_location(venue_data['nombre'], team.pais.nombre)
        mapped_venues_locations = mapMapper.map_location(venue_location_data)

        stadium_location = next(
            (location for location in mapped_venues_locations if location["tipo"] == "stadium"),
            None,
        )

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

            Equipo.objects.update_or_create(
                api_id = team.api_id,
                defaults={**_defaults(team_data), 'estadio': venue}
            )



