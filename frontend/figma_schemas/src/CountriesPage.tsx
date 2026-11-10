import { useEffect, useState } from "react"
import {
  fetchCountries,
  fetchCountryDetails,
  fetchCountryTeams,
  type Country,
  type CountryDetails,
  type CountryTeam,
} from "./api/countries"
import { EntityLink } from "./EntityNavigation"

function EndpointTag({ children }: { children: string }) {
  return <code className="country-endpoint">{children}</code>
}

function UnavailableNotice({
  title,
  detail,
}: {
  title: string
  detail: string
}) {
  return (
    <div className="country-unavailable">
      <span className="country-unavailable-icon" aria-hidden="true">
        !
      </span>
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
        <span className="country-endpoint country-endpoint-missing">
          Sin endpoint disponible
        </span>
      </div>
    </div>
  )
}

export default function CountriesPage({ initialId }: { initialId: number | null }) {
  const [countries, setCountries] = useState<Country[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [countriesLoading, setCountriesLoading] = useState(true)
  const [countriesError, setCountriesError] = useState<string | null>(null)
  const [details, setDetails] = useState<CountryDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [teams, setTeams] = useState<CountryTeam[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [teamsError, setTeamsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCountries() {
      try {
        const result = await fetchCountries()
        if (!cancelled) {
          setCountries(result)
          setSelectedId(initialId ?? result[0]?.id ?? null)
        }
      } catch (error) {
        if (!cancelled) {
          setCountriesError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los países.",
          )
        }
      } finally {
        if (!cancelled) setCountriesLoading(false)
      }
    }

    void loadCountries()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (initialId !== null) setSelectedId(initialId)
  }, [initialId])

  useEffect(() => {
    if (selectedId === null) {
      setDetails(null)
      setDetailsError(null)
      setDetailsLoading(false)
      return
    }

    const countryId = selectedId
    let cancelled = false
    setDetails(null)
    setDetailsError(null)
    setDetailsLoading(true)

    async function loadDetails() {
      try {
        const result = await fetchCountryDetails(countryId)
        if (!cancelled) setDetails(result)
      } catch (error) {
        if (!cancelled) {
          setDetailsError(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el detalle del país.",
          )
        }
      } finally {
        if (!cancelled) setDetailsLoading(false)
      }
    }

    void loadDetails()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  useEffect(() => {
    if (selectedId === null) {
      setTeams([])
      setTeamsError(null)
      setTeamsLoading(false)
      return
    }

    const countryId = selectedId
    let cancelled = false
    setTeams([])
    setTeamsError(null)
    setTeamsLoading(true)

    async function loadTeams() {
      try {
        const result = await fetchCountryTeams(countryId)
        if (!cancelled) setTeams(result)
      } catch (error) {
        if (!cancelled) {
          setTeamsError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los equipos del país.",
          )
        }
      } finally {
        if (!cancelled) setTeamsLoading(false)
      }
    }

    void loadTeams()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const selectedCountry =
    countries.find(({ id }) => id === selectedId) ?? null
  const country = details ?? selectedCountry

  return (
    <div className="countries-page">
      <section className="countries-hero">
        <div className="content">
          <div className="confed-breadcrumb">
            INICIO <span>/</span> PAÍSES
          </div>
          <div className="countries-title-row">
            <div>
              <span className="section-label">FÚTBOL POR TERRITORIO</span>
              <h1>Países</h1>
              <p>
                Explora los equipos, competencias y afiliaciones futbolísticas
                de cada país.
              </p>
            </div>
            <div className="countries-source">
              <span>CATÁLOGO DE PAÍSES</span>
              <EndpointTag>/api/catalogo/paises/</EndpointTag>
            </div>
          </div>
        </div>
      </section>

      <div className="content countries-content">
        <section className="country-selector">
          <div className="country-selector-copy">
            <span className="section-label">EXPLORAR</span>
            <h2>Selecciona un país</h2>
            <p>
              {countriesLoading
                ? "Cargando países…"
                : countriesError
                  ? `No se pudo cargar el catálogo: ${countriesError}`
                  : `${countries.length} países disponibles en el catálogo.`}
            </p>
          </div>
          <label className="country-select-wrap">
            <span>PAÍS</span>
            <select
              disabled={countriesLoading || Boolean(countriesError)}
              onChange={(event) =>
                setSelectedId(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              value={selectedId ?? ""}
            >
              <option value="" disabled>
                {countriesLoading ? "Cargando países…" : "Seleccionar país"}
              </option>
              {countries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <EndpointTag>/api/catalogo/paises/</EndpointTag>
          </label>
        </section>

        <section className="country-overview">
          <div className="country-overview-main">
            <div className="country-flag-placeholder">
              {country?.flagUrl ? (
                <img
                  alt={`Bandera de ${country.name}`}
                  src={country.flagUrl}
                />
              ) : (
                <span>{country?.iso3 ?? "—"}</span>
              )}
            </div>
            <div className="country-profile">
              <span className="country-overview-kicker">PERFIL DEL PAÍS</span>
              <h2>
                {country ? (
                  <EntityLink kind="pais" id={country.id}>{country.name}</EntityLink>
                ) : (
                  "Selecciona un país"
                )}
              </h2>
              <p>
                {country
                  ? `Código ISO3: ${country.iso3}`
                  : "Nombre, código ISO3 y bandera del país."}
              </p>
              <EndpointTag>/api/catalogo/paises/&lt;id&gt;/</EndpointTag>
            </div>
          </div>
          <div className="country-affiliations">
            <article>
              <span>CONFEDERACIÓN</span>
              <strong>
                {detailsLoading
                  ? "Cargando…"
                  : detailsError
                    ? "No disponible"
                    : details?.confederation
                      ? (
                        <>
                          <EntityLink kind="confederacion" id={details.confederation.id}>
                            {details.confederation.name}
                          </EntityLink>
                          {` · ${details.confederation.region}`}
                        </>
                      )
                      : "Sin país seleccionado"}
              </strong>
              <EndpointTag>/api/catalogo/paises/&lt;id&gt;/</EndpointTag>
            </article>
            <article className="country-federation-unavailable">
              <span>FEDERACIÓN NACIONAL</span>
              <strong>Información no disponible</strong>
              <p>
                El modelo y los endpoints actuales no exponen una federación
                nacional asociada al país.
              </p>
              <span className="country-endpoint country-endpoint-missing">
                Sin endpoint disponible
              </span>
            </article>
          </div>
        </section>

        {detailsError && (
          <p className="country-api-error" role="alert">
            No se pudo cargar el detalle del país: {detailsError}
          </p>
        )}

        <div className="country-sections-grid">
          <section className="country-panel">
            <header className="country-panel-heading">
              <div>
                <span className="section-label">FÚTBOL NACIONAL</span>
                <h3>Equipos del país</h3>
              </div>
              <span className="country-panel-symbol" aria-hidden="true">
                {teams.length.toString().padStart(2, "0")}
              </span>
            </header>
            {teamsLoading ? (
              <p className="country-panel-message">Cargando equipos…</p>
            ) : teamsError ? (
              <p className="country-api-error" role="alert">
                No se pudieron cargar los equipos: {teamsError}
              </p>
            ) : teams.length ? (
              <div className="country-team-list">
                {teams.map((team) => (
                  <article className="country-team-item" key={team.id}>
                    {team.crestUrl ? (
                      <img alt="" src={team.crestUrl} />
                    ) : (
                      <span className="country-team-abbreviation">
                        {team.abbreviation || "—"}
                      </span>
                    )}
                    <div>
                      <strong>
                        <EntityLink kind="equipo" id={team.id}>{team.name}</EntityLink>
                      </strong>
                      {team.abbreviation && <small>{team.abbreviation}</small>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="country-panel-message">
                {selectedId === null
                  ? "Selecciona un país para ver sus equipos."
                  : "No hay equipos asociados a este país."}
              </p>
            )}
            <div className="country-endpoint-pair">
              <EndpointTag>{`/api/catalogo/equipos/?pais_id=${selectedId ?? ""}`}</EndpointTag>
              <span>filtrado por país</span>
            </div>
          </section>

          <section className="country-panel">
            <header className="country-panel-heading">
              <div>
                <span className="section-label">TORNEOS</span>
                <h3>Competencias del país</h3>
              </div>
              <span className="country-panel-symbol" aria-hidden="true">
                {(details?.competitions.length ?? 0).toString().padStart(2, "0")}
              </span>
            </header>
            {detailsLoading ? (
              <p className="country-panel-message">Cargando competencias…</p>
            ) : detailsError ? (
              <p className="country-api-error" role="alert">
                No se pudieron cargar las competencias: {detailsError}
              </p>
            ) : details?.competitions.length ? (
              <div className="country-competition-list">
                {details.competitions.map((competition) => (
                  <article
                    className="country-competition-placeholder"
                    key={competition.id}
                  >
                    {competition.logoUrl ? (
                      <img
                        alt=""
                        className="country-competition-logo"
                        src={competition.logoUrl}
                      />
                    ) : (
                      <div
                        className="country-competition-emblem"
                        aria-hidden="true"
                      >
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                    <div className="country-competition-info">
                      <strong>
                        <EntityLink kind="competicion" id={competition.id}>{competition.name}</EntityLink>
                      </strong>
                      <p>{competition.type}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="country-panel-message">
                {selectedId === null
                  ? "Selecciona un país para ver sus competencias."
                  : "No hay competencias asociadas a este país."}
              </p>
            )}
            <p className="country-competition-caption">
              Las competencias se obtienen del detalle del país.
            </p>
            <EndpointTag>/api/catalogo/paises/&lt;id&gt;/</EndpointTag>
          </section>
        </div>

        <aside className="country-implementation-note">
          <span className="country-note-mark">i</span>
          <p>
            Países, confederación, competencias y equipos se cargan desde el
            backend. La federación nacional no está representada en el modelo
            ni en los endpoints actuales.
          </p>
        </aside>
      </div>
    </div>
  )
}
