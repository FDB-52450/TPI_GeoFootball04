# providers/local.py
import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

def get_confederations():
    path = DATA_DIR / "confederations.json"
    
    with path.open(encoding="utf-8") as file:
        return json.load(file)

def get_league_types():
    path = DATA_DIR / "league_types.json"
    
    with path.open(encoding="utf-8") as file:
        return json.load(file)
    

def map_confederations(data):
    return [
        {
            "api_id": code,
            "nombre": details["name"],
            "region": details['region'],
            "logo_url": details.get("logo_url", details.get("logo_URL", "")),
        }
        
        for code, details in data.items()
    ]