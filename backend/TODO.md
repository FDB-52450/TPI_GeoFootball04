# LISTA TODO

## General
- [ ] Agregar documentacion de sistema, variables de entornos y otras cosas (/docs)
- [x] Variables de entorno (.env, settings.py, .gitignore)
- [x] Dependencias del sistema (requirements.txt)

## Catalogo (app)
### Entidades
- [ ] Confederacion
  - [x] Modelo con api_id
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Pais
  - [x] Modelo con api_id (incluye latitud y longitud)
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Competicion
  - [x] Modelo con api_id
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Temporada
  - [x] Modelo con api_id
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Equipo
  - [x] Modelo con api_id
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Estadio
  - [x] Modelo con api_id (incluye latitud y longitud)
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests

### App
- [x] Registrar apps.catalogo en INSTALLED_APPS
- [ ] Incluir apps.catalogo.urls en config/urls.py
- [ ] Registrar modelos en admin.py


## Ingesta de datos (app)
### Flujo de escritura por entidad
- [x] Confederacion
  - [x] Mapper + Sincronización
  - [x] Tests del pipeline con fixture
- [x] Pais
  - [x] Mapper + Sincronización
  - [x] Tests del pipeline con fixture
- [x] Competicion
  - [x] Mapper + Sincronización
  - [x] Tests del pipeline con fixture
- [x] Temporada
  - [x] Mapper + Sincronización
  - [x] Tests del pipeline con fixture
- [x] Equipo
  - [x] Mapper + Sincronización
  - [x] Tests del pipeline con fixture
- [x] Estadio
  - [x] Mapper + Sincronización
  - [x] Tests del pipeline con fixture
- [x] Partido
  - [x] Mapper + Sincronización
  - [x] Tests del pipeline con fixture
- [x] Convocatoria (+ Planilla)
  - [x] Mapper + Sincronización
  - [x] Tests del pipeline con fixture
- [x] Jugador
  - [x] Mapper + Sincronización
  - [x] Tests del pipeline con fixture


### App
- [ ] Cliente HTTP (para cada proveedor)
  - [x] Base + metodos para llamar endpoints
  - [x] Manejo de errores basicos
  - [ ] Manejo de errores avanzado
  - [ ] Tests
- [ ] Tasks de sincronizacion
- [x] Comandos para ejecutar sincronizacion
  - [x] Catalogo
  - [x] Partidos
- [x] Registrar apps.ingest en INSTALLED_APPS
- [x] Fixtures de endpoints (mock data)
- [ ] Logger de ingesta


## Equipos (app)
[WIP]

## Partidos (app)
[WIP]

## Ideas (no comprometidas)
- Cachear tabla de resultados de una temporada de una liga
- Guardar ranking FIFA de un país
- Agregar estadisticas de temporada de jugador (en entidad Planilla)
- Soportar historial de equipos de jugador completo (con ligas sin soporte)
