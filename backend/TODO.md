# LISTA TODO

## General
- [ ] Agregar documentacion de sistema, variables de entornos y otras cosas (/docs)
- [x] Variables de entorno (.env, settings.py, .gitignore)
- [x] Dependencias del sistema (requirements.txt)

## Catalogo (app)
### Entidades
- [ ] Confederacion
  - [ ] Modelo con api_id
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Pais
  - [ ] Modelo con api_id (incluye latitud y longitud)
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Competicion
  - [ ] Modelo con api_id
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Temporada
  - [ ] Modelo con api_id
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Equipo
  - [ ] Modelo con api_id
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Estadio
  - [ ] Modelo con api_id (incluye latitud y longitud)
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests

### App
- [x] Registrar apps.catalogo en INSTALLED_APPS
- [ ] Incluir apps.catalogo.urls en config/urls.py
- [ ] Registrar modelos en admin.py


## Ingesta de datos (app)
### Flujo de escritura por entidad
- [ ] Confederacion
  - [ ] Mapper + Sincronización
  - [ ] Tests del pipeline con fixture
- [ ] Pais
  - [ ] Mapper + Sincronización
  - [ ] Tests del pipeline con fixture
- [ ] Competicion
  - [ ] Mapper + Sincronización
  - [ ] Tests del pipeline con fixture
- [ ] Temporada
  - [ ] Mapper + Sincronización
  - [ ] Tests del pipeline con fixture
- [ ] Equipo
  - [ ] Mapper + Sincronización
  - [ ] Tests del pipeline con fixture
- [ ] Estadio
  - [ ] Mapper + Sincronización
  - [ ] Tests del pipeline con fixture

### App
- [ ] Cliente HTTP (con manejo de errores)
  - [ ] Tests (manejo de errores)
- [ ] Punto de entrada de sincronización (comando y/o task periódica, en orden de dependencia)
- [ ] Registrar apps.ingest en INSTALLED_APPS
- [ ] Fixtures de endpoints (mock data)
- [ ] Logger de ingesta


## Equipos (app)
[WIP]

## Partidos (app)
[WIP]

## Ideas (no comprometidas)
- Cachear tabla de resultados de una temporada de una liga
- Guardar ranking FIFA de un país
