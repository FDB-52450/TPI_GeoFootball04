$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$proyecto = "config"   # nombre de la carpeta con settings.py
$venv     = ".\venv\Scripts\Activate.ps1"   # ajusta si tu venv tiene otro nombre

# 1. Redis (Docker)
docker compose up -d redis

# Espera a que Redis responda
$listo = $false
for ($i = 0; $i -lt 15 -and -not $listo; $i++) {
    $respuesta = docker compose exec -T redis redis-cli ping 2>$null
    if ($respuesta -match "PONG") { $listo = $true } else { Start-Sleep -Seconds 1 }
}
if (-not $listo) { throw "Redis no responde. Revisa Docker Desktop." }
Write-Host "Redis listo" -ForegroundColor Green

# 2. Worker en una ventana nueva
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "& '$venv'; celery -A $proyecto worker --pool=solo -l info"

# 3. Beat en otra ventana nueva
Start-Process powershell -ArgumentList "-NoExit", "-Command",
    "& '$venv'; celery -A $proyecto beat -l info"

Write-Host "Worker y Beat iniciados en ventanas separadas." -ForegroundColor Green