# LISTA TODO

## General
- [ ] Agregar documentacion de sistema, variables de entornos y otras cosas (/docs)
- [x] Variables de entorno (.env, settings.py, .gitignore)
- [x] Dependencias del sistema (requirements.txt)

## Catalogo (app)
### Entidades
- [ ] Confederacion
  - [x] Modelo con api_id
  - [x] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Pais
  - [x] Modelo con api_id (incluye latitud y longitud)
  - [x] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Competicion
  - [x] Modelo con api_id
  - [x] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Temporada
  - [x] Modelo con api_id
  - [x] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Equipo
  - [x] Modelo con api_id
  - [x] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Estadio
  - [x] Modelo con api_id (incluye latitud y longitud)
  - [ ] Tests

### App
- [x] Registrar apps.catalogo en INSTALLED_APPS
- [x] Incluir apps.catalogo.urls en config/urls.py
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


## Partidos (app)
- [ ] Partidos
  - [x] Modelo con api_id
  - [x] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests
- [ ] Jugador
  - [x] Modelo con api_id (incluye latitud y longitud)
  - [ ] Endpoint de lectura (urls → view → service → respuesta)
  - [ ] Tests

### App
- [x] Registrar apps.partidos en INSTALLED_APPS
- [x] Incluir apps.partidos.urls en config/urls.py
- [ ] Registrar modelos en admin.py


## Ideas (no comprometidas)
- Cachear tabla de resultados de una temporada de una liga **[ESTADO: RECHAZADA]**
  - Razón: El calculo es rapido, por lo que cachearlo no es necesario
- Guardar ranking FIFA de un país **[ESTADO: RECHAZADA]**
  - Razón: Requiere endpoint de pago en API
- Agregar estadisticas de temporada de jugador (en entidad Planilla)
- Soportar historial de equipos de jugador completo (con ligas sin soporte)
