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

export default function CountriesPage() {
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
              El listado y la búsqueda se alimentarían desde el catálogo de
              países.
            </p>
          </div>
          <label className="country-select-wrap">
            <span>PAÍS</span>
            <select defaultValue="">
              <option value="" disabled>
                Seleccionar país
              </option>
            </select>
            <EndpointTag>/api/catalogo/paises/</EndpointTag>
          </label>
        </section>

        <section className="country-overview">
          <div className="country-overview-main">
            <div className="country-flag-placeholder" aria-hidden="true">
              <span>[ISO3]</span>
            </div>
            <div className="country-profile">
              <span className="country-overview-kicker">PERFIL DEL PAÍS</span>
              <h2>[nombre del país]</h2>
              <p>Nombre, código ISO3 y bandera del país.</p>
              <EndpointTag>/api/catalogo/paises/&lt;id&gt;/</EndpointTag>
            </div>
          </div>
          <div className="country-affiliations">
            <article>
              <span>CONFEDERACIÓN</span>
              <strong>[nombre y región]</strong>
              <EndpointTag>/api/catalogo/paises/&lt;id&gt;/</EndpointTag>
            </article>
            <article className="country-federation-unavailable">
              <span>FEDERACIÓN NACIONAL</span>
              <strong>Información no disponible</strong>
              <p>
                No existe un recurso ni una relación de federación para el país.
              </p>
              <span className="country-endpoint country-endpoint-missing">
                Sin endpoint disponible
              </span>
            </article>
          </div>
        </section>

        <div className="country-sections-grid">
          <section className="country-panel">
            <header className="country-panel-heading">
              <div>
                <span className="section-label">FÚTBOL NACIONAL</span>
                <h3>Equipos del país</h3>
              </div>
              <span className="country-panel-symbol" aria-hidden="true">
                01
              </span>
            </header>
            <UnavailableNotice
              title="No se pueden listar por país"
              detail="El listado de equipos no filtra por país y no incluye su país en la respuesta. El detalle del país tampoco devuelve equipos."
            />
            <div className="country-endpoint-pair">
              <EndpointTag>/api/catalogo/equipos/</EndpointTag>
              <span>sin filtro por país</span>
            </div>
          </section>

          <section className="country-panel">
            <header className="country-panel-heading">
              <div>
                <span className="section-label">TORNEOS</span>
                <h3>Competencias del país</h3>
              </div>
              <span className="country-panel-symbol" aria-hidden="true">
                02
              </span>
            </header>
            <div className="country-competition-placeholder">
              <div className="country-competition-emblem" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="country-competition-info">
                <strong>[nombre de la competencia]</strong>
                <p>[tipo de torneo] · [logo de la competencia]</p>
              </div>
              <span className="country-competition-arrow" aria-hidden="true">
                →
              </span>
            </div>
            <p className="country-competition-caption">
              La respuesta del país incluye sus competencias asociadas.
            </p>
            <EndpointTag>/api/catalogo/paises/&lt;id&gt;/</EndpointTag>
          </section>
        </div>

        <aside className="country-implementation-note">
          <span className="country-note-mark">i</span>
          <p>
            Las etiquetas indican el origen previsto de cada dato. Los bloques
            con aviso requieren endpoints o filtros que todavía no están
            implementados; este boceto no muestra datos ficticios como si
            provinieran de la API.
          </p>
        </aside>
      </div>
    </div>
  )
}
