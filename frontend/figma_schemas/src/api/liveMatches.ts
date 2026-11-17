const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "")

export type LiveMatch = {
  id: number
  status: string
  minute: number | null
  date: string
  home: { id: number; name: string }
  away: { id: number; name: string }
  competition: { id: number; name: string }
  score: { home: number | null; away: number | null }
  stadium: {
    name: string
    latitude: number | null
    longitude: number | null
  }
}

export type LiveConfederation = {
  id: number
  name: string
}

export type LiveCompetition = {
  id: number
  name: string
  confederation: LiveConfederation
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
  if (typeof value !== "string")
    throw new Error(`El campo "${field}" no es válido.`)
  return value
}
async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`El servidor respondió con HTTP ${response.status}.`)
  }
  return response.json()
}
function mapMatch(value: unknown): LiveMatch {
  const match = recordField(value, "partido")
  const teams = recordField(match.equipos, "partido.equipos")
  const home = recordField(teams.local, "partido.equipos.local")
  const away = recordField(teams.visitante, "partido.equipos.visitante")
  const competition = recordField(match.competicion, "partido.competicion")
  const score = recordField(match.goles, "partido.goles")
  const stadium = recordField(match.estadio, "partido.estadio")
  return {
    id: numberField(match.id, "partido.id"),
    status: stringField(match.estado, "partido.estado"),
    minute: nullableNumberField(match.minuto_actual, "partido.minuto_actual"),
    date: stringField(match.fecha, "partido.fecha"),
    home: {
      id: numberField(home.id, "partido.equipos.local.id"),
      name: stringField(home.nombre, "partido.equipos.local.nombre"),
    },
    away: {
      id: numberField(away.id, "partido.equipos.visitante.id"),
      name: stringField(away.nombre, "partido.equipos.visitante.nombre"),
    },
    competition: {
      id: numberField(competition.id, "partido.competicion.id"),
      name: stringField(competition.nombre, "partido.competicion.nombre"),
    },
    score: {
      home: nullableNumberField(score.local, "partido.goles.local"),
      away: nullableNumberField(score.visitante, "partido.goles.visitante"),
    },
    stadium: {
      name: stringField(stadium.nombre, "partido.estadio.nombre"),
      latitude: nullableNumberField(stadium.latitud, "partido.estadio.latitud"),
      longitude: nullableNumberField(
        stadium.longitud,
        "partido.estadio.longitud",
      ),
    },
  }
}

export async function fetchLiveMatches(): Promise<LiveMatch[]> {
  const payload = await getJson(
    `${API_BASE_URL}/api/partidos/partidos/?today=true`,
  )
  if (!isRecord(payload) || !Array.isArray(payload.partidos)) {
    throw new Error("La respuesta no contiene una lista válida de partidos.")
  }
  return payload.partidos
    .map(mapMatch)
    .filter((match) => match.status === "EN_JUEGO")
}
function mapConfederation(value: unknown): LiveConfederation {
  const confederation = recordField(value, "confederacion")
  return {
    id: numberField(confederation.id, "confederacion.id"),
    name: stringField(confederation.nombre, "confederacion.nombre"),
  }
}

export async function fetchLiveCatalog(): Promise<{
  confederations: LiveConfederation[]
  competitions: LiveCompetition[]
}> {
  const payload = await getJson(`${API_BASE_URL}/api/catalogo/confederaciones/`)
  if (!isRecord(payload) || !Array.isArray(payload.confederaciones)) {
    throw new Error(
      "La respuesta no contiene una lista válida de confederaciones.",
    )
  }
  const confederations = payload.confederaciones.map(mapConfederation)
  const details = await Promise.all(
    confederations.map(async (confederation) => {
      const detailPayload = await getJson(
        `${API_BASE_URL}/api/catalogo/confederaciones/${confederation.id}/`,
      )
      if (!isRecord(detailPayload) || !isRecord(detailPayload.confederacion)) {
        throw new Error(
          `No se pudieron leer las competiciones de ${confederation.name}.`,
        )
      }
      const detail = detailPayload.confederacion
      if (!Array.isArray(detail.competiciones)) {
        throw new Error(
          `La respuesta de ${confederation.name} no incluye una lista de competiciones.`,
        )
      }
      return detail.competiciones.map((value): LiveCompetition => {
        const competition = recordField(value, "competicion")
        return {
          id: numberField(competition.id, "competicion.id"),
          name: stringField(competition.nombre, "competicion.nombre"),
          confederation,
        }
      })
    }),
  )
  const competitionsById = new Map<number, LiveCompetition>()
  for (const competition of details.flat()) {
    competitionsById.set(competition.id, competition)
  }
  return {
    confederations,
    competitions: [...competitionsById.values()].sort((first, second) =>
      first.name.localeCompare(second.name),
    ),
  }
}
