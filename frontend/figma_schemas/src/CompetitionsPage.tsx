import { useEffect, useState } from "react"
import {
  fetchCompetitionDetails,
  fetchCompetitions,
  fetchCompetitionSeason,
  fetchCompetitionSeasonStatistics,
  type Competition,
  type CompetitionDetails,
  type CompetitionSeasonData,
  type CompetitionSeasonStatistics,
  type EntityStatistic,
  type MatchStatistic,
} from "./api/competitions"
import { EntityLink } from "./EntityNavigation"
import { ImageWithFallback } from "./utils/ImageWithFallback"
import { getSeasonLabel } from "./utils/seasonLabel.ts"

function EndpointTag({ children }: { children: string }) {
  return <code className="country-endpoint">{children}</code>
}

function CompetitionEmblem({ logoUrl }: { logoUrl?: string }) {
  return (
    <ImageWithFallback
      url={logoUrl}
      alt=""
      className="competition-feature-image"
      fallback={
        <span className="competition-feature-emblem" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      }
    />
  )
}

function formatMatchDate(value: string): { date: string; time: string } {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: value, time: "" }

  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }
}

function formatSeasonDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function formatStatisticValue(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
}

function StatisticLeaderboard({
  title,
  entries,
  entityKind,
}: {
  title: string
  entries: (EntityStatistic | MatchStatistic)[]
  entityKind: "equipo" | "jugador"
}) {
  return (
    <section className="competition-stat-leaderboard">
      <h4>{title}</h4>
      {entries.length ? (
        <ol>
          {entries.map((entry, index) => {
            const isMatch = "partido_id" in entry
            const xgLabel = isMatch
              ? entry.xg.local !== null || entry.xg.visitante !== null
                ? `xG ${entry.xg.local === null ? "—" : formatStatisticValue(entry.xg.local)} — ${entry.xg.visitante === null ? "—" : formatStatisticValue(entry.xg.visitante)}`
                : "xG no disponible"
              : null
            return (
              <li
                className={[
                  index === 0 ? "competition-stat-leader" : "",
                  isMatch ? "competition-stat-match-row" : "",
                ].filter(Boolean).join(" ")}
                key={isMatch ? entry.partido_id : entry.entity.id}
              >
                <span className="competition-stat-rank">{index + 1}</span>
                {isMatch ? (
                  <div className="competition-stat-match">
                    <EntityLink
                      className="competition-stat-match-team"
                      kind="equipo"
                      id={entry.local.id}
                    >
                      {entry.local.nombre}
                    </EntityLink>
                    <div className="competition-stat-score">
                      <strong>
                        {entry.goles.local !== null && entry.goles.visitante !== null
                          ? `${entry.goles.local} — ${entry.goles.visitante}`
                          : "vs"}
                      </strong>
                      <small className="competition-stat-xg">{xgLabel}</small>
                    </div>
                    <EntityLink
                      className="competition-stat-match-team competition-stat-match-away"
                      kind="equipo"
                      id={entry.visitante.id}
                    >
                      {entry.visitante.nombre}
                    </EntityLink>
                  </div>
                ) : (
                  <EntityLink
                    className="competition-stat-entity"
                    kind={entityKind}
                    id={entry.entity.id}
                  >
                    <ImageWithFallback
                      url={entry.entity.imagen}
                      alt=""
                      fallback={
                        <span className="competition-stat-entity-initial">
                          {entry.entity.nombre.slice(0, 1)}
                        </span>
                      }
                    />
                    <strong>{entry.entity.nombre}</strong>
                  </EntityLink>
                )}
                {!isMatch && (
                  <strong className="competition-stat-value">
                    {formatStatisticValue(entry.valor)}
                    <small>{entry.unidad}</small>
                  </strong>
                )}
              </li>
            )
          })}
        </ol>
      ) : (
        <p className="competition-season-status">Sin datos para esta estadística.</p>
      )}
    </section>
  )
}

