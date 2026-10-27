import json
from pathlib import Path

MOCK_DATA_DIR = Path(__file__).resolve().parents[0] / "mock-data"

class MockProvider:
    def get_countries(self):
        return self._read_json("countries.json")

    def get_leagues(self):
        return self._read_json("leagues.json")

    def get_seasons(self, comp_id):
        return self._read_json("seasons.json")

    def get_teams(self, comp_id, season_id):
        return self._read_json("season_teams.json")

    def get_team_data(self, team_id):
        return self._read_json("team_data.json")

    @staticmethod
    def _read_json(filename):
        path = MOCK_DATA_DIR / filename
        
        with path.open(encoding="utf-8") as file:
            response = json.load(file)

        return response['data']