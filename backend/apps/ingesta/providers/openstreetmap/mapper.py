def map_location(data: dict) -> list[dict]:
    return [
        {
            "tipo": location["type"],
            "lat": location['lat'],
            "lon": location['lon']
        }

        for location in data
    ]

    