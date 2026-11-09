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

function ConfederationMark() {
  return (
    <span className="confed-mark confed-mark-large" aria-hidden="true">
      <svg viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="24" />
        <path d="M17 35c5-3 5-11 11-16 4 5 8 8 11 15M18 21c5 2 15 2 21-1" />
      </svg>
      <b>[LOGO]</b>
    </span>
  )
}

export default function ConfederationsPage() {
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
              <strong>[N]</strong>
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
          <button className="selected" type="button">
            <ConfederationMark />
            <span>
              <strong>[nombre]</strong>
              <small>[región]</small>
            </span>
            <i>[id]</i>
          </button>
          <div className="confed-picker-placeholder">
            Los demás registros de la lista se obtienen del mismo endpoint.
          </div>
        </div>
      </div>

      <div className="content confed-layout">
        <aside className="confed-sidebar">
          <label htmlFor="association-search">BUSCAR CONFEDERACIÓN</label>
          <div className="confed-search">
            <input
              id="association-search"
              placeholder="Buscar por nombre..."
              type="search"
            />
          </div>
          <div className="confed-endpoint-note">
            <span>CAMPO DE BÚSQUEDA</span>
            <p>
              El endpoint de lista admite el parámetro <code>?nombre=</code>.
            </p>
            <EndpointTag>/api/catalogo/confederaciones/?nombre=</EndpointTag>
          </div>
          <div className="side-fact">
            <span>REGIÓN</span>
            <strong>[región de la confederación]</strong>
            <EndpointTag>/api/catalogo/confederaciones/&lt;id&gt;/</EndpointTag>
          </div>
          <UnavailableNotice
            title="Año de fundación no disponible"
            detail="El recurso de confederación no expone la fecha o el año de fundación."
          />
        </aside>

        <section className="confed-detail">
          <header className="confed-detail-header">
            <ConfederationMark />
            <div>
              <span>[REGIÓN]</span>
              <h2>[nombre]</h2>
              <p>Identificador: [id]</p>
              <EndpointTag>/api/catalogo/confederaciones/&lt;id&gt;/</EndpointTag>
            </div>
            <div className="member-total">
              <strong>[N]</strong>
              <span>PAÍSES MIEMBROS</span>
              <small>cantidad calculada desde la lista</small>
            </div>
          </header>

          <section className="confed-data-section">
            <div className="associations-heading">
              <div>
                <span className="section-label">PAÍSES MIEMBROS</span>
                <h3>Países asociados</h3>
              </div>
              <EndpointTag>/api/catalogo/confederaciones/&lt;id&gt;/</EndpointTag>
            </div>
            <p className="confed-data-description">
              El detalle incluye nombre, código ISO3 y bandera de cada país.
            </p>
            <div className="associations-grid">
              {[1, 2, 3].map((item) => (
                <article className="association-card" key={item}>
                  <span className="association-number">
                    {String(item).padStart(2, "0")}
                  </span>
                  <span className="association-flag">ISO3</span>
                  <div>
                    <h4>[nombre del país]</h4>
                    <p>[código ISO3] · [bandera]</p>
                    <EndpointTag>
                      /api/catalogo/confederaciones/&lt;id&gt;/
                    </EndpointTag>
                  </div>
                </article>
              ))}
            </div>
            <UnavailableNotice
              title="Nombre de la federación nacional no disponible"
              detail="La API lista países miembros, pero no provee las asociaciones o federaciones nacionales de cada país."
            />
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
              El detalle incluye nombre, tipo y logo de cada competencia.
            </p>
            <div className="competitions-grid">
              {[1, 2].map((item) => (
                <article className="competition-card" key={item}>
                  <span className="competition-logo-placeholder">LOGO</span>
                  <div>
                    <h4>[nombre de la competencia]</h4>
                    <p>[tipo de competencia]</p>
                    <EndpointTag>
                      /api/catalogo/confederaciones/&lt;id&gt;/
                    </EndpointTag>
                  </div>
                </article>
              ))}
            </div>
            <UnavailableNotice
              title="Alcance del torneo no disponible"
              detail="La respuesta no indica si una competencia es continental, nacional o de selecciones."
            />
          </section>
        </section>
      </div>

      <div className="content confed-implementation-note">
        <span className="country-note-mark">i</span>
        <p>
          Los elementos repetidos son espacios de muestra, no datos reales. Las
          etiquetas indican qué endpoint proporcionaría cada campo; los avisos
          marcan información que requiere ampliar la API.
        </p>
      </div>
    </div>
  )
}
