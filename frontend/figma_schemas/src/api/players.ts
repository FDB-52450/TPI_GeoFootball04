const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}/api/partidos`

export type PlayerCatalogItem = {
  id: number
  nombre: string
  foto_url: string
}

export type PlayerCompetition = {
  id: number
  nombre: string
  logo_url: string
}

export type PlayerPerformance = {
  competicion: PlayerCompetition
  temporada: { id: number; periodo: string }
  partidos: number
  minutos: number
  goles: number
  "min/gol": number | null
}

export type PlayerClub = {
  equipo: { id: number; nombre: string; escudo_url: string }
  fecha_desde: string
  fecha_hasta: string
  partidos: number
  goles: number
}

export type PlayerRecentMatch = {
  fecha: string
  competicion: PlayerCompetition
  temporada: { id: number; periodo: string }
  equipo_jugador: { id: number; nombre: string; escudo_url: string }
  equipo_rival: { id: number; nombre: string; escudo_url: string }
  marcador: { equipo_jugador: number | null; equipo_rival: number | null }
  minutos: number
  goles: number
}

export type PlayerDetails = PlayerCatalogItem & {
  apodo: string
  fecha_nacimiento: string | null
  altura: number | null
  peso: number | null
  pais: { id: number; nombre: string; bandera_url: string } | null
  datos_rendimiento: PlayerPerformance[]
  historial_clubes: PlayerClub[]
  ultimos_partidos: PlayerRecentMatch[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function recordField(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`El campo "${field}" de la API no es válido.`)
  return value
}

function numberField(value: unknown, field: string): number {
  if (typeof value !== "number") throw new Error(`El campo "${field}" de la API no es válido.`)
  return value
}

function nullableNumberField(value: unknown, field: string): number | null {
  if (value !== null && typeof value !== "number") {
    throw new Error(`El campo "${field}" de la API no es válido.`)
  }
  return value
}

function stringField(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`El campo "${field}" de la API no es válido.`)
  return value
}

function nullableStringField(value: unknown, field: string): string | null {
  if (value !== null && typeof value !== "string") {
    throw new Error(`El campo "${field}" de la API no es válido.`)
  }
  return value
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`El servidor respondió con HTTP ${response.status}.`)
  return response.json()
}

function mapCatalogPlayer(value: unknown): PlayerCatalogItem {
  const player = recordField(value, "jugador")
  return {
    id: numberField(player.id, "jugador.id"),
    nombre: stringField(player.nombre, "jugador.nombre"),
    foto_url: stringField(player.foto_url, "jugador.foto_url"),
  }
}

function mapCompetition(value: unknown): PlayerCompetition {
  const competition = recordField(value, "competicion")
  return {
    id: numberField(competition.id, "competicion.id"),
    nombre: stringField(competition.nombre, "competicion.nombre"),
    logo_url: stringField(competition.logo_url, "competicion.logo_url"),
  }
}

export async function fetchPlayers(): Promise<PlayerCatalogItem[]> {
  const payload = await getJson(`${API_BASE_URL}/jugadores/`)
  if (!isRecord(payload) || !Array.isArray(payload.jugadores)) {
    throw new Error("La respuesta no contiene una lista válida de jugadores.")
  }
  return payload.jugadores.map(mapCatalogPlayer)
}

export async function fetchPlayerDetails(playerId: number): Promise<PlayerDetails> {
  const payload = await getJson(`${API_BASE_URL}/jugadores/${playerId}`)
  if (!isRecord(payload) || !isRecord(payload.jugador)) {
    throw new Error("La respuesta no contiene el detalle del jugador.")
  }
  const player = payload.jugador
  if (
    !Array.isArray(player.datos_rendimiento) ||
    !Array.isArray(player.historial_clubes) ||
    !Array.isArray(player.ultimos_partidos)
  ) {
    throw new Error("El detalle del jugador tiene listas inválidas.")
  }

  let country: PlayerDetails["pais"] = null
  if (player.pais !== null) {
    const rawCountry = recordField(player.pais, "jugador.pais")
    country = {
      id: numberField(rawCountry.id, "pais.id"),
      nombre: stringField(rawCountry.nombre, "pais.nombre"),
      bandera_url: stringField(rawCountry.bandera_url, "pais.bandera_url"),
    }
  }

  const performances = player.datos_rendimiento.map((value): PlayerPerformance => {
    const performance = recordField(value, "datos_rendimiento")
    const season = recordField(performance.temporada, "temporada")
    return {
      competicion: mapCompetition(performance.competicion),
      temporada: {
        id: numberField(season.id, "temporada.id"),
        periodo: stringField(season.periodo, "temporada.periodo"),
      },
      partidos: numberField(performance.partidos, "rendimiento.partidos"),
      minutos: numberField(performance.minutos, "rendimiento.minutos"),
      goles: numberField(performance.goles, "rendimiento.goles"),
      "min/gol": nullableNumberField(performance["min/gol"], "rendimiento.min/gol"),
    }
  })

  const clubs = player.historial_clubes.map((value): PlayerClub => {
    const club = recordField(value, "historial_clubes")
    const team = recordField(club.equipo, "historial_clubes.equipo")
    return {
      equipo: {
        id: numberField(team.id, "equipo.id"),
        nombre: stringField(team.nombre, "equipo.nombre"),
        escudo_url: stringField(team.escudo_url, "equipo.escudo_url"),
      },
      fecha_desde: stringField(club.fecha_desde, "club.fecha_desde"),
      fecha_hasta: stringField(club.fecha_hasta, "club.fecha_hasta"),
      partidos: numberField(club.partidos, "club.partidos"),
      goles: numberField(club.goles, "club.goles"),
    }
  })

  const recentMatches = player.ultimos_partidos.map((value): PlayerRecentMatch => {
    const match = recordField(value, "ultimos_partidos")
    const season = recordField(match.temporada, "temporada")
    const score = recordField(match.marcador, "partido.marcador")
    const mapTeam = (teamValue: unknown, field: string) => {
      const team = recordField(teamValue, field)
      return {
        id: numberField(team.id, `${field}.id`),
        nombre: stringField(team.nombre, `${field}.nombre`),
        escudo_url: stringField(team.escudo_url, `${field}.escudo_url`),
      }
    }
    return {
      fecha: stringField(match.fecha, "partido.fecha"),
      competicion: mapCompetition(match.competicion),
      temporada: {
        id: numberField(season.id, "temporada.id"),
        periodo: stringField(season.periodo, "temporada.periodo"),
      },
      equipo_jugador: mapTeam(match.equipo_jugador, "equipo_jugador"),
      equipo_rival: mapTeam(match.equipo_rival, "equipo_rival"),
      marcador: {
        equipo_jugador: nullableNumberField(
          score.equipo_jugador,
          "partido.marcador.equipo_jugador",
        ),
        equipo_rival: nullableNumberField(
          score.equipo_rival,
          "partido.marcador.equipo_rival",
        ),
      },
      minutos: numberField(match.minutos, "partido.minutos"),
      goles: numberField(match.goles, "partido.goles"),
    }
  })

  return {
    ...mapCatalogPlayer(player),
    apodo: stringField(player.apodo, "jugador.apodo"),
    fecha_nacimiento: nullableStringField(player.fecha_nacimiento, "jugador.fecha_nacimiento"),
    altura: nullableNumberField(player.altura, "jugador.altura"),
    peso: nullableNumberField(player.peso, "jugador.peso"),
    pais: country,
    datos_rendimiento: performances,
    historial_clubes: clubs,
    ultimos_partidos: recentMatches,
  }
}
