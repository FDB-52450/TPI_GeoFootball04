import threading
import time
import requests
from django.conf import settings

class ApiError(Exception):
    """Error al comunicarse con la API externa."""

class OpenStreetMapApiClient:
    _rate_limit_lock = threading.Lock()
    _last_request_at = 0.0
    _min_request_interval = 1.0

    def __init__(self, session=None, timeout=10):
        self.base_url = settings.OPENSTREETMAP_API_BASE_URL.rstrip("/")
        self.timeout = timeout
        self.session = session or requests.Session()
        self.session.headers.update({"User-Agent": "GeoFootball/1.0"})

    def _get(self, path, params = None):
        url = f"{self.base_url}/{path.lstrip('/')}"

        try:
            with self._rate_limit_lock:
                elapsed = time.monotonic() - self._last_request_at
                delay = self._min_request_interval - elapsed

                if delay > 0:
                    time.sleep(delay)

                self._last_request_at = time.monotonic()
                response = self.session.get(url, params=params, timeout=self.timeout)
        except requests.RequestException as exc:
            raise ApiError(f"Error de red al llamar {url}") from exc

        if response.status_code != 200:
            raise ApiError(f"{response.status_code} en {url}: {response.text[:200]}")
        
        return response.json()
    
    def get_venue_location(self, venue_name, venue_country = ""):
        return self._get("search", params = {"q": f"{venue_name} {venue_country}", "format": "jsonv2"})