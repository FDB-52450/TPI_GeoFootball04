import json
from pathlib import Path

MOCK_DATA_DIR = Path(__file__).resolve().parents[0] / "mock-data"

class MockProvider:
    def get_team_data(self, team_name, country_name):
        return self._read_json("team_data.json")

    @staticmethod
    def _read_json(filename):
        path = MOCK_DATA_DIR / filename
        
        with path.open(encoding="utf-8") as file:
            response = json.load(file)

        return response['response']