import { useEffect, useState } from "react"
import {
  fetchConfederationDetails,
  type Confederation,
  type ConfederationDetails,
} from "./api/confederations"
import { EntityLink } from "./EntityNavigation"

const CONFEDERATIONS_ENDPOINT =
  "http://127.0.0.1:8000/api/catalogo/confederaciones/"

function isConfederation(value: unknown): value is Confederation {
  if (typeof value !== "object" || value === null) return false

  const confederation = value as Record<string, unknown>
  return (
    typeof confederation.id === "number" &&
    typeof confederation.nombre === "string" &&
    typeof confederation.region === "string" &&
    typeof confederation.logo_url === "string"
  )
}

function EndpointTag({ children }: { children: string }) {
  return <code className="country-endpoint">{children}</code>
}

function ConfederationMark({ logoUrl }: { logoUrl?: string | null }) {
  return (
    <span className="confed-mark confed-mark-large" aria-hidden="true">
      {logoUrl ? (
        <img
          alt=""
          src={logoUrl}
          style={{ width: "100%", height: "100%", objectFit: "contain" }}
        />
      ) : (
        <>
          <svg viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" />
            <path d="M17 35c5-3 5-11 11-16 4 5 8 8 11 15M18 21c5 2 15 2 21-1" />
          </svg>
          <b>LOGO</b>
        </>
      )}
    </span>
  )
}

