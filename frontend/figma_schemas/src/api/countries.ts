const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL + "/api/catalogo"  || "http://127.0.0.1:8000/api/catalogo"

export type Country = {
  id: number
  name: string
  iso3: string
  flagUrl: string
}

export type CountryDetails = Country & {
  confederation: {
    id: number
    name: string
    region: string
  }
  competitions: Competition[]
}

export type Competition = {
  id: number
  name: string
  type: string
  logoUrl: string
}

export type CountryTeam = {
  id: number
  name: string
  abbreviation: string
  crestUrl: string
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

function mapCountry(value: unknown): Country {
  if (!isRecord(value)) {
    throw new Error("La API devolvió un país con formato inválido.")
  }

  return {
    id: requireNumber(value.id, "id"),
    name: requireString(value.nombre, "nombre"),
    iso3: requireString(value.codigo_iso3, "codigo_iso3"),
    flagUrl: requireString(value.bandera_url, "bandera_url"),
  }
}

function mapCompetition(value: unknown): Competition {
  if (!isRecord(value)) {
    throw new Error("La API devolvió una competencia con formato inválido.")
  }

  return {
    id: requireNumber(value.id, "competicion.id"),
    name: requireString(value.nombre, "competicion.nombre"),
    type: requireString(value.tipo, "competicion.tipo"),
    logoUrl: requireString(value.logo_url, "competicion.logo_url"),
  }
}

function mapCountryDetails(value: unknown): CountryDetails {
  if (!isRecord(value) || !isRecord(value.confederacion)) {
    throw new Error("La API devolvió un detalle de país con formato inválido.")
  }
  if (!Array.isArray(value.competiciones)) {
    throw new Error("La API no devolvió una lista válida de competencias.")
  }

  return {
    ...mapCountry(value),
    confederation: {
      id: requireNumber(value.confederacion.id, "confederacion.id"),
      name: requireString(value.confederacion.nombre, "confederacion.nombre"),
      region: requireString(value.confederacion.region, "confederacion.region"),
    },
    competitions: value.competiciones.map(mapCompetition),
  }
}

function mapCountryTeam(value: unknown): CountryTeam {
  if (!isRecord(value)) {
    throw new Error("La API devolvió un equipo con formato inválido.")
  }

  return {
    id: requireNumber(value.id, "equipo.id"),
    name: requireString(value.nombre, "equipo.nombre"),
    abbreviation: requireString(value.siglas, "equipo.siglas"),
    crestUrl: requireString(value.escudo_url, "equipo.escudo_url"),
  }
}

export async function fetchCountries(): Promise<Country[]> {
  const payload = await getJson(`${API_BASE_URL}/paises/`)
  if (!isRecord(payload) || !Array.isArray(payload.paises)) {
    throw new Error("La respuesta no contiene una lista válida de países.")
  }
  return payload.paises.map(mapCountry)
}

export async function fetchCountryDetails(
  countryId: number,
): Promise<CountryDetails> {
  const payload = await getJson(`${API_BASE_URL}/paises/${countryId}/`)
  if (!isRecord(payload) || !("pais" in payload)) {
    throw new Error("La respuesta no contiene el detalle del país.")
  }
  return mapCountryDetails(payload.pais)
}

export async function fetchCountryTeams(
  countryId: number,
): Promise<CountryTeam[]> {
  const params = new URLSearchParams({ pais_id: String(countryId) })
  const payload = await getJson(`${API_BASE_URL}/equipos/?${params}`)
  if (!isRecord(payload) || !Array.isArray(payload.equipos)) {
    throw new Error("La respuesta no contiene una lista válida de equipos.")
  }
  return payload.equipos.map(mapCountryTeam)
}
