# LISTA TODO

## General
- [ ] Agregar documentacion de sistema, variables de entornos y otras cosas (/docs)
- [x] Variables de entorno (.env, settings.py, .gitignore)
- [x] Dependencias del sistema (requirements.txt)
- [ ] (BORRAR) AJUSTAR MULTIPLICIDAD ENTRE ESTADIO Y EQUIPO (0..*, EJ. WEMBLEY)

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
- [ ] Equipo
  - [x] Mapper + Sincronización
  - [ ] Tests del pipeline con fixture
- [ ] Estadio
  - [x] Mapper + Sincronización
  - [ ] Tests del pipeline con fixture

### App
- [ ] Cliente HTTP (para cada proveedor)
  - [x] Base + metodos para llamar endpoints
  - [x] Manejo de errores basicos
  - [ ] Manejo de erroes avanzado
  - [ ] Tests
- [ ] Tasks de sincronizacion
- [ ] Comandos para ejecutar sincronizacion
  - [x] Catalogo
  - [ ] Equipos
  - [ ] Partidos
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