export default function ConfederationsPage({ initialId }: { initialId: number | null }) {
  const [confederations, setConfederations] = useState<Confederation[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [details, setDetails] = useState<ConfederationDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadConfederations() {
      try {
        const response = await fetch(CONFEDERATIONS_ENDPOINT)
        if (!response.ok) {
          throw new Error(`El servidor respondió con HTTP ${response.status}.`)
        }

        const payload: unknown = await response.json()
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("confederaciones" in payload) ||
          !Array.isArray(payload.confederaciones) ||
          !payload.confederaciones.every(isConfederation)
        ) {
          throw new Error("La respuesta no contiene una lista válida de confederaciones.")
        }

        if (!cancelled) {
          setConfederations(payload.confederaciones)
          setSelectedId(initialId ?? payload.confederaciones[0]?.id ?? null)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudieron cargar las confederaciones.",
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadConfederations()
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

    const confederationId = selectedId
    let cancelled = false
    setDetails(null)
    setDetailsError(null)
    setDetailsLoading(true)

    async function loadDetails() {
      try {
        const result = await fetchConfederationDetails(confederationId)
        if (!cancelled) setDetails(result)
      } catch (loadError) {
        if (!cancelled) {
          setDetailsError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el detalle de la confederación.",
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

  const selectedConfederation =
    confederations.find(({ id }) => id === selectedId) ?? null
  const selectedDetails = details?.id === selectedId ? details : null

  return (
    <div className="confederations-page">
      <section className="confed-hero">
        <div className="content">
          <div className="confed-breadcrumb">
            INICIO <span>/</span> CONFEDERACIONES
          </div>
          <div className="confed-title-row">
            <div>
              <span className="section-label">ORGANIZACIÓN MUNDIAL</span>
              <h1>Confederaciones</h1>
              <p>
                Explora sus países miembros y las competencias que organizan.
              </p>
            </div>
            <div className="confed-world-stat">
              <strong>{loading ? "…" : confederations.length}</strong>
              <span>
                confederaciones
                <br />
                en el catálogo
              </span>
            </div>
          </div>
          <div className="confed-hero-source">
            <span>LISTADO Y DATOS BÁSICOS</span>
            <EndpointTag>/api/catalogo/confederaciones/</EndpointTag>
          </div>
        </div>
      </section>

      <div className="content confed-picker-wrap">
        <div className="confed-picker-heading">
          <div>
            <span className="section-label">CATÁLOGO</span>
            <h2>Selecciona una confederación</h2>
          </div>
          <EndpointTag>/api/catalogo/confederaciones/</EndpointTag>
        </div>
        <div className="confed-picker">
          {loading ? (
            <div className="confed-picker-placeholder">
              Cargando confederaciones…
            </div>
          ) : error ? (
            <div className="confed-picker-placeholder" role="alert">
              No se pudo cargar el catálogo: {error}
            </div>
          ) : confederations.length ? (
            confederations.map((confederation) => (
              <a
                className={selectedId === confederation.id ? "selected" : ""}
                aria-current={selectedId === confederation.id ? "page" : undefined}
                href={`#confederacion/${confederation.id}`}
                key={confederation.id}
              >
                <ConfederationMark logoUrl={confederation.logo_url} />
                <span>
                  <strong>{confederation.nombre}</strong>
                  <small>{confederation.region || "Región no informada"}</small>
                </span>
                <i>{confederation.id}</i>
              </a>
            ))
          ) : (
            <div className="confed-picker-placeholder">
              El catálogo no contiene confederaciones.
            </div>
          )}
        </div>
      </div>

      <div className="content confed-layout">
        <section className="confed-detail">
          <header className="confed-detail-header">
            <ConfederationMark logoUrl={selectedConfederation?.logo_url} />
            <div>
              <span>{selectedConfederation?.region || "CONFEDERACIÓN"}</span>
              <h2>
                {selectedConfederation ? (
                  <EntityLink kind="confederacion" id={selectedConfederation.id}>
                    {selectedConfederation.nombre}
                  </EntityLink>
                ) : (
                  "Selecciona una confederación"
                )}
              </h2>
              {selectedConfederation && (
                <p>Identificador: {selectedConfederation.id}</p>
              )}
              <EndpointTag>
                {`/api/catalogo/confederaciones/${selectedConfederation?.id ?? ""}/`}
              </EndpointTag>
            </div>
            <div className="member-total">
              <strong>
                {detailsLoading ? "…" : selectedDetails?.paises.length ?? "—"}
              </strong>
              <span>PAÍSES MIEMBROS</span>
            </div>
          </header>

          {detailsError && (
            <p className="confed-api-error" role="alert">
              No se pudo cargar el detalle: {detailsError}
            </p>
          )}

          <section className="confed-data-section">
            <div className="associations-heading">
              <div>
                <span className="section-label">PAÍSES MIEMBROS</span>
                <h3>Países asociados</h3>
              </div>
              <EndpointTag>/api/catalogo/confederaciones/&lt;id&gt;/</EndpointTag>
            </div>
            <p className="confed-data-description">
              Países asociados a la confederación seleccionada.
            </p>
            {detailsLoading ? (
              <p className="confed-data-status">Cargando países miembros…</p>
            ) : detailsError ? (
              <p className="confed-api-error" role="alert">
                No se pudieron cargar los países miembros.
              </p>
            ) : selectedDetails?.paises.length ? (
              <div className="associations-grid">
                {selectedDetails.paises.map((country, index) => (
                  <article className="association-card" key={country.id}>
                    <span className="association-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {country.bandera_url ? (
                      <img
                        alt={`Bandera de ${country.nombre}`}
                        className="confed-country-flag"
                        src={country.bandera_url}
                      />
                    ) : (
                      <span className="association-flag">
                        {country.codigo_iso3}
                      </span>
                    )}
                    <div>
                      <h4>
                        <EntityLink kind="pais" id={country.id}>{country.nombre}</EntityLink>
                      </h4>
                      <p>{country.codigo_iso3}</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="confed-data-status">
                {selectedId === null
                  ? "Selecciona una confederación para ver sus países."
                  : "No hay países asociados a esta confederación."}
              </p>
            )}
          </section>

          <section className="competitions-section confed-data-section">
            <div className="associations-heading">
              <div>
                <span className="section-label">TORNEOS</span>
                <h3>Competencias asociadas</h3>
              </div>
              <EndpointTag>/api/catalogo/confederaciones/&lt;id&gt;/</EndpointTag>
            </div>
            <p className="competitions-description">
              Competencias asociadas a la confederación seleccionada.
            </p>
            {detailsLoading ? (
              <p className="confed-data-status">Cargando competencias…</p>
            ) : detailsError ? (
              <p className="confed-api-error" role="alert">
                No se pudieron cargar las competencias.
              </p>
            ) : selectedDetails?.competiciones.length ? (
              <div className="competitions-grid">
                {selectedDetails.competiciones.map((competition) => (
                  <article className="competition-card" key={competition.id}>
                    {competition.logo_url ? (
                      <img
                        alt=""
                        className="competition-logo-placeholder"
                        src={competition.logo_url}
                      />
                    ) : (
                      <span className="competition-logo-placeholder">
                        LOGO
                      </span>
                    )}
                    <div>
                      <h4>
                        <EntityLink kind="competicion" id={competition.id}>{competition.nombre}</EntityLink>
                      </h4>
                      <span className={`competition-type competition-type-${competition.tipo.toLocaleLowerCase()}`}>
                        {competition.tipo}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="confed-data-status">
                {selectedId === null
                  ? "Selecciona una confederación para ver sus competencias."
                  : "No hay competencias asociadas a esta confederación."}
              </p>
            )}
          </section>
        </section>
      </div>

      <div className="content confed-implementation-note">
        <span className="country-note-mark">i</span>
        <p>
          El catálogo y el detalle se cargan desde la API. Al seleccionar una
          confederación, se actualizan sus países miembros y competencias.
        </p>
      </div>
    </div>
  )
}