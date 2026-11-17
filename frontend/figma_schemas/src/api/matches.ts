const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "")

export type Match = {
  id: number
  date: string
  status: string
  minute: number | null
  home: { id: number; name: string; image: string }
  away: { id: number; name: string; image: string }
  competition: {
    id: number
    name: string
    image: string
    country: { id: number; name: string }
  }
  score: { home: number | null; away: number | null }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function recordField(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`El campo "${field}" no es válido.`)
  return value
}

function numberField(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`El campo "${field}" no es válido.`)
  }
  return value
}

function nullableNumberField(value: unknown, field: string): number | null {
  if (
    value !== null &&
    (typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new Error(`El campo "${field}" no es válido.`)
  }
  return value
}

function stringField(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`El campo "${field}" no es válido.`)
  }
  return value
}

async function getMatches(url: string): Promise<Match[]> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`El servidor respondió con HTTP ${response.status}.`)
  }

  const payload: unknown = await response.json()
  if (!isRecord(payload) || !Array.isArray(payload.partidos)) {
    throw new Error("La respuesta no contiene una lista válida de partidos.")
  }

  return payload.partidos.map(mapMatch)
}

function mapMatch(value: unknown): Match {
  const match = recordField(value, "partido")
  const teams = recordField(match.equipos, "partido.equipos")
  const home = recordField(teams.local, "partido.equipos.local")
  const away = recordField(teams.visitante, "partido.equipos.visitante")
  const competition = recordField(match.competicion, "partido.competicion")
  const country = recordField(competition.pais, "partido.competicion.pais")
  const score = recordField(match.goles, "partido.goles")

  function mapTeam(team: Record<string, unknown>, field: string) {
    return {
      id: numberField(team.id, `${field}.id`),
      name: stringField(team.nombre, `${field}.nombre`),
      image: stringField(team.imagen, `${field}.imagen`),
    }
  }

  return {
    id: numberField(match.id, "partido.id"),
    date: stringField(match.fecha, "partido.fecha"),
    status: stringField(match.estado, "partido.estado"),
    minute: nullableNumberField(match.minuto_actual, "partido.minuto_actual"),
    home: mapTeam(home, "partido.equipos.local"),
    away: mapTeam(away, "partido.equipos.visitante"),
    competition: {
      id: numberField(competition.id, "partido.competicion.id"),
      name: stringField(competition.nombre, "partido.competicion.nombre"),
      image: stringField(competition.imagen, "partido.competicion.imagen"),
      country: {
        id: numberField(country.id, "partido.competicion.pais.id"),
        name: stringField(country.nombre, "partido.competicion.pais.nombre"),
      },
    },
    score: {
      home: nullableNumberField(score.local, "partido.goles.local"),
      away: nullableNumberField(score.visitante, "partido.goles.visitante"),
    },
  }
}

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function getUpcomingMatchDateRange(today = new Date()) {
  const firstDay = new Date(today)
  firstDay.setHours(0, 0, 0, 0)
  firstDay.setDate(firstDay.getDate() + 1)

  const lastDay = new Date(firstDay)
  lastDay.setDate(lastDay.getDate() + 7)

  return {
    fechaDesde: localDateKey(firstDay),
    fechaHasta: localDateKey(lastDay),
  }
}

export function fetchTodayMatches(): Promise<Match[]> {
  return getMatches(`${API_BASE_URL}/api/partidos/partidos/?today=True`)
}

export function fetchUpcomingMatches(): Promise<Match[]> {
  const { fechaDesde, fechaHasta } = getUpcomingMatchDateRange()
  const params = new URLSearchParams({
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    count: '10'
  })
  return getMatches(`${API_BASE_URL}/api/partidos/partidos/?${params}`)
}