function CompetitionStatistics({
  statistics,
}: {
  statistics: CompetitionSeasonStatistics
}) {
  return (
    <div className="competition-statistics-content">
      <div className="competition-stat-total">
        <strong>{statistics.partidos.partidos_jugados}</strong>
        <span>PARTIDOS ANALIZADOS</span>
      </div>
      <div className="competition-stat-category">
        <h4>Partidos</h4>
        <div className="competition-stat-grid">
          <StatisticLeaderboard
            title="Partidos con más goles"
            entries={statistics.partidos.partido_con_mas_goles}
            entityKind="equipo"
          />
          <StatisticLeaderboard
            title="Mayores goleadas"
            entries={statistics.partidos.mayor_goleada}
            entityKind="equipo"
          />
          <StatisticLeaderboard
            title="Mayor diferencia de xG"
            entries={statistics.partidos.partido_mas_disparejo}
            entityKind="equipo"
          />
          <StatisticLeaderboard
            title="Menor diferencia de xG"
            entries={statistics.partidos.partido_mas_parejo}
            entityKind="equipo"
          />
        </div>
      </div>
      <div className="competition-stat-category">
        <h4>Equipos</h4>
        <div className="competition-stat-grid">
          <StatisticLeaderboard title="Mayor racha invicta" entries={statistics.equipo.mayor_racha_invicto} entityKind="equipo" />
          <StatisticLeaderboard title="Más porterías imbatidas" entries={statistics.equipo.mayor_vallas_invictas} entityKind="equipo" />
          <StatisticLeaderboard title="Mejor ataque" entries={statistics.equipo.mejor_ataque} entityKind="equipo" />
          <StatisticLeaderboard title="Mejor defensa" entries={statistics.equipo.mejor_defensa} entityKind="equipo" />
        </div>
      </div>
      <div className="competition-stat-category">
        <h4>Jugadores</h4>
        <div className="competition-stat-grid">
          <StatisticLeaderboard title="Goles" entries={statistics.jugadores.goles} entityKind="jugador" />
          <StatisticLeaderboard title="Tarjetas amarillas" entries={statistics.jugadores.tarjetas_amarillas} entityKind="jugador" />
          <StatisticLeaderboard title="Tarjetas rojas" entries={statistics.jugadores.tarjetas_rojas} entityKind="jugador" />
          <StatisticLeaderboard title="Minutos jugados" entries={statistics.jugadores.minutos} entityKind="jugador" />
        </div>
      </div>
    </div>
  )
}

