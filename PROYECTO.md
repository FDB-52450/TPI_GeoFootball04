# GeoFootball
## Descripción del proyecto
### *Visualización Interactiva de Partidos de Fútbol en Tiempo Real*

**GeoFootball** es una plataforma web interactiva diseñada para transformar la manera en que los aficionados interactúan con la información futbolística global. A través de un mapa interactivo alimentado por datos geoespaciales y servicios en tiempo real, la aplicación permite explorar el desarrollo de encuentros deportivos, la ubicación física de los estadios, las ligas nacionales e internacionales, y los detalles tácticos de cada partido en un entorno visual fluido.


**ALCANCE DEL PROYECTO**

**Dentro del alcance:**

El sistema utilizara una interfaz de mapa, con limites geográficos de países y ubicación exacta de estadios mediante archivos GeoJSON y coordenadas espaciales, permitiendo filtrar por país, confederación (UEFA, CONMEBOL) o competición activa.

Todos los datos de tiempo real, como partidos, eventos y jugadores serán obtenidos mediante integraciones con APIs externas, las cuales serán gestionadas por el sistema mediante uso de valores de frequencias de llamadas para evitar limite de peticiones.

Usando todos los datos recopilados, el sistema generara varias estadísticas sobre países, competencias, jugadores y mas, las cuales podrán ser accedidas mediante sus respectivos perfiles.

**Fuera del alcance:**

Debido a limitaciones con la cantidad de llamadas diarias a la API en el plan gratis el sistema funcionara mas como una prueba de concepto, teniendo un atraso en los resultados en tiempo real y no funcionando correctamente a mayor demanda de usuarios.

Para mantener la escala del proyecto razonable, no se implementara una forma de visualizar las llaves de una competicion tipo copa.

Por ultimo, el sistema no contara con soporte para el registro y/o uso de usuarios, siendo una posible función a añadir en una futura iteración del mismo.

**OBJETIVOS PRINCIPALES**

1. **Ofrecer una experiencia única y completa que permita a sus usuarios tanto encontrar partidos en vivo como descubrir nuevas ligas y equipos.**
2. **Implementar una gestión eficiente de los recursos del sistema y de la API.**
3. **Construir un modelo de backend limpio y modular para facilitar tanto el arreglo de bugs como la implementación de nuevas funcionalidades.**
4. **Garantizar la fiabilidad y respuesta contra errores del sistema, tanto en el backend como en el frontend.**

## Modelo de Dominio
![Modelo de Dominio](ModeloDominio.svg)

## Bosquejo de Arquitectura [WIP]
**[AGREGAR IMAGEN DE ARQUITECTURA AQUI]**

## Requerimientos
### Funcionales

| ID   | Modulo       | Descripción |
| ---- | -------      | ----------- |
| RF01 | Mapa         | Renderizar mapa interactivo mundial, con contornos geográficos de países y ubicaciones geográficas de estadios
| RF02 | Mapa         | Permitir filtrar los partidos y estadios visibles por país, confederación o competición
| RF03 | Partidos     | Mostrar el listado de todos los partidos recientes (terminados, en juego y próximos), con sus respectivos marcadores, tiempo de juego y equipos 
| RF04 | Partidos     | Exhibir la cronología de eventos clase en un partido, tales como goles, tarjetas rojas/amarillas, sustituciones y mas
| RF05 | Partidos     | Graficar la alineación táctica de ambos equipos, mostrando los jugadores del once titular y sus posiciones junto con todos los suplentes
| RF06 | Estadísticas | Ofrecer una vista detallada de cada equipo y sus datos, incluyendo su estadio sede (con foto), competencias que disputa y partidos recientes
| RF07 | Estadísticas | Mostrar la tabla de posiciones actualizada (puntos, partidos jugados y más) para las competiciones de formato liga, junto con sus partidos recientes
| RF08 | Estadísticas | Mostrar la ficha técnica de un jugador con sus datos personales (edad, dorsal, posición) y estadísticas acumuladas por temporada
| RF09 | Estadísticas | Exhibir una vista básica sobre los paisas y confederaciones, mostrando competiciones pertenecientes a las mismas
| RF10 | Datos        | Consumir información deportiva en tiempo real a través de endpoints de una API externa.
| RF11 | Datos        | Permitir consultar resultados de partidos finalizados y calendarios de encuentros próximos.

### No Funcionales

| ID    | Categoría      | Descripción |
| ----- | -------        | ----------- |
| RNF01 | Portabilidad   | El sistema debe funcionar en múltiples navegadores
| RNF02 | Portabilidad   | El sistema funcionara tanto en pestañas normales como incognito
| RNF03 | Portabilidad   | El sistema se desplegará mediante Docker
| RNF04 | Seguridad      | El token usado pará la API estara almacenada en una variable de entorno
| RNF05 | Mantenibilidad | El sistema estará diseñado con una arquitectura de 3 capas.
| RNF06 | Mantenibilidad | El sistema estará programado en Python 3.8 o superior.
| RNF07 | Mantenibilidad | El sistema utilizara GIT para el control de versión.
| RNF08 | Confiabilidad  | El frontend utilizara pantallas de errores en casos de fallos para informar al usuario
| RNF09 | Confiabilidad  | En caso de un fallo en una llamada a la API, se intentará dos veces más antes de retornar un error
| RNF10 | Rendimiento    | El sistema debe funcionar en un equipo hogareño estándar
| RNF11 | Rendimiento    | El mapa del globo no tardara más de 10 segundos en cargar
| RNF12 | Rendimiento    | Las llamadas a API no deben tardar más de 5 segundos en devolver un resultado
| RNF13 | Reusabilidad   | Toda coordenada geográfica debe ser representada por el mismo objeto
| RNF14 | Reusabilidad   | Todo error común debe ser representado por el mismo objeto
| RNF15 | Flexibilidad   | La gestión de las llamadas a API y sus respuestas deben ser manejadas por una interfaz
| RNF16 | Flexibilidad   | Varios parámetros del sistema, como la frecuencia de llamadas a API, deben ser configurables con variables de entorno
| RNF17 | Flexibilidad   | El diseño del backend debe ser modular para permitir la incorporación de nueva funcionalidad sin modificar el resto

## Stack Tecnológico [WIP]

### Capa de datos
- **SQLite:** Motor de base de datos predeterminado de Django
- **Django ORM:** Libreria ORM predeterminada de Django

### Capa de Negocio

- **Python:** Motor de código de todo el backend, su uso es obligatorio.
- **Django (https://www.djangoproject.com/):** Framework web, elegido por ser robusto y tener varios modulos utiles (ej. panel de admin) ya integrados.

- **APIs:**
  - **Footballdata.io (https://footballdata.io/):** Fuente de datos de partidos en tiempo real.
  - **API-Football.com (https://www.api-football.com/):** Fuente de datos detallados de equipos.
  - **OpenStreetMap (https://www.openstreetmap.org):** Fuente de datos de ubicacion (latitud y longitud) de estadios de equipos.

### Capa de Presentación [WIP]

- **Vite (https://main.vite.dev/):** Herramienta de desarrollo y empaquetado (Build Tool)
- **React (https://react.dev/):** Libreria de interfaz
- **[A DEFINIR]:** Libreria de componentes de UI