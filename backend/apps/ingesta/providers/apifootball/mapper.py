
def map_team_data(data: dict) -> dict:
    team_data = data['team']

    return {
        "siglas": team_data["code"],
        "es_nacional": team_data['national'],
    }


def map_venue(data: dict) -> dict:
    if 'venue' in data:
        venue_data = data['venue']
    else:
        venue_data = data

    return {
        "api_id": str(venue_data["id"]),
        "nombre": venue_data["name"],
        "ciudad": venue_data["city"],
        "capacidad": venue_data["capacity"],
        "foto_url": venue_data["image"],
    }
    