const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL + "/api/catalogo" || "http://127.0.0.1:8000/api/catalogo"

export type Confederation = {
  id: number
  nombre: string
  region: string
  logo_url: string
}

export type ConfederationCountry = {
  id: number
  nombre: string
  codigo_iso3: string
  bandera_url: string
}

export type ConfederationCompetition = {
  id: number
  nombre: string
  tipo: string
  logo_url: string
}

export type ConfederationDetails = Confederation & {
  paises: ConfederationCountry[]
  competiciones: ConfederationCompetition[]
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

function mapCountry(value: unknown): ConfederationCountry {
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

function mapCompetition(value: unknown): ConfederationCompetition {
  if (!isRecord(value)) {
    throw new Error("La API devolvió una competencia con formato inválido.")
  }

  return {
    id: requireNumber(value.id, "competicion.id"),
    nombre: requireString(value.nombre, "competicion.nombre"),
    tipo: requireString(value.tipo, "competicion.tipo"),
    logo_url: requireString(value.logo_url, "competicion.logo_url"),
  }
}

function mapConfederation(value: unknown): ConfederationDetails {
  if (
    !isRecord(value) ||
    !Array.isArray(value.paises) ||
    !Array.isArray(value.competiciones)
  ) {
    throw new Error("La API devolvió un detalle de confederación inválido.")
  }

  return {
    id: requireNumber(value.id, "id"),
    nombre: requireString(value.nombre, "nombre"),
    region: requireString(value.region, "region"),
    logo_url: requireString(value.logo_url, "logo_url"),
    paises: value.paises.map(mapCountry),
    competiciones: value.competiciones.map(mapCompetition),
  }
}

export async function fetchConfederationDetails(
  confederationId: number,
): Promise<ConfederationDetails> {
  const payload = await getJson(
    `${API_BASE_URL}/confederaciones/${confederationId}/`,
  )
  if (!isRecord(payload) || !("confederacion" in payload)) {
    throw new Error("La respuesta no contiene el detalle de la confederación.")
  }
  return mapConfederation(payload.confederacion)
}
