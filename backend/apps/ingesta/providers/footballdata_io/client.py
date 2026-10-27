import requests
from django.conf import settings

class ApiError(Exception):
    """Error al comunicarse con la API externa."""

class FootballDataIoApiClient:
    def __init__(self, session=None, timeout=10):
        self.base_url = settings.FOOTBALLDATAIO_API_BASE_URL.rstrip("/")
        self.timeout = timeout
        self.session = session or requests.Session()
        self.session.headers.update({"Authorization": f"Bearer {settings.FOOTBALLDATAIO_API_KEY}"})

    def _get(self, path, params = None):
        url = f"{self.base_url}/{path.lstrip('/')}"

        try:
            response = self.session.get(url, params=params, timeout=self.timeout)
        except requests.RequestException as exc:
            raise ApiError(f"Error de red al llamar {url}") from exc

        if response.status_code != 200:
            raise ApiError(f"{response.status_code} en {url}: {response.text[:200]}")
        
        return response.json()['data']

    
    def get_countries(self):
        return self._get("countries")

    def get_leagues(self):
        return self._get("leagues")

    def get_seasons(self, competicion_id):
        return self._get("seasons", params = {"league": competicion_id})

    def get_teams(self, competicion_id, temporada_id):
        # This endpoint is prefered over other simpler endpoints due to actually having all data needed.
        return self._get(f"seasons/{temporada_id}/teams", params = {"league": competicion_id, "limit": 100})

    def get_team_data(self, team_id):
        return self._get(f"teams/{team_id}")