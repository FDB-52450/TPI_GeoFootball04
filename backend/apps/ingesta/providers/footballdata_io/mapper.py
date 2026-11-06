from django.utils.dateparse import parse_date, parse_datetime
from html import unescape

from apps.catalogo.models import Competicion
from apps.partidos.models import Evento, Partido

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

def map_matches(data: dict) -> list[dict]:
    return [
        {
            "api_id": str(match["match_id"]),
            "fecha": parse_datetime(match["match_date"]),
            "estado": _map_match_status(match["status"]),
            "semana": match["game_week"],
            "goles_vis": match['score']['away'],
            "goles_local": match['score']['home'],

            "temporada_id": match['season']['season_id'],
            "equipo_local_id": match['home_team']['team_id'],
            "equipo_vis_id": match['away_team']['team_id'],

            "sede_nombre": match['venue']['stadium_name'],
            "sede_direccion": match['venue']['stadium_location']
        }

        for match in data['matches']
    ]

def map_match_detail(data: dict) -> list[dict]:
    return {
        "minuto": _map_minute(data["minute"]),
    }


def map_players(data: dict) -> list[dict]:
    players_by_id = {}

    for side in ("home", "away"):
        for section in ("lineups", "bench"):
            players = (data.get(section) or {}).get(side) or []

            for player in players:
                players_by_id.setdefault(
                    player['player_id'],
                    {
                        "api_id": player['player_id'],
                        "nombre": unescape(player["player_name"]).strip(),
                        "apodo": unescape(player["known_name"]).strip(),
                        "foto_url": player["player_image"],
                    },
                )

    return list(players_by_id.values())


def map_callups(data: dict) -> list[dict]:
    callups_by_key = {}

    for side in ("home", "away"):
        team_id = str(data[f"{side}_team"]["team_id"])
        starters = (data.get("lineups") or {}).get(side) or []
        substitutes = (data.get("bench") or {}).get(side) or []

        starter_exit_minutes = {}
        
        for substitute in substitutes:
            replaced_player = substitute.get("replaced_player") or {}
            replaced_id = replaced_player.get("player_id")
            if replaced_id is not None:
                starter_exit_minutes[str(replaced_id)] = _map_minute(
                    substitute.get("substitution_minute")
                )

        for is_starter, players in ((True, starters), (False, substitutes)):
            for player in players:
                player_id = player.get("player_id")
                if player_id is None:
                    continue

                player_id = str(player_id)
                callups_by_key[(team_id, player_id)] = {
                    "equipo_id": team_id,
                    "jugador_id": player_id,
                    "titular": is_starter,
                    "dorsal": player.get("shirt_number"),
                    "posicion": player.get("position_name") or "",
                    "min_entrada": (
                        None if is_starter
                        else _map_minute(player.get("substitution_minute"))
                    ),
                    "min_salida": (
                        starter_exit_minutes.get(player_id)
                        if is_starter
                        else None
                    ),
                }

    return list(callups_by_key.values())

def map_events(data: dict) -> list[dict]:
    mapped_events = []

    for section in ("lineups", "bench"):
        for side in ("home", "away"):
            players = (data.get(section) or {}).get(side) or []

            for player in players:
                player_id = player.get("player_id")

                for event in player.get("events") or []:
                    event_type = event.get("type")
                    mapped_type = _map_event_tipo(event_type)
                    minute = _map_minute(event.get("minute"))

                    if minute is None:
                        raise ValueError(
                            f"Event {event_type!r} has no minute"
                        )

                    mapped_events.append(
                        {
                            "jugador_id": str(player_id) if player_id is not None else None,
                            "tipo": mapped_type,
                            "minuto": minute,
                        }
                    )

    for side in ("home", "away"):
        substitutes = (data.get("bench") or {}).get(side) or []

        for substitute in substitutes:
            minute = _map_minute(substitute.get("substitution_minute"))

            if minute is None:
                continue

            player_id = substitute.get("player_id")
            replaced_player = substitute.get("replaced_player") or {}
            player_exit_id = replaced_player.get("player_id")

            mapped_events.append(
                {
                    "jugador_id": str(player_id) if player_id is not None else None,
                    "jugador_sale_id": (
                        str(player_exit_id) if player_exit_id is not None else None
                    ),
                    "tipo": Evento.Tipo.SUBSTITUCION,
                    "minuto": minute,
                }
            )

    return mapped_events


def map_player_detail(data):
    competitions_by_id = {}

    for season_stat in data.get("season_stats") or []:
        league = season_stat.get("league") or {}
        season = season_stat.get("season") or {}
        team = season_stat.get("team") or {}

        league_id = league.get("league_id")
        season_id = season.get("season_id")

        if league_id is None or season_id is None:
            raise ValueError("Player season stats require league_id and season_id")

        competition = competitions_by_id.setdefault(
            str(league_id),
            {
                "api_id": str(league_id),
                "nombre": league.get("competition_name") or league.get("name") or "",
                "tipo": league.get("league_type"),
                "temporadas": {},
            },
        )
        season_key = str(season_id)
        season_data = competition["temporadas"].setdefault(
            season_key,
            {
                "api_id": season_key,
                "periodo": season.get("label") or str(season.get("year", "")),
                "equipo": None,
            },
        )

        team_id = team.get("team_id")
        season_data["equipo"] = {
            "api_id": str(team_id),
            "nombre": team.get("team_name") or "",
            "escudo_url": team.get("team_logo") or "",
        }

    return {
        "api_id": str(data['player_id']),
        "fecha_nacimiento": parse_date(data['date_of_birth']) if data['date_of_birth'] else None,
        "altura": data.get("height_cm"),
        "peso": data.get("weight_kg"),
        "nacionalidad": unescape(data.get("nationality") or "").strip(),
        "competiciones": [
            {
                **competition,
                "temporadas": list(competition["temporadas"].values()),
            }

            for competition in competitions_by_id.values()
        ],
    }


def _map_match_status(api_status: str) -> str:    
    # No tengo ni idea para que se utilizan los status "scheduled", "not started" y "pending"
    statuses = {
        "complete": Partido.Estado.FINALIZADO,
        "live": Partido.Estado.EN_JUEGO,
        "incomplete": Partido.Estado.PROGRAMADO,
        "scheduled": Partido.Estado.PROGRAMADO,
        "not started": Partido.Estado.PROGRAMADO,
        "pending": Partido.Estado.PROGRAMADO,
    }

    try:
        return statuses[api_status.lower()]
    except KeyError as exc:
        raise ValueError(f"Unknown match status: {api_status!r}") from exc


def _map_minute(value):
    if value is None:
        return None

    parts = str(value).strip().rstrip("'").split("+")

    try:
        return sum(int(part.strip()) for part in parts)
    except ValueError as exc:
        raise ValueError(f"Invalid substitution minute: {value!r}") from exc


def _map_event_tipo(api_event):
    event_types = {
        "yellow": Evento.Tipo.TARJETA_AMARILLA,
        "red": Evento.Tipo.TARJETA_ROJA,
        "goal": Evento.Tipo.GOL,
        "substitution": Evento.Tipo.SUBSTITUCION,
    }

    try:
        return event_types[api_event.lower()]
    except KeyError as exc:
        raise ValueError(f"Unknown event type: {api_event!r}") from exc

def _map_comp_type(api_type):
    # Solo utilizar en caso de implementar carga parcial de competiciones
    comp_types = {
        "domestic league": Competicion.Tipo.LIGA,
        "cup": Competicion.Tipo.COPA,
        "international": Evento.Tipo.GOL,
    }

    try:
        return comp_types[api_type.lower()]
    except KeyError as exc:
        raise ValueError(f"Unknown event type: {api_type!r}") from exc
