from django.utils.dateparse import parse_datetime
from html import unescape

def map_countries(data: dict) -> list[dict]:
    return [
        {
            "api_id": str(pais["country_id"]),
            "nombre": pais["country"],
            "codigo_iso3": pais.get("fifa_iso3", ""),
            "bandera_url": pais.get("flag", ""),
        }

        for pais in data["countries"]
    ]


def map_country_confederations(data):
    return {
        fifa_iso3: conf_codigo
        
        for conf_codigo, confederation in data.items()
        for fifa_iso3 in confederation["members"]
    }


def map_leagues(data: dict) -> list[dict]:
    return [
        {
            "api_id": str(league["league_id"]),
            "nombre": league["league_name"],
            "country": league["country"],
            "logo_url": league.get("league_image", ""),
        }

        for league in data
    ]


def map_seasons(data: dict) -> list[dict]:
    return [
        {
            "api_id": str(season["season_id"]),
            "periodo": season["year"],
            "fecha_inicio": parse_datetime(season['summary']["first_match_date"]),
            "fecha_fin": parse_datetime(season['summary']["last_match_date"]),
        }

        for season in data['seasons']
    ]


def map_teams(data: dict) -> list[dict]:
    teams_by_id = {}

    for match in data["matches"]:
        for side in ("home_team", "away_team"):
            team = match[side]
            teams_by_id.setdefault(
                str(team["team_id"]),
                {
                    "api_id": str(team["team_id"]),
                    "nombre": unescape(team["team_name"]).strip(),
                    "escudo_url": team["team_logo"],
                },
            )

    return list(teams_by_id.values())
