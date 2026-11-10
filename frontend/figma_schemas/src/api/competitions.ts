import { getSeasonLabel } from "../utils/seasonLabel"

const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL + "/api/catalogo" || "http://127.0.0.1:8000/api/catalogo"

export type Competition = {
  id: number
  nombre: string
  tipo: string
  logo_url: string
}

export type CompetitionSeason = {
  id: number
  periodo: string
  etiqueta: string
  fecha_inicio: string
  fecha_fin: string
}

export type CompetitionDetails = Competition & {
  pais?: {
    id: number
    nombre: string
    codigo_iso3: string
    bandera_url: string
  }
  confederacion?: {
    id: number
    nombre: string
    region: string
  }
  temporadas: CompetitionSeason[]
}

export type SeasonTeam = {
  id: number
  nombre: string
  siglas: string
  escudo_url: string
}

export type StandingsRow = {
  equipo: {
    id: number
    nombre: string
    imagen: string
  }
  partidos_jugados: number
  ganados: number
  empatados: number
  perdidos: number
  goles_favor: number
  goles_contra: number
  diferencia_goles: number
  puntos: number
  forma: string
}

export type SeasonFixture = {
  id: number
  fecha: string
  estado: string
  minuto_actual: number | null
  goles: {
    local: number | null
    visitante: number | null
  }
  equipos: {
    local: { id: number; nombre: string; imagen: string }
    visitante: { id: number; nombre: string; imagen: string }
  }
}

export type CompetitionSeasonData = {
  temporada: CompetitionSeason
  partidos_totales: number
  equipos: SeasonTeam[]
  tabla: StandingsRow[]
  partidos: SeasonFixture[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== "number") {
    throw new Error(`El campo "${field}" de la API no es válido.`)
  }
  return value
}

function requireNullableNumber(value: unknown, field: string): number | null {
  if (value !== null && typeof value !== "number") {
    throw new Error(`El campo "${field}" de la API no es válido.`)
  }
  return value
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`El campo "${field}" de la API no es válido.`)
  }
  return value
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`El servidor respondió con HTTP ${response.status}.`)
  }
  return response.json()
}

function mapCompetition(value: unknown): Competition {
  if (!isRecord(value)) {
    throw new Error("La API devolvió una competición con formato inválido.")
  }
  return {
    id: requireNumber(value.id, "competicion.id"),
    nombre: requireString(value.nombre, "competicion.nombre"),
    tipo: requireString(value.tipo, "competicion.tipo"),
    logo_url: requireString(value.logo_url, "competicion.logo_url"),
  }
}

function mapSeason(value: unknown): CompetitionSeason {
  if (!isRecord(value)) {
    throw new Error("La API devolvió una temporada con formato inválido.")
  }
  const fechaInicio = requireString(value.fecha_inicio, "temporada.fecha_inicio")
  const fechaFin = requireString(value.fecha_fin, "temporada.fecha_fin")
  const periodo = requireString(value.periodo, "temporada.periodo")

  return {
    id: requireNumber(value.id, "temporada.id"),
    periodo,
    etiqueta: getSeasonLabel(periodo),
    fecha_inicio: fechaInicio,
    fecha_fin: fechaFin,
  }
}

function mapRelatedCountry(value: unknown): CompetitionDetails["pais"] {
  if (!isRecord(value)) {
    throw new Error("La API devolvió un país con formato inválido.")
  }
  return {
    id: requireNumber(value.id, "pais.id"),
    nombre: requireString(value.nombre, "pais.nombre"),
    codigo_iso3: requireString(value.codigo_iso3, "pais.codigo_iso3"),
    bandera_url: requireString(value.bandera_url, "pais.bandera_url"),
  }
}

function mapRelatedConfederation(
  value: unknown,
): NonNullable<CompetitionDetails["confederacion"]> {
  if (!isRecord(value)) {
    throw new Error("La API devolvió una confederación con formato inválido.")
  }
  return {
    id: requireNumber(value.id, "confederacion.id"),
    nombre: requireString(value.nombre, "confederacion.nombre"),
    region: requireString(value.region, "confederacion.region"),
  }
}

function mapCompetitionDetails(value: unknown): CompetitionDetails {
  if (!isRecord(value) || !Array.isArray(value.temporadas)) {
    throw new Error("La API devolvió un detalle de competición inválido.")
  }
  const competition = mapCompetition(value)
  return {
    ...competition,
    ...(value.pais !== undefined ? { pais: mapRelatedCountry(value.pais) } : {}),
    ...(value.confederacion !== undefined
      ? { confederacion: mapRelatedConfederation(value.confederacion) }
      : {}),
    temporadas: value.temporadas.map(mapSeason),
  }
}

function mapSeasonTeam(value: unknown): SeasonTeam {
  if (!isRecord(value)) {
    throw new Error("La API devolvió un equipo con formato inválido.")
  }
  return {
    id: requireNumber(value.id, "equipo.id"),
    nombre: requireString(value.nombre, "equipo.nombre"),
    siglas: requireString(value.siglas, "equipo.siglas"),
    escudo_url: requireString(value.escudo_url, "equipo.escudo_url"),
  }
}

function mapStandingsRow(value: unknown): StandingsRow {
  if (!isRecord(value) || !isRecord(value.equipo)) {
    throw new Error("La API devolvió una fila de tabla con formato inválido.")
  }
  return {
    equipo: {
      id: requireNumber(value.equipo.id, "tabla.equipo.id"),
      nombre: requireString(value.equipo.nombre, "tabla.equipo.nombre"),
      imagen: requireString(value.equipo.imagen, "tabla.equipo.imagen"),
    },
    partidos_jugados: requireNumber(value.partidos_jugados, "partidos_jugados"),
    ganados: requireNumber(value.ganados, "ganados"),
    empatados: requireNumber(value.empatados, "empatados"),
    perdidos: requireNumber(value.perdidos, "perdidos"),
    goles_favor: requireNumber(value.goles_favor, "goles_favor"),
    goles_contra: requireNumber(value.goles_contra, "goles_contra"),
    diferencia_goles: requireNumber(value.diferencia_goles, "diferencia_goles"),
    puntos: requireNumber(value.puntos, "puntos"),
    forma: requireString(value.forma, "forma"),
  }
}

function mapFixtureTeam(value: unknown): SeasonFixture["equipos"]["local"] {
  if (!isRecord(value)) {
    throw new Error("La API devolvió un equipo de partido con formato inválido.")
  }
  return {
    id: requireNumber(value.id, "partido.equipo.id"),
    nombre: requireString(value.nombre, "partido.equipo.nombre"),
    imagen: requireString(value.imagen, "partido.equipo.imagen"),
  }
}

function mapFixture(value: unknown): SeasonFixture {
  if (
    !isRecord(value) ||
    !isRecord(value.equipo_local) ||
    !isRecord(value.equipo_visitante)
  ) {
    throw new Error("La API devolvió un partido con formato inválido.")
  }
  return {
    id: requireNumber(value.id, "partido.id"),
    fecha: requireString(value.fecha, "partido.fecha"),
    estado: requireString(value.estado, "partido.estado"),
    minuto_actual: null,
    goles: {
      local: requireNullableNumber(value.goles_local, "goles_local"),
      visitante: requireNullableNumber(
        value.goles_vis,
        "goles_vis",
      ),
    },
    equipos: {
      local: mapFixtureTeam(value.equipo_local),
      visitante: mapFixtureTeam(value.equipo_visitante),
    },
  }
}

export async function fetchCompetitions(): Promise<Competition[]> {
  const payload = await getJson(`${API_BASE_URL}/competiciones/`)
  if (!isRecord(payload) || !Array.isArray(payload.competiciones)) {
    throw new Error("La respuesta no contiene una lista válida de competiciones.")
  }
  return payload.competiciones.map(mapCompetition)
}

export async function fetchCompetitionDetails(
  competitionId: number,
): Promise<CompetitionDetails> {
  const payload = await getJson(`${API_BASE_URL}/competiciones/${competitionId}`)
  if (!isRecord(payload) || !("competicion" in payload)) {
    throw new Error("La respuesta no contiene el detalle de la competición.")
  }
  return mapCompetitionDetails(payload.competicion)
}

export async function fetchCompetitionSeason(
  competitionId: number,
  seasonId: number,
): Promise<CompetitionSeasonData> {
  const payload = await getJson(
    `${API_BASE_URL}/competiciones/${competitionId}/temporadas/${seasonId}`,
  )

  if (!isRecord(payload) || !isRecord(payload.temporada)) {
    throw new Error("La API devolvió datos de temporada con formato inválido.")
  }

  const season = payload.temporada
  if (
    !Array.isArray(season.equipos) ||
    !Array.isArray(season.tabla) ||
    !Array.isArray(season.partidos)
  ) {
    throw new Error(
      "La API no devolvió equipos, tabla y partidos dentro del detalle de temporada.",
    )
  }

  return {
    temporada: mapSeason(season),
    partidos_totales: requireNumber(season.partidos_totales, 'partidos_totales'),
    equipos: season.equipos.map(mapSeasonTeam),
    tabla: season.tabla.map(mapStandingsRow),
    partidos: season.partidos.map(mapFixture),
  }
}