export default function CompetitionsPage({ initialId }: { initialId: number | null }) {
  const [competitions, setCompetitions] = useState<Competition[]>([])
  const [competitionId, setCompetitionId] = useState<number | null>(null)
  const [competitionsLoading, setCompetitionsLoading] = useState(true)
  const [competitionsError, setCompetitionsError] = useState<string | null>(null)
  const [competitionDetails, setCompetitionDetails] =
    useState<CompetitionDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [seasonId, setSeasonId] = useState<number | null>(null)
  const [seasonData, setSeasonData] = useState<CompetitionSeasonData | null>(
    null,
  )
  const [seasonLoading, setSeasonLoading] = useState(false)
  const [seasonError, setSeasonError] = useState<string | null>(null)
  const [seasonStatistics, setSeasonStatistics] =
    useState<CompetitionSeasonStatistics | null>(null)
  const [statisticsLoading, setStatisticsLoading] = useState(false)
  const [statisticsError, setStatisticsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadCompetitions() {
      try {
        const result = await fetchCompetitions()
        if (!cancelled) {
          setCompetitions(result)
          setCompetitionId(initialId ?? result[0]?.id ?? null)
        }
      } catch (error) {
        if (!cancelled) {
          setCompetitionsError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las competiciones.",
          )
        }
      } finally {
        if (!cancelled) setCompetitionsLoading(false)
      }
    }

    void loadCompetitions()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (initialId !== null) setCompetitionId(initialId)
  }, [initialId])

  useEffect(() => {
    if (competitionId === null) {
      setCompetitionDetails(null)
      setDetailsError(null)
      setDetailsLoading(false)
      setSeasonId(null)
      return
    }

    const selectedCompetitionId = competitionId
    let cancelled = false
    setCompetitionDetails(null)
    setDetailsError(null)
    setDetailsLoading(true)
    setSeasonId(null)
    setSeasonData(null)
    setSeasonError(null)

    async function loadCompetitionDetails() {
      try {
        const result = await fetchCompetitionDetails(selectedCompetitionId)
        if (!cancelled) {
          setCompetitionDetails(result)
          setSeasonId(result.temporadas[0]?.id ?? null)
        }
      } catch (error) {
        if (!cancelled) {
          setDetailsError(
            error instanceof Error
              ? error.message
              : "No se pudo cargar el detalle de la competición.",
          )
        }
      } finally {
        if (!cancelled) setDetailsLoading(false)
      }
    }

    void loadCompetitionDetails()
    return () => {
      cancelled = true
    }
  }, [competitionId])

  useEffect(() => {
    if (competitionId === null || seasonId === null) {
      setSeasonData(null)
      setSeasonError(null)
      setSeasonLoading(false)
      return
    }

    const selectedCompetitionId = competitionId
    const selectedSeasonId = seasonId
    let cancelled = false
    setSeasonData(null)
    setSeasonError(null)
    setSeasonLoading(true)

    async function loadSeason() {
      try {
        const result = await fetchCompetitionSeason(
          selectedCompetitionId,
          selectedSeasonId,
        )
        if (!cancelled) setSeasonData(result)
      } catch (error) {
        if (!cancelled) {
          setSeasonError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los datos de la temporada.",
          )
        }
      } finally {
        if (!cancelled) setSeasonLoading(false)
      }
    }

    void loadSeason()
    return () => {
      cancelled = true
    }
  }, [competitionId, seasonId])

  useEffect(() => {
    if (competitionId === null || seasonId === null) {
      setSeasonStatistics(null)
      setStatisticsError(null)
      setStatisticsLoading(false)
      return
    }

    const selectedCompetitionId = competitionId
    const selectedSeasonId = seasonId
    let cancelled = false
    setSeasonStatistics(null)
    setStatisticsError(null)
    setStatisticsLoading(true)

    async function loadStatistics() {
      try {
        const result = await fetchCompetitionSeasonStatistics(
          selectedCompetitionId,
          selectedSeasonId,
        )
        if (!cancelled) setSeasonStatistics(result)
      } catch (error) {
        if (!cancelled) {
          setStatisticsError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las estadísticas.",
          )
        }
      } finally {
        if (!cancelled) setStatisticsLoading(false)
      }
    }

    void loadStatistics()
    return () => {
      cancelled = true
    }
  }, [competitionId, seasonId])

  const selectedCompetition =
    competitions.find(({ id }) => id === competitionId) ?? null
  const selectedDetails =
    competitionDetails?.id === competitionId ? competitionDetails : null
  const selectedSeason = selectedDetails?.temporadas.find(
    ({ id }) => id === seasonId,
  )

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
              <p>Consulta participantes y partidos de cada temporada.</p>
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
            <select
              disabled={competitionsLoading || Boolean(competitionsError)}
              onChange={(event) =>
                setCompetitionId(
                  event.target.value ? Number(event.target.value) : null,
                )
              }
              value={competitionId ?? ""}
            >
              <option value="" disabled>
                {competitionsLoading
                  ? "Cargando competiciones…"
                  : "Seleccionar competición"}
              </option>
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {competition.nombre}
                </option>
              ))}
            </select>
            {competitionsError && (
              <span className="competition-api-error" role="alert">
                No se pudo cargar el catálogo: {competitionsError}
              </span>
            )}
          </label>
        </section>

        <section className="competition-feature">
          <div className="competition-feature-main">
            <CompetitionEmblem logoUrl={selectedDetails?.logo_url} />
            <div>
              <span className="competition-feature-kicker">
                COMPETICIÓN SELECCIONADA
              </span>
              <h2>
                {selectedDetails?.nombre ??
                  selectedCompetition?.nombre ??
                  "Selecciona una competición"}
              </h2>
              <div className="competition-feature-meta">
                {selectedDetails ? (
                  <>
                    <span>{selectedDetails.tipo}</span>
                    {selectedDetails.pais && (
                      <span>
                        <EntityLink kind="pais" id={selectedDetails.pais.id}>
                          {selectedDetails.pais.nombre}
                        </EntityLink>
                      </span>
                    )}
                    {selectedDetails.confederacion && (
                      <span>
                        <EntityLink
                          kind="confederacion"
                          id={selectedDetails.confederacion.id}
                        >
                          {selectedDetails.confederacion.nombre}
                        </EntityLink>
                      </span>
                    )}
                  </>
                ) : detailsLoading ? (
                  <span>Cargando detalle…</span>
                ) : detailsError ? (
                  <span role="alert">{detailsError}</span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="competition-feature-endpoints">
            <div>
              <span>DETALLE Y TEMPORADAS</span>
              <EndpointTag>{`/api/catalogo/competiciones/${competitionId ?? "<id>"}`}</EndpointTag>
            </div>
            <div>
              <span>PAÍS Y CONFEDERACIÓN</span>
              <EndpointTag>{`/api/catalogo/competiciones/${competitionId ?? "<id>"}`}</EndpointTag>
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
              <select
                disabled={
                  detailsLoading ||
                  !selectedDetails?.temporadas.length ||
                  Boolean(detailsError)
                }
                onChange={(event) =>
                  setSeasonId(event.target.value ? Number(event.target.value) : null)
                }
                value={seasonId ?? ""}
              >
                <option value="" disabled>
                  {detailsLoading
                    ? "Cargando temporadas…"
                    : "Seleccionar temporada"}
                </option>
                {selectedDetails?.temporadas.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.etiqueta}
                  </option>
                ))}
              </select>
              <EndpointTag>{`/api/catalogo/competiciones/${competitionId ?? "<id>"}`}</EndpointTag>
            </label>
          </div>
          {selectedSeason && (
            <p className="competition-season-date-range">
              {getSeasonLabel(selectedSeason.periodo)}
            </p>
          )}
          {detailsError && (
            <p className="competition-api-error" role="alert">
              No se pudieron cargar las temporadas: {detailsError}
            </p>
          )}
          {!detailsLoading &&
            !detailsError &&
            selectedDetails &&
            selectedDetails.temporadas.length === 0 && (
              <p className="competition-season-status">
                Esta competición no tiene temporadas registradas.
              </p>
            )}

          {seasonData &&
          seasonData.equipos.length * 19 !== seasonData.partidos_totales && (
            <aside className="competition-data-warning" role="alert">
              <span className="competition-data-warning-mark" aria-hidden="true">
                !
              </span>
              <p>El numero de equipos y partidos no coinciden, por lo que es posible que los datos esten incompletos</p>
            </aside>
          )}

          <div className="competition-teams-panel">
            <div className="competition-subsection-heading">
              <div>
                <span className="section-label">PARTICIPANTES</span>
                <h3>Equipos de la temporada</h3>
              </div>
              <EndpointTag>{`/api/catalogo/competiciones/${competitionId ?? "<id>"}/temporadas/${seasonId ?? "<temporada_id>"}`}</EndpointTag>
            </div>
            {seasonLoading ? (
              <p className="competition-season-status">
                Cargando equipos…
              </p>
            ) : seasonError ? (
              <p className="competition-api-error" role="alert">
                No se pudieron cargar los equipos: {seasonError}
              </p>
            ) : seasonData?.equipos.length ? (
              <div className="associations-grid competition-team-grid">
                {seasonData.equipos.map((team, index) => (
                  <article
                    className="association-card competition-team-card"
                    key={team.id}
                  >
                    <span className="association-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <ImageWithFallback
                      url={team.escudo_url}
                      alt=""
                      className="competition-team-crest"
                      fallback={
                        <span className="competition-team-crest-placeholder">
                          {team.siglas || "—"}
                        </span>
                      }
                    />
                    <div>
                      <h4>
                        <EntityLink kind="equipo" id={team.id}>{team.nombre}</EntityLink>
                      </h4>
                      {team.siglas && <p>{team.siglas}</p>}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="competition-season-status">
                {seasonId === null
                  ? "Selecciona una temporada para ver sus equipos."
                  : "No hay equipos asociados a esta temporada."}
              </p>
            )}
          </div>
          <div className="competition-standings-panel">
            <div className="competition-subsection-heading">
              <div>
                <span className="section-label">CLASIFICACIÓN</span>
                <h3>Tabla de posiciones</h3>
              </div>
              <EndpointTag>{`/api/catalogo/competiciones/${competitionId ?? "<id>"}/temporadas/${seasonId ?? "<temporada_id>"}/tabla`}</EndpointTag>
            </div>
            <p className="competition-standings-description">
              La clasificación corresponde únicamente a la temporada
              seleccionada.
            </p>
            {seasonLoading ? (
              <p className="competition-season-status">
                Cargando clasificación…
              </p>
            ) : seasonError ? (
              <p className="competition-api-error" role="alert">
                No se pudo cargar la clasificación: {seasonError}
              </p>
            ) : seasonData?.tabla.length ? (
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
                    {seasonData.tabla.map((row, index) => (
                      <tr key={row.equipo.id}>
                        <td className="standings-position">{index + 1}</td>
                        <td className="standings-team">
                          <ImageWithFallback
                            url={row.equipo.imagen}
                            alt=""
                            fallback={<span>—</span>}
                          />
                          <strong>
                            <EntityLink kind="equipo" id={row.equipo.id}>
                              {row.equipo.nombre}
                            </EntityLink>
                          </strong>
                        </td>
                        <td>{row.partidos_jugados}</td>
                        <td>{row.ganados}</td>
                        <td>{row.empatados}</td>
                        <td>{row.perdidos}</td>
                        <td>{row.goles_favor}</td>
                        <td>{row.goles_contra}</td>
                        <td>{row.diferencia_goles}</td>
                        <td className="standings-points">{row.puntos}</td>
                        <td className="standings-form">{row.forma || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="competition-season-status">
                {seasonId === null
                  ? "Selecciona una temporada para ver la clasificación."
                  : "La API no devuelve filas para esta tabla (por ejemplo, en competiciones tipo copa)."}
              </p>
            )}
          </div>
        </section>
        
        <div className="competition-fixtures-panel">
            <div className="competition-subsection-heading fixtures-heading">
                <div>
                <span className="section-label">CALENDARIO DE TEMPORADA</span>
                <h3>Partidos</h3>
                </div>
                <EndpointTag>{`/api/catalogo/competiciones/${competitionId ?? "<id>"}/temporadas/${seasonId ?? "<temporada_id>"}/partidos`}</EndpointTag>
            </div>
            <div className="competition-date-toolbar">
                <span className="competition-season-scope">
                Partidos registrados en la temporada seleccionada
                </span>
            </div>
            {seasonLoading ? (
                <p className="competition-season-status">
                Cargando partidos…
                </p>
            ) : seasonError ? (
                <p className="competition-api-error" role="alert">
                No se pudieron cargar los partidos: {seasonError}
                </p>
            ) : seasonData?.partidos.length ? (
                <div className="competition-fixture-list">
                {seasonData.partidos.map((match) => {
                    const matchDate = formatMatchDate(match.fecha)
                    const isLive = match.estado === "EN_JUEGO"
                    const scoreAvailable =
                    match.goles.local !== null &&
                    match.goles.visitante !== null

                    return (
                    <article
                        className={`competition-fixture${isLive ? " fixture-live" : ""}`}
                        key={match.id}
                    >
                        <div className="fixture-date">
                        <strong>{matchDate.date}</strong>
                        <span>{matchDate.time}</span>
                        </div>
                        <div className="fixture-team fixture-home">
                        <ImageWithFallback
                            url={match.equipos.local.imagen}
                            alt=""
                            fallback={<span>—</span>}
                        />
                        <strong>
                            <EntityLink kind="equipo" id={match.equipos.local.id}>
                            {match.equipos.local.nombre}
                            </EntityLink>
                        </strong>
                        </div>
                        <div
                        className={`fixture-result${match.estado === "PROGRAMADO" ? " fixture-upcoming" : ""}`}
                        >
                        <strong>
                            {scoreAvailable
                            ? `${match.goles.local} — ${match.goles.visitante}`
                            : matchDate.time || "vs"}
                        </strong>
                        <span>
                            {isLive
                            ? `EN JUEGO${match.minuto_actual !== null ? ` · ${match.minuto_actual}'` : ""}`
                            : match.estado}
                        </span>
                        </div>
                        <div className="fixture-team fixture-away">
                        <ImageWithFallback
                            url={match.equipos.visitante.imagen}
                            alt=""
                            fallback={<span>—</span>}
                        />
                        <strong>
                            <EntityLink kind="equipo" id={match.equipos.visitante.id}>
                            {match.equipos.visitante.nombre}
                            </EntityLink>
                        </strong>
                        </div>
                        <span className="fixture-endpoint">TEMPORADA</span>
                    </article>
                    )
                })}
                </div>
            ) : (
                <p className="competition-season-status">
                {seasonId === null
                    ? "Selecciona una temporada para ver sus partidos."
                    : "No hay partidos disponibles para esta temporada."}
                </p>
            )}
            </div>

            <div className="competition-statistics-panel">
            <div className="competition-subsection-heading">
                <div>
                <span className="section-label">RESUMEN DE TEMPORADA</span>
                <h3>Estadísticas</h3>
                </div>
                <EndpointTag>{`/api/catalogo/competiciones/${competitionId ?? "<id>"}/temporadas/${seasonId ?? "<temporada_id>"}/estadisticas`}</EndpointTag>
            </div>
            {statisticsLoading ? (
                <p className="competition-season-status">Cargando estadísticas…</p>
            ) : statisticsError ? (
                <p className="competition-api-error" role="alert">
                No se pudieron cargar las estadísticas: {statisticsError}
                </p>
            ) : seasonStatistics ? (
                <CompetitionStatistics statistics={seasonStatistics} />
            ) : (
                <p className="competition-season-status">
                {seasonId === null
                    ? "Selecciona una temporada para ver sus estadísticas."
                    : "No hay estadísticas disponibles para esta temporada."}
                </p>
            )}
        </div>
        <aside className="country-implementation-note">
          <span className="country-note-mark">i</span>
          <p>
            Selecciona una competición y una temporada para cargar sus equipos,
            partidos, estadísticas y clasificación desde la API.
          </p>
        </aside>
      </div>
    </div>
  )
}
