# start-all.ps1 (raíz del proyecto)
$ErrorActionPreference = "Stop"
$raiz = $PSScriptRoot
$backend = Join-Path $raiz "backend"
$frontend = Join-Path $raiz "frontend\figma_schemas"

# 1. Redis + Celery (script existente, en su propia ventana)
$scriptRedis = Join-Path $backend "start-dev.ps1"
Start-Process powershell -WorkingDirectory $backend -ArgumentList (
    '-NoExit -ExecutionPolicy Bypass -File "{0}"' -f $scriptRedis
)

# Darle tiempo a Redis antes de que Django y Celery lo necesiten
Start-Sleep -Seconds 3

# 2. Backend: Django
Start-Process powershell -WorkingDirectory $backend -ArgumentList (
    '-NoExit -Command "python manage.py runserver"'
)

# 3. Frontend: Vite/Next/lo que uses
Start-Process powershell -WorkingDirectory $frontend -ArgumentList (
    '-NoExit -Command "npm run dev"'
)