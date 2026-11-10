import { getSeasonLabel } from "../utils/seasonLabel"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"

export type TeamCatalogItem = {
  id: number
  nombre: string
  siglas: string
  escudo_url: string
}

export type TeamSeason = {
  id: number
  periodo: string
  etiqueta: string
  fecha_inicio: string
  fecha_fin: string
}

export type TeamCompetition = {
  id: number
  nombre: string
  tipo: string
  logo_url: string
  temporadas: TeamSeason[]
}

export type TeamStadium = {
  id: number
  nombre: string
  ciudad: string
  capacidad: number | null
  foto_url: string
}

export type TeamPlayer = {
  id: number
  nombre: string
  foto_url: string | null
}

export type TeamDetails = TeamCatalogItem & {
  estadio: TeamStadium | null
  temporadas: TeamSeason[]
  competiciones: TeamCompetition[]
}

export type TeamMatch = {
  id: number
  fecha: string
  estado: string
  minuto_actual: number | null
  semana: number | null
  goles: { local: number | null; visitante: number | null }
  equipos: {
    local: { id: number; nombre: string; imagen: string }
    visitante: { id: number; nombre: string; imagen: string }
  }
  competicion: { id: number; nombre: string; imagen: string }
  temporada: { id: number }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function numberField(value: unknown, field: string): number {
  if (typeof value !== "number") throw new Error(`El campo "${field}" no es válido.`)
  return value
}

function nullableNumberField(value: unknown, field: string): number | null {
  if (value !== null && typeof value !== "number") {
    throw new Error(`El campo "${field}" no es válido.`)
  }
  return value
}

function stringField(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`El campo "${field}" no es válido.`)
  return value
}

function optionalStringField(value: unknown, field: string): string | null {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new Error(`El campo "${field}" no es válido.`)
  }
  return typeof value === "string" ? value : null
}

function recordField(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`El campo "${field}" no es válido.`)
  return value
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`El servidor respondió con HTTP ${response.status}.`)
  return response.json()
}

function mapTeam(value: unknown): TeamCatalogItem {
  const team = recordField(value, "equipo")
  return {
    id: numberField(team.id, "equipo.id"),
    nombre: stringField(team.nombre, "equipo.nombre"),
    siglas: stringField(team.siglas, "equipo.siglas"),
    escudo_url: stringField(team.escudo_url, "equipo.escudo_url"),
  }
}

function mapSeason(value: unknown): TeamSeason {
  const season = recordField(value, "temporada")
  const fechaInicio = stringField(season.fecha_inicio, "temporada.fecha_inicio")
  const fechaFin = stringField(season.fecha_fin, "temporada.fecha_fin")
  const periodo = stringField(season.periodo, "temporada.periodo")

  return {
    id: numberField(season.id, "temporada.id"),
    periodo,
    etiqueta: getSeasonLabel(periodo),
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
  }
}

function mapMatch(value: unknown): TeamMatch {
  const match = recordField(value, "partido")
  const teams = recordField(match.equipos, "partido.equipos")
  const home = recordField(teams.local, "partido.equipos.local")
  const away = recordField(teams.visitante, "partido.equipos.visitante")
  const goals = recordField(match.goles, "partido.goles")
  const competition = recordField(match.competicion, "partido.competicion")
  const season = recordField(match.temporada, "partido.temporada")

  function mapMatchTeam(team: Record<string, unknown>, field: string) {
    return {
      id: numberField(team.id, `${field}.id`),
      nombre: stringField(team.nombre, `${field}.nombre`),
      imagen: stringField(team.imagen, `${field}.imagen`),
    }
  }

  return {
    id: numberField(match.id, "partido.id"),
    fecha: stringField(match.fecha, "partido.fecha"),
    estado: stringField(match.estado, "partido.estado"),
    minuto_actual: nullableNumberField(match.minuto_actual, "partido.minuto_actual"),
    semana: nullableNumberField(match.semana, "partido.semana"),
    goles: {
      local: nullableNumberField(goals.local, "partido.goles.local"),
      visitante: nullableNumberField(goals.visitante, "partido.goles.visitante"),
    },
    equipos: {
      local: mapMatchTeam(home, "partido.equipos.local"),
      visitante: mapMatchTeam(away, "partido.equipos.visitante"),
    },
    competicion: {
      id: numberField(competition.id, "partido.competicion.id"),
      nombre: stringField(competition.nombre, "partido.competicion.nombre"),
      imagen: stringField(competition.imagen, "partido.competicion.imagen"),
    },
    temporada: { id: numberField(season.id, "partido.temporada.id") },
  }
}

export async function fetchTeams(): Promise<TeamCatalogItem[]> {
  const payload = await getJson(`${API_BASE_URL}/api/catalogo/equipos/`)
  if (!isRecord(payload) || !Array.isArray(payload.equipos)) {
    throw new Error("La respuesta no contiene una lista válida de equipos.")
  }
  return payload.equipos.map(mapTeam)
}

export async function fetchTeamDetails(teamId: number): Promise<TeamDetails> {
  const payload = await getJson(`${API_BASE_URL}/api/catalogo/equipos/${teamId}`)
  if (!isRecord(payload) || !isRecord(payload.equipo)) {
    throw new Error("La respuesta no contiene el detalle del equipo.")
  }

  const team = payload.equipo
  if (!Array.isArray(team.temporadas) || !Array.isArray(team.competiciones)) {
    throw new Error("El detalle del equipo no contiene temporadas y competiciones válidas.")
  }

  let stadium: TeamStadium | null = null
  if (team.estadio !== null) {
    const rawStadium = recordField(team.estadio, "equipo.estadio")
    stadium = {
      id: numberField(rawStadium.id, "equipo.estadio.id"),
      nombre: stringField(rawStadium.nombre, "equipo.estadio.nombre"),
      ciudad: stringField(rawStadium.ciudad, "equipo.estadio.ciudad"),
      capacidad: nullableNumberField(rawStadium.capacidad, "equipo.estadio.capacidad"),
      foto_url: stringField(rawStadium.foto_url, "equipo.estadio.foto_url"),
    }
  }

  const competitions = team.competiciones.map((value) => {
    const competition = recordField(value, "equipo.competiciones")
    if (!Array.isArray(competition.temporadas)) {
      throw new Error("La competición del equipo no contiene temporadas válidas.")
    }
    return {
      id: numberField(competition.id, "competicion.id"),
      nombre: stringField(competition.nombre, "competicion.nombre"),
      tipo: stringField(competition.tipo, "competicion.tipo"),
      logo_url: stringField(competition.logo_url, "competicion.logo_url"),
      temporadas: competition.temporadas.map(mapSeason),
    }
  })

  return {
    ...mapTeam(team),
    estadio: stadium,
    temporadas: team.temporadas.map(mapSeason),
    competiciones: competitions,
  }
}

export async function fetchTeamPlayers(teamId: number): Promise<TeamPlayer[]> {
  const params = new URLSearchParams({ equipo_id: String(teamId) })
  const payload = await getJson(
    `${API_BASE_URL}/api/partidos/jugadores/?${params}`,
  )
  if (!isRecord(payload) || !Array.isArray(payload.jugadores)) {
    throw new Error("La respuesta no contiene una lista válida de jugadores.")
  }

  return payload.jugadores.map((value): TeamPlayer => {
    const player = recordField(value, "jugador")
    return {
      id: numberField(player.id, "jugador.id"),
      nombre: stringField(player.nombre, "jugador.nombre"),
      foto_url: optionalStringField(player.foto_url, "jugador.foto_url"),
    }
  })
}

export async function fetchTeamMatches(
  teamId: number,
  seasonId?: number | null,
): Promise<TeamMatch[]> {
  const url = new URL(`${API_BASE_URL}/api/catalogo/equipos/${teamId}/partidos`)
  if (seasonId !== undefined && seasonId !== null) {
    url.searchParams.set("temporada_id", String(seasonId))
  }
  const payload = await getJson(url.toString())
  if (!isRecord(payload) || !Array.isArray(payload.partidos)) {
    throw new Error("La respuesta no contiene una lista válida de partidos.")
  }
  return payload.partidos.map(mapMatch)
}