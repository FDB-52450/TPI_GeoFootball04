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
          Sin endpoint / filtro disponible
        </span>
      </div>
    </div>
  )
}

function CompetitionEmblem() {
  return (
    <span className="competition-feature-emblem" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

export default function CompetitionsPage() {
  return (
    <div className="competitions-page">
      <section className="competitions-hero">
        <div className="content">
          <div className="confed-breadcrumb">
            INICIO <span>/</span> COMPETICIONES
          </div>
          <div className="competitions-title-row">
            <div>
              <span className="section-label">TEMPORADAS Y CALENDARIOS</span>
              <h1>Competiciones</h1>
              <p>
                Consulta participantes y partidos de cada temporada.
              </p>
            </div>
            <div className="competitions-hero-source">
              <span>CATÁLOGO DE COMPETICIONES</span>
              <EndpointTag>/api/catalogo/competiciones/</EndpointTag>
            </div>
          </div>
        </div>
      </section>

      <div className="content competitions-content">
        <section className="competition-browser">
          <div className="competition-browser-heading">
            <div>
              <span className="section-label">EXPLORAR</span>
              <h2>Selecciona una competición</h2>
            </div>
            <EndpointTag>/api/catalogo/competiciones/</EndpointTag>
          </div>
          <label className="competition-select-field">
            <span>COMPETICIÓN</span>
            <select defaultValue="">
              <option value="" disabled>
                Seleccionar competición
              </option>
            </select>
            <EndpointTag>/api/catalogo/competiciones/</EndpointTag>
          </label>
          <UnavailableNotice
            title="El catálogo no ofrece filtros de confederación o país"
            detail="La lista admite búsqueda por nombre. Los filtros de afiliación se muestran en la sección de competiciones relacionadas."
          />
        </section>

        <section className="competition-feature">
          <div className="competition-feature-main">
            <CompetitionEmblem />
            <div>
              <span className="competition-feature-kicker">
                COMPETICIÓN SELECCIONADA
              </span>
              <h2>[nombre de la competición]</h2>
              <div className="competition-feature-meta">
                <span>[tipo]</span>
                <span>[país o confederación]</span>
              </div>
            </div>
          </div>
          <div className="competition-feature-endpoints">
            <div>
              <span>DETALLE Y TEMPORADAS</span>
              <EndpointTag>/api/catalogo/competiciones/&lt;id&gt;</EndpointTag>
            </div>
            <div>
              <span>PAÍS Y CONFEDERACIÓN</span>
              <EndpointTag>/api/catalogo/competiciones/&lt;id&gt;</EndpointTag>
            </div>
          </div>
        </section>

        <section className="competition-season-block">
          <div className="competition-season-heading">
            <div>
              <span className="section-label">TEMPORADA ACTIVA</span>
              <h2>Participantes y partidos</h2>
              <p>
                La temporada seleccionada determina tanto los equipos como el
                calendario mostrado.
              </p>
            </div>
            <label className="competition-season-select">
              <span>TEMPORADA</span>
              <select defaultValue="">
                <option value="" disabled>
                  Seleccionar temporada
                </option>
              </select>
              <EndpointTag>
                /api/catalogo/competiciones/&lt;id&gt;
              </EndpointTag>
            </label>
          </div>

          <div className="competition-teams-panel">
            <div className="competition-subsection-heading">
              <div>
                <span className="section-label">PARTICIPANTES</span>
                <h3>Equipos de la temporada</h3>
              </div>
              <EndpointTag>
                /api/catalogo/competiciones/&lt;id&gt;/temporadas/&lt;temporada_id&gt;
              </EndpointTag>
            </div>
            <div className="competition-team-list">
              {[1, 2, 3, 4, 5].map((item) => (
                <div className="competition-team-chip" key={item}>
                  <span>[ESCUDO]</span>
                  <strong>[nombre del equipo]</strong>
                </div>
              ))}
              <p className="competition-team-more">
                Los participantes restantes se obtienen del mismo recurso de
                temporada.
              </p>
            </div>
          </div>

          <div className="competition-standings-panel">
            <div className="competition-subsection-heading">
              <div>
                <span className="section-label">CLASIFICACIÓN</span>
                <h3>Tabla de posiciones</h3>
              </div>
              <EndpointTag>
                /api/catalogo/competiciones/&lt;id&gt;/temporadas/&lt;temporada_id&gt;/tabla
              </EndpointTag>
            </div>
            <p className="competition-standings-description">
              La clasificación corresponde únicamente a la temporada
              seleccionada.
            </p>
            <div className="competition-standings-scroll">
              <table className="competition-standings-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col" className="standings-team-column">
                      Equipo
                    </th>
                    <th scope="col">PJ</th>
                    <th scope="col">G</th>
                    <th scope="col">E</th>
                    <th scope="col">P</th>
                    <th scope="col">GF</th>
                    <th scope="col">GC</th>
                    <th scope="col">DG</th>
                    <th scope="col">PTS</th>
                    <th scope="col">Forma</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4].map((position) => (
                    <tr key={position}>
                      <td className="standings-position">{position}</td>
                      <td className="standings-team">
                        <span>[ESCUDO]</span>
                        <strong>[nombre del equipo]</strong>
                      </td>
                      <td>[PJ]</td>
                      <td>[G]</td>
                      <td>[E]</td>
                      <td>[P]</td>
                      <td>[GF]</td>
                      <td>[GC]</td>
                      <td>[DG]</td>
                      <td className="standings-points">[PTS]</td>
                      <td className="standings-form">[W-D-L]</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <UnavailableNotice
              title="Las competiciones tipo copa no tienen tabla de posiciones"
              detail="Para una temporada cuya competición es de tipo COPA, este endpoint devuelve una lista vacía."
            />
          </div>

          <div className="competition-fixtures-panel">
            <div className="competition-subsection-heading fixtures-heading">
              <div>
                <span className="section-label">CALENDARIO DE TEMPORADA</span>
                <h3>Partidos</h3>
              </div>
              <EndpointTag>
                /api/catalogo/competiciones/&lt;id&gt;/temporadas/&lt;temporada_id&gt;/partidos
              </EndpointTag>
            </div>
            <div className="competition-date-toolbar">
              <div className="competition-date-tabs" aria-label="Filtrar por fecha">
                <button type="button">Ayer</button>
                <button className="selected" type="button">
                  Hoy
                </button>
                <button type="button">Mañana</button>
              </div>
              <span className="competition-season-scope">
                Resultados, partidos actuales y próximos
              </span>
            </div>
            <div className="competition-fixture-list">
              <article className="competition-fixture">
                <div className="fixture-date">
                  <strong>[fecha]</strong>
                  <span>[hora]</span>
                </div>
                <div className="fixture-team fixture-home">
                  <span>[ESCUDO]</span>
                  <strong>[equipo local]</strong>
                </div>
                <div className="fixture-result">
                  <strong>[goles] — [goles]</strong>
                  <span>FINALIZADO</span>
                </div>
                <div className="fixture-team fixture-away">
                  <span>[ESCUDO]</span>
                  <strong>[equipo visitante]</strong>
                </div>
                <span className="fixture-endpoint">MISMA TEMPORADA</span>
              </article>
              <article className="competition-fixture fixture-live">
                <div className="fixture-date">
                  <strong>[fecha]</strong>
                  <span>[hora]</span>
                </div>
                <div className="fixture-team fixture-home">
                  <span>[ESCUDO]</span>
                  <strong>[equipo local]</strong>
                </div>
                <div className="fixture-result">
                  <strong>[goles] — [goles]</strong>
                  <span><i /> EN JUEGO · [minuto]</span>
                </div>
                <div className="fixture-team fixture-away">
                  <span>[ESCUDO]</span>
                  <strong>[equipo visitante]</strong>
                </div>
                <span className="fixture-endpoint">MISMA TEMPORADA</span>
              </article>
              <article className="competition-fixture">
                <div className="fixture-date">
                  <strong>[fecha]</strong>
                  <span>[hora]</span>
                </div>
                <div className="fixture-team fixture-home">
                  <span>[ESCUDO]</span>
                  <strong>[equipo local]</strong>
                </div>
                <div className="fixture-result fixture-upcoming">
                  <strong>[hora]</strong>
                  <span>PROGRAMADO</span>
                </div>
                <div className="fixture-team fixture-away">
                  <span>[ESCUDO]</span>
                  <strong>[equipo visitante]</strong>
                </div>
                <span className="fixture-endpoint">MISMA TEMPORADA</span>
              </article>
            </div>
            <UnavailableNotice
              title="Los filtros de fecha y estado aún no están disponibles"
              detail="La ruta de partidos de temporada devuelve sus encuentros, pero no acepta parámetros para separar anteriores, en juego o próximos ni para filtrar por fecha."
            />
          </div>
        </section>

        <section className="related-competitions">
          <div className="related-heading">
            <div>
              <span className="section-label">DESCUBRIR MÁS</span>
              <h2>Competencias relacionadas</h2>
              <p>
                Otras competencias asociadas a la misma confederación.
              </p>
            </div>
            <EndpointTag>
              /api/catalogo/confederaciones/&lt;id&gt;/
            </EndpointTag>
          </div>
          <div className="related-filters">
            <label>
              <span>CONFEDERACIÓN</span>
              <select defaultValue="">
                <option value="" disabled>
                  Seleccionar confederación
                </option>
              </select>
              <EndpointTag>/api/catalogo/confederaciones/</EndpointTag>
            </label>
            <label>
              <span>PAÍS</span>
              <select defaultValue="">
                <option value="" disabled>
                  Seleccionar país
                </option>
              </select>
              <EndpointTag>/api/catalogo/paises/</EndpointTag>
            </label>
          </div>
          <div className="related-competition-list">
            {[1, 2, 3].map((item) => (
              <article className="related-competition-card" key={item}>
                <span className="related-competition-logo">LOGO</span>
                <div>
                  <strong>[nombre de la competencia]</strong>
                  <p>[tipo] · [país o confederación]</p>
                </div>
                <EndpointTag>
                  /api/catalogo/confederaciones/&lt;id&gt;/
                </EndpointTag>
              </article>
            ))}
          </div>
          <UnavailableNotice
            title="El filtro por país no existe como parámetro de listado"
            detail="La confederación lista sus competencias y el detalle de una competencia incluye país/confederación; la API no permite filtrar directamente el listado por ambos criterios."
          />
        </section>

        <aside className="country-implementation-note">
          <span className="country-note-mark">i</span>
          <p>
            Los equipos y partidos se muestran como estructura de ejemplo; no
            son datos reales. Temporada y calendario están ligados al mismo
            temporada_id en las rutas indicadas.
          </p>
        </aside>
      </div>
    </div>
  )
}
