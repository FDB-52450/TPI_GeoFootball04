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

export type MatchStatistics = {
  xg: number | null
  xg_prematch: number | null
  tiros_total: number | null
  tiros_a_puerta: number | null
  tiros_fuera: number | null
  posesion: number | null
  corners: number | null
  offsides: number | null
  tarjetas_amarillas: number | null
  tarjetas_rojas: number | null
  faltas: number | null
  ataques: number | null
  ataques_peligrosos: number | null
}

export type MatchPlayer = {
  id: number
  name: string
  nickname: string | null
  image: string | null
}

export type MatchLineupEntry = {
  player: MatchPlayer | null
  starter: boolean
  number: number | null
  position: string
  minuteIn: number | null
  minuteOut: number | null
}

export type MatchEvent = {
  id: number
  type: string
  typeCode: string
  minute: number
  player: MatchPlayer | null
  playerOut: MatchPlayer | null
}

export type MatchDetails = {
  id: number
  date: string
  status: string
  minute: number | null
  week: number | null
  home: Match["home"]
  away: Match["away"]
  competition: Omit<Match["competition"], "country">
  season: {
    id: number
    periodo: string
  }
  score: Match["score"]
  statistics: {
    home: MatchStatistics | null
    away: MatchStatistics | null
  }
  lineups: {
    home: MatchLineupEntry[]
    away: MatchLineupEntry[]
  }
  events: MatchEvent[]
  stadium: {
    name: string | null
    latitude: number | null
    longitude: number | null
  }
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

function numericField(value: unknown, field: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  throw new Error(`El campo "${field}" no es válido.`)
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

function nullableNumericField(value: unknown, field: string): number | null {
  return value === null ? null : numericField(value, field)
}

function stringField(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`El campo "${field}" no es válido.`)
  }
  return value
}

function nullableStringField(value: unknown, field: string): string | null {
  if (value !== null && typeof value !== "string") {
    throw new Error(`El campo "${field}" no es válido.`)
  }
  return value
}

function mapMatchPlayer(value: unknown, field: string): MatchPlayer | null {
  if (value === null) return null
  const player = recordField(value, field)
  return {
    id: numberField(player.id, `${field}.id`),
    name: stringField(player.nombre, `${field}.nombre`),
    nickname: nullableStringField(player.apodo, `${field}.apodo`),
    image: nullableStringField(player.imagen, `${field}.imagen`),
  }
}

function mapLineup(value: unknown, side: string): MatchLineupEntry[] {
  if (!Array.isArray(value)) {
    throw new Error(`La alineación ${side} del partido no es válida.`)
  }
  return value.map((item, index) => {
    const entry = recordField(item, `partido.convocatorias.${side}[${index}]`)
    if (typeof entry.titular !== "boolean") {
      throw new Error(`El campo titular de la alineación ${side} no es válido.`)
    }
    return {
      player: mapMatchPlayer(
        entry.jugador,
        `partido.convocatorias.${side}[${index}].jugador`,
      ),
      starter: entry.titular,
      number: nullableNumberField(
        entry.dorsal,
        `partido.convocatorias.${side}[${index}].dorsal`,
      ),
      position: stringField(
        entry.posicion,
        `partido.convocatorias.${side}[${index}].posicion`,
      ),
      minuteIn: nullableNumberField(
        entry.min_entrada,
        `partido.convocatorias.${side}[${index}].min_entrada`,
      ),
      minuteOut: nullableNumberField(
        entry.min_salida,
        `partido.convocatorias.${side}[${index}].min_salida`,
      ),
    }
  })
}

function mapMatchEvent(value: unknown, index: number): MatchEvent {
  const event = recordField(value, `partido.eventos[${index}]`)
  return {
    id: numberField(event.id, `partido.eventos[${index}].id`),
    type: stringField(event.tipo, `partido.eventos[${index}].tipo`),
    typeCode: stringField(event.tipo_codigo, `partido.eventos[${index}].tipo_codigo`),
    minute: numberField(event.minuto, `partido.eventos[${index}].minuto`),
    player: mapMatchPlayer(
      event.jugador,
      `partido.eventos[${index}].jugador`,
    ),
    playerOut: mapMatchPlayer(
      event.jugador_sale,
      `partido.eventos[${index}].jugador_sale`,
    ),
  }
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

function mapTeam(team: Record<string, unknown>, field: string) {
  return {
    id: numberField(team.id, `${field}.id`),
    name: stringField(team.nombre, `${field}.nombre`),
    image: stringField(team.imagen, `${field}.imagen`),
  }
}

function mapMatchStatistics(
  value: unknown,
  field: string,
): MatchStatistics | null {
  if (value === null) return null
  const statistics = recordField(value, field)
  const nullableStat = (key: keyof MatchStatistics) =>
    nullableNumericField(statistics[key], `${field}.${key}`)

  return {
    xg: nullableStat("xg"),
    xg_prematch: nullableStat("xg_prematch"),
    tiros_total: nullableStat("tiros_total"),
    tiros_a_puerta: nullableStat("tiros_a_puerta"),
    tiros_fuera: nullableStat("tiros_fuera"),
    posesion: nullableStat("posesion"),
    corners: nullableStat("corners"),
    offsides: nullableStat("offsides"),
    tarjetas_amarillas: nullableStat("tarjetas_amarillas"),
    tarjetas_rojas: nullableStat("tarjetas_rojas"),
    faltas: nullableStat("faltas"),
    ataques: nullableStat("ataques"),
    ataques_peligrosos: nullableStat("ataques_peligrosos"),
  }
}

function mapMatchDetails(value: unknown): MatchDetails {
  const match = recordField(value, "partido")
  const teams = recordField(match.equipos, "partido.equipos")
  const home = recordField(teams.local, "partido.equipos.local")
  const away = recordField(teams.visitante, "partido.equipos.visitante")
  const competition = recordField(match.competicion, "partido.competicion")
  const season = recordField(match.temporada, "partido.temporada")
  const score = recordField(match.goles, "partido.goles")
  const statistics = recordField(match.estadisticas, "partido.estadisticas")
  const lineups = recordField(match.convocatorias, "partido.convocatorias")
  const stadium = recordField(match.estadio, "partido.estadio")

  if (!Array.isArray(match.eventos)) {
    throw new Error("La respuesta no contiene una lista válida de eventos.")
  }

  return {
    id: numberField(match.id, "partido.id"),
    date: stringField(match.fecha, "partido.fecha"),
    status: stringField(match.estado, "partido.estado"),
    minute: nullableNumberField(match.minuto_actual, "partido.minuto_actual"),
    week: nullableNumberField(match.semana, "partido.semana"),
    home: mapTeam(home, "partido.equipos.local"),
    away: mapTeam(away, "partido.equipos.visitante"),
    competition: {
      id: numberField(competition.id, "partido.competicion.id"),
      name: stringField(competition.nombre, "partido.competicion.nombre"),
      image: stringField(competition.imagen, "partido.competicion.imagen"),
    },
      season: {
        id: numberField(season.id, "partido.temporada.id"),
        periodo: stringField(season.periodo, "partido.temporada.periodo")
    },
    score: {
      home: nullableNumberField(score.local, "partido.goles.local"),
      away: nullableNumberField(score.visitante, "partido.goles.visitante"),
    },
    statistics: {
      home: mapMatchStatistics(statistics.local, "partido.estadisticas.local"),
      away: mapMatchStatistics(
        statistics.visitante,
        "partido.estadisticas.visitante",
      ),
    },
    lineups: {
      home: mapLineup(lineups.home, "home"),
      away: mapLineup(lineups.away, "away"),
    },
    events: match.eventos.map(mapMatchEvent),
    stadium: {
      name: nullableStringField(stadium.nombre, "partido.estadio.nombre"),
      latitude: nullableNumericField(stadium.latitud, "partido.estadio.latitud"),
      longitude: nullableNumericField(
        stadium.longitud,
        "partido.estadio.longitud",
      ),
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

export async function fetchMatchDetails(matchId: number): Promise<MatchDetails> {
  const response = await fetch(`${API_BASE_URL}/api/partidos/partidos/${matchId}`)
  if (!response.ok) {
    throw new Error(`El servidor respondió con HTTP ${response.status}.`)
  }

  const payload: unknown = await response.json()
  if (!isRecord(payload) || !("partido" in payload)) {
    throw new Error("La respuesta no contiene el detalle del partido.")
  }
  return mapMatchDetails(payload.partido)
}
