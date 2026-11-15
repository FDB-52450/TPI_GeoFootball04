import { useEffect, useMemo, useState } from "react"
import {
  fetchTeamDetails,
  fetchTeamCompetitionSeasonTable,
  fetchTeamMatches,
  fetchTeamPlayers,
  fetchTeams,
  type TeamCatalogItem,
  type TeamDetails,
  type TeamMatch,
  type TeamPlayer,
  type TeamSeasonTableRow,
} from "./api/teams"
import { EntityLink } from "./EntityNavigation"
import { ImageWithFallback } from "./utils/ImageWithFallback"

function EndpointTag({ children }: { children: string }) {
  return <code className="country-endpoint">{children}</code>
}

function DataNotice({
  title,
  children,
  status = "Sin endpoint disponible",
}: {
  title: string
  children: string
  status?: string
}) {
  return (
    <aside className="team-data-notice">
      <span aria-hidden="true">!</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
        <small>{status}</small>
      </div>
    </aside>
  )
}

function dateLabel(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
}

function formatCapacity(value: number | null) {
  return value === null ? "No informada" : new Intl.NumberFormat().format(value)
}

function formatStat(value: number | null, digits = 1): string {
  return value === null
    ? "—"
    : new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(value)
}

function averagePerMatch(total: number | null, matches: number): number | null {
  return total === null || matches === 0 ? null : total / matches
}

function rankLabel(rank: number | null): string {
  return rank === null ? "—" : `${rank}°`
}

function statRank(
  rows: TeamSeasonTableRow[],
  teamId: number,
  getValue: (row: TeamSeasonTableRow) => number | null,
  direction: "desc" | "asc" = "desc",
): number | null {
  const team = rows.find((row) => row.equipo.id === teamId)
  const value = team ? getValue(team) : null
  if (value === null) return null

  return 1 + rows.filter((row) => {
    const otherValue = getValue(row)
    if (row.equipo.id === teamId || otherValue === null) return false
    return direction === "desc" ? otherValue > value : otherValue < value
  }).length
}

function TeamStatMetric({
  title,
  value,
  detail,
  ranking,
}: {
  title: string
  value: string
  detail?: string
  ranking?: number | null
}) {
  return (
    <article className="team-season-stat">
      <span>{title}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
      {ranking !== undefined && (
        <small>{ranking === null ? "Posición: —" : `Posición: ${ranking}°`}</small>
      )}
    </article>
  )
}

function TeamSeasonStatistics({
  rows,
  teamId,
}: {
  rows: TeamSeasonTableRow[]
  teamId: number
}) {
  const team = rows.find((row) => row.equipo.id === teamId)
  if (!team) {
    return (
      <p className="team-empty-state">
        El equipo no figura en la tabla de esta competición y temporada.
      </p>
    )
  }

  const matches = team.partidos_jugados
  const goalsAgainstRank = statRank(rows, teamId, (row) => row.goles_contra, "asc")
  const expectedGoalsAgainst = team.xg_recibido
  const disciplineRate =
    team.faltas !== null && team.faltas > 0 &&
    team.tarjetas_amarillas !== null && team.tarjetas_rojas !== null
      ? ((team.tarjetas_amarillas + team.tarjetas_rojas) / team.faltas) * 100
      : null

  return (
    <div className="team-season-stats-content">
      <div className="team-season-stat-matches">
        <strong>{matches}</strong>
        <span>PARTIDOS JUGADOS</span>
      </div>
      <p className="team-season-stats-note">
        Los promedios de xG y xP usan los partidos jugados como divisor; pueden ser aproximados
        si faltan datos de esos indicadores para algunos partidos.
      </p>

      <section className="team-season-stat-section">
        <h3>Rendimiento general</h3>
        <div className="team-season-stat-grid">
          <TeamStatMetric
            title="Puntos"
            value={formatStat(team.puntos, 0)}
            detail={`${formatStat(averagePerMatch(team.puntos, matches))} por partido`}
            ranking={statRank(rows, teamId, (row) => row.puntos)}
          />
          <TeamStatMetric
            title="Puntos esperados (xP)"
            value={formatStat(team.puntos_esperados, 2)}
            detail={`${formatStat(averagePerMatch(team.puntos_esperados, matches), 2)} por partido`}
            ranking={statRank(rows, teamId, (row) => row.puntos_esperados)}
          />
          <TeamStatMetric
            title="Puntos como local"
            value={formatStat(team.puntos_local, 0)}
            detail={`xP: ${formatStat(team.puntos_esperados_local, 2)} · Pos. xP ${rankLabel(
              statRank(rows, teamId, (row) => row.puntos_esperados_local),
            )}`}
            ranking={statRank(rows, teamId, (row) => row.puntos_local)}
          />
          <TeamStatMetric
            title="Puntos como visitante"
            value={formatStat(team.puntos_visitante, 0)}
            detail={`xP: ${formatStat(team.puntos_esperados_visitante, 2)} · Pos. xP ${rankLabel(
              statRank(rows, teamId, (row) => row.puntos_esperados_visitante),
            )}`}
            ranking={statRank(rows, teamId, (row) => row.puntos_visitante)}
          />
        </div>
      </section>

      <section className="team-season-stat-section">
        <h3>Rendimiento ofensivo</h3>
        <div className="team-season-stat-grid">
          <TeamStatMetric
            title="Goles a favor"
            value={formatStat(team.goles_favor, 0)}
            detail={`${formatStat(averagePerMatch(team.goles_favor, matches))} por partido`}
            ranking={statRank(rows, teamId, (row) => row.goles_favor)}
          />
          <TeamStatMetric
            title="xG generado"
            value={formatStat(team.xg_generado, 2)}
            detail={`${formatStat(averagePerMatch(team.xg_generado, matches), 2)} por partido`}
            ranking={statRank(rows, teamId, (row) => row.xg_generado)}
          />
          <TeamStatMetric
            title="Tiros"
            value={formatStat(team.tiros_total, 0)}
            detail={`${formatStat(team.tiros_a_puerta, 0)} a puerta · ${
              team.tiros_total !== null && team.tiros_total > 0 && team.tiros_a_puerta !== null
                ? `${formatStat((team.tiros_a_puerta / team.tiros_total) * 100)}% a puerta`
                : "porcentaje no disponible"
            }`}
          />
          <TeamStatMetric
            title="Ataques"
            value={formatStat(team.ataques, 0)}
            detail={`${formatStat(team.ataques_peligrosos, 0)} peligrosos · ${
              team.ataques !== null && team.ataques > 0 && team.ataques_peligrosos !== null
                ? `${formatStat((team.ataques_peligrosos / team.ataques) * 100)}% peligrosos`
                : "porcentaje no disponible"
            }`}
          />
          {/*<TeamStatMetric title="Faltas recibidas" value="—" detail="No disponible en la tabla" />*/}
        </div>
      </section>

      <section className="team-season-stat-section">
        <h3>Rendimiento defensivo</h3>
        <div className="team-season-stat-grid">
          <TeamStatMetric
            title="Goles recibidos"
            value={formatStat(team.goles_contra, 0)}
            detail={`${formatStat(averagePerMatch(team.goles_contra, matches))} por partido`}
            ranking={goalsAgainstRank}
          />
          <TeamStatMetric
            title="xG recibido"
            value={formatStat(expectedGoalsAgainst, 2)}
            detail={`${formatStat(averagePerMatch(expectedGoalsAgainst, matches), 2)} por partido`}
            ranking={statRank(rows, teamId, (row) => row.xg_recibido, "asc")}
          />
          {/*
          <TeamStatMetric title="Tiros recibidos / a puerta" value="—" detail="No disponible en la tabla" />
          <TeamStatMetric title="Ataques recibidos / peligrosos" value="—" detail="No disponible en la tabla" />
          */}
          <TeamStatMetric
            title="Disciplina"
            value={`${formatStat(team.faltas, 0)} faltas`}
            detail={`${formatStat(team.tarjetas_amarillas, 0)} amarillas · ${formatStat(
              team.tarjetas_rojas,
              0,
            )} rojas · ${
              disciplineRate === null
                ? "porcentaje de tarjetas por falta no disponible"
                : `${formatStat(disciplineRate)}% tarjetas por falta`
            }`}
          />
        </div>
      </section>

      <section className="team-season-stat-section">
        <h3>Estilo de juego</h3>
        <div className="team-season-stat-grid">
          <TeamStatMetric
            title="Posesión"
            value={team.posesion === null ? "—" : `${formatStat(team.posesion)}%`}
            ranking={statRank(rows, teamId, (row) => row.posesion)}
          />
          <TeamStatMetric
            title="Córneres"
            value={formatStat(team.corners, 0)}
            ranking={statRank(rows, teamId, (row) => row.corners)}
          />
          <TeamStatMetric
            title="Fueras de juego"
            value={formatStat(team.offsides, 0)}
            ranking={statRank(rows, teamId, (row) => row.offsides)}
          />
        </div>
      </section>
    </div>
  )
}

function TeamMatchRow({ match, teamId }: { match: TeamMatch; teamId: number | null }) {
  const hasScore = match.goles.local !== null && match.goles.visitante !== null
  const teamGoals =
    teamId === match.equipos.local.id
      ? match.goles.local
      : teamId === match.equipos.visitante.id
        ? match.goles.visitante
        : null
  const opponentGoals =
    teamId === match.equipos.local.id
      ? match.goles.visitante
      : teamId === match.equipos.visitante.id
        ? match.goles.local
        : null
  const result =
    !hasScore || teamGoals === null || opponentGoals === null
      ? ""
      : teamGoals > opponentGoals
        ? "team-match-win"
        : teamGoals < opponentGoals
          ? "team-match-loss"
          : "team-match-draw"

  return (
    <article className="team-match-row">
      <div className="team-match-date">
        <strong>{dateLabel(match.fecha)}</strong>
        <span>{match.estado.replace(/_/g, " ")}</span>
      </div>
      <EntityLink kind="equipo" id={match.equipos.local.id} className="team-match-side">
        <ImageWithFallback
          url={match.equipos.local.imagen}
          alt=""
          fallback={
            <span className="team-match-image-fallback">
              {match.equipos.local.nombre.slice(0, 1)}
            </span>
          }
        />
        <strong>{match.equipos.local.nombre}</strong>
      </EntityLink>
      <strong className={`team-match-score ${result}`}>
        {hasScore ? `${match.goles.local} — ${match.goles.visitante}` : "vs"}
      </strong>
      <EntityLink kind="equipo" id={match.equipos.visitante.id} className="team-match-side team-match-away">
        <strong>{match.equipos.visitante.nombre}</strong>
        <ImageWithFallback
          url={match.equipos.visitante.imagen}
          alt=""
          fallback={
            <span className="team-match-image-fallback">
              {match.equipos.visitante.nombre.slice(0, 1)}
            </span>
          }
        />
      </EntityLink>
      <EntityLink kind="competicion" id={match.competicion.id} className="team-match-competition">
        {match.competicion.nombre}
      </EntityLink>
    </article>
  )
}

export default function TeamsPage({ teamId }: { teamId: number | null }) {
  const [teams, setTeams] = useState<TeamCatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(teamId)
  const [details, setDetails] = useState<TeamDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [players, setPlayers] = useState<TeamPlayer[]>([])
  const [playersLoading, setPlayersLoading] = useState(false)
  const [playersError, setPlayersError] = useState<string | null>(null)
  const [matches, setMatches] = useState<TeamMatch[]>([])
  const [matchesLoading, setMatchesLoading] = useState(false)
  const [matchesError, setMatchesError] = useState<string | null>(null)
  const [competitionFilter, setCompetitionFilter] = useState("all")
  const [seasonFilter, setSeasonFilter] = useState("all")
  const [showingSeasonStats, setShowingSeasonStats] = useState(false)
  const [statsCompetitionId, setStatsCompetitionId] = useState<number | null>(null)
  const [statsSeasonId, setStatsSeasonId] = useState<number | null>(null)
  const [seasonStatsRows, setSeasonStatsRows] = useState<TeamSeasonTableRow[]>([])
  const [seasonStatsLoading, setSeasonStatsLoading] = useState(false)
  const [seasonStatsError, setSeasonStatsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadTeams() {
      try {
        const result = await fetchTeams()
        if (!cancelled) {
          setTeams(result)
          setSelectedId((current) => current ?? teamId ?? result[0]?.id ?? null)
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogError(error instanceof Error ? error.message : "No se pudo cargar el catálogo de equipos.")
        }
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    }

    void loadTeams()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (teamId !== null) setSelectedId(teamId)
  }, [teamId])

  useEffect(() => {
    setCompetitionFilter("all")
    setSeasonFilter("all")
    setShowingSeasonStats(false)
    setStatsCompetitionId(null)
    setStatsSeasonId(null)
    setSeasonStatsRows([])
    setSeasonStatsError(null)
    if (selectedId === null) {
      setDetails(null)
      setDetailsError(null)
      setDetailsLoading(false)
      setMatches([])
      setMatchesError(null)
      setMatchesLoading(false)
      setPlayers([])
      setPlayersError(null)
      setPlayersLoading(false)
      return
    }

    const id = selectedId
    let cancelled = false
    setDetails(null)
    setDetailsError(null)
    setDetailsLoading(true)
    async function loadDetails() {
      try {
        const result = await fetchTeamDetails(id)
        if (!cancelled) {
          setDetails(result)
          setSeasonFilter(
            result.temporadas.length
              ? String(result.temporadas[result.temporadas.length - 1].id)
              : "all",
          )
        }
      } catch (error) {
        if (!cancelled) setDetailsError(error instanceof Error ? error.message : "No se pudo cargar el equipo.")
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
      setPlayers([])
      setPlayersError(null)
      setPlayersLoading(false)
      return
    }
    const id = selectedId
    let cancelled = false
    setPlayers([])
    setPlayersError(null)
    setPlayersLoading(true)
    async function loadPlayers() {
      try {
        const result = await fetchTeamPlayers(id)
        if (!cancelled) setPlayers(result)
      } catch (error) {
        if (!cancelled) setPlayersError(error instanceof Error ? error.message : "No se pudo cargar la plantilla.")
      } finally {
        if (!cancelled) setPlayersLoading(false)
      }
    }
    void loadPlayers()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  useEffect(() => {
    if (selectedId === null) {
      setMatches([])
      setMatchesError(null)
      setMatchesLoading(false)
      return
    }
    const id = selectedId
    let cancelled = false
    setMatches([])
    setMatchesError(null)
    setMatchesLoading(true)
    async function loadMatches() {
      try {
        const result = await fetchTeamMatches(id)
        if (!cancelled) setMatches(result)
      } catch (error) {
        if (!cancelled) setMatchesError(error instanceof Error ? error.message : "No se pudieron cargar los partidos.")
      } finally {
        if (!cancelled) setMatchesLoading(false)
      }
    }
    void loadMatches()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  useEffect(() => {
    if (
      !showingSeasonStats ||
      statsCompetitionId === null ||
      statsSeasonId === null
    ) {
      setSeasonStatsRows([])
      setSeasonStatsError(null)
      setSeasonStatsLoading(false)
      return
    }

    const competitionId = statsCompetitionId
    const seasonId = statsSeasonId
    let cancelled = false
    setSeasonStatsRows([])
    setSeasonStatsError(null)
    setSeasonStatsLoading(true)
    async function loadSeasonStats() {
      try {
        const result = await fetchTeamCompetitionSeasonTable(
          competitionId,
          seasonId,
        )
        if (!cancelled) setSeasonStatsRows(result)
      } catch (error) {
        if (!cancelled) {
          setSeasonStatsError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las estadísticas de la temporada.",
          )
        }
      } finally {
        if (!cancelled) setSeasonStatsLoading(false)
      }
    }
    void loadSeasonStats()
    return () => {
      cancelled = true
    }
  }, [showingSeasonStats, statsCompetitionId, statsSeasonId])

  const selectedTeam = details ?? teams.find(({ id }) => id === selectedId) ?? null
  const availableSeasons = useMemo(() => {
    const competitions = details?.competiciones ?? []
    return competitions.flatMap((competition) =>
      competition.temporadas.map((season) => ({ ...season, competicion: competition })),
    )
  }, [details])
  const statsCompetitions = (details?.competiciones ?? []).filter(
    (competition) => competition.temporadas.length > 0,
  )
  const selectedStatsCompetition = statsCompetitions.find(
    (competition) => competition.id === statsCompetitionId,
  ) ?? null
  const selectedStatsSeason = selectedStatsCompetition?.temporadas.find(
    (season) => season.id === statsSeasonId,
  ) ?? null
  const filteredMatches = matches.filter((match) => {
    const matchesCompetition =
      competitionFilter === "all" || String(match.competicion.id) === competitionFilter
    const matchesSeason = seasonFilter === "all" || String(match.temporada.id) === seasonFilter
    return matchesCompetition && matchesSeason
  })
  const currentSeasonMatches = matches.filter(
    (match) => match.temporada.id === details?.temporadas.at(-1)?.id,
  ).length

  return (
    <div className="teams-page">
      <section className="team-page-hero">
        <div className="content">
          <div className="confed-breadcrumb">INICIO <span>/</span> EQUIPOS</div>
          <div className="team-page-title-row">
            <div>
              <span className="section-label">PERFIL DE CLUB</span>
              <h1>Equipos</h1>
              <p>Identidad, estadio, competencias y recorrido deportivo.</p>
            </div>
            <label className="team-select-field">
              <span>EQUIPO</span>
              <select
                disabled={catalogLoading || Boolean(catalogError)}
                value={selectedId ?? ""}
                onChange={(event) => setSelectedId(event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">{catalogLoading ? "Cargando equipos…" : "Seleccionar equipo"}</option>
                {teams.map((team) => (
                  <option value={team.id} key={team.id}>{team.nombre}</option>
                ))}
              </select>
              <EndpointTag>/api/catalogo/equipos/</EndpointTag>
              {catalogError && <span className="team-api-error" role="alert">{catalogError}</span>}
            </label>
          </div>
        </div>
      </section>

      <div className="content team-page-content">
        {detailsError && <p className="team-api-error" role="alert">No se pudo cargar el equipo: {detailsError}</p>}
        <section className="team-profile-card">
          <div className="team-profile-identity">
            <div className="team-profile-crest">
              <ImageWithFallback
                url={selectedTeam?.escudo_url ?? ""}
                alt={selectedTeam ? `Escudo de ${selectedTeam.nombre}` : ""}
                fallback={selectedTeam?.siglas || "EQ"}
              />
            </div>
            <div>
              <span className="team-profile-kicker">IDENTIDAD DEL EQUIPO</span>
              <h2>
                {selectedTeam ? (
                  <EntityLink kind="equipo" id={selectedTeam.id}>{selectedTeam.nombre}</EntityLink>
                ) : detailsLoading ? "Cargando equipo…" : "Selecciona un equipo"}
              </h2>
              <p>{selectedTeam?.siglas || "Nombre, siglas y escudo"}</p>
              <EndpointTag>/api/catalogo/equipos/&lt;equipo_id&gt;</EndpointTag>
            </div>
          </div>
          <div className="team-profile-stat">
            <strong>{detailsLoading ? "…" : details?.competiciones.length ?? "—"}</strong>
            <span>COMPETICIONES</span>
          </div>
        </section>

        {showingSeasonStats ? (
          <section className="team-info-panel team-season-stats-panel">
            <div className="team-season-stats-toolbar">
              <button
                className="team-season-stats-back"
                onClick={() => setShowingSeasonStats(false)}
                type="button"
              >
                <span aria-hidden="true">←</span> Volver a Equipos
              </button>
              <label>
                <span>COMPETICIÓN</span>
                <select
                  disabled={!statsCompetitions.length}
                  value={statsCompetitionId ?? ""}
                  onChange={(event) => {
                    const nextId = event.target.value ? Number(event.target.value) : null
                    const nextCompetition = statsCompetitions.find(
                      (competition) => competition.id === nextId,
                    )
                    setStatsCompetitionId(nextId)
                    setStatsSeasonId(nextCompetition?.temporadas[0]?.id ?? null)
                  }}
                >
                  {statsCompetitions.map((competition) => (
                    <option key={competition.id} value={competition.id}>
                      {competition.nombre}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>TEMPORADA</span>
                <select
                  disabled={!selectedStatsCompetition?.temporadas.length}
                  value={statsSeasonId ?? ""}
                  onChange={(event) =>
                    setStatsSeasonId(event.target.value ? Number(event.target.value) : null)
                  }
                >
                  {selectedStatsCompetition?.temporadas.map((season) => (
                    <option key={season.id} value={season.id}>
                      {season.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <header className="team-season-stats-heading">
              <div>
                <span className="section-label">ESTADÍSTICAS DE TEMPORADA</span>
                <h3>
                  {selectedStatsCompetition?.nombre ?? "Selecciona una competición"}
                  {selectedStatsSeason ? ` · ${selectedStatsSeason.etiqueta}` : ""}
                </h3>
              </div>
              <EndpointTag>{`/api/catalogo/competiciones/${statsCompetitionId ?? "<comp_id>"}/temporadas/${statsSeasonId ?? "<tempor_id>"}/tabla`}</EndpointTag>
            </header>
            {seasonStatsLoading ? (
              <p className="team-empty-state">Cargando estadísticas de la temporada…</p>
            ) : seasonStatsError ? (
              <p className="team-api-error" role="alert">
                No se pudieron cargar las estadísticas: {seasonStatsError}
              </p>
            ) : seasonStatsRows.length && selectedId !== null ? (
              <TeamSeasonStatistics rows={seasonStatsRows} teamId={selectedId} />
            ) : (
              <p className="team-empty-state">
                {selectedStatsSeason
                  ? "No hay estadísticas disponibles para esta temporada."
                  : "Selecciona una competición y una temporada."}
              </p>
            )}
          </section>
        ) : (
          <>
        <div className="team-overview-grid">
          <section className="team-info-panel">
            <header className="team-panel-heading">
              <div><span className="section-label">AFILIACIÓN</span><h3>País y confederación</h3></div>
              <EndpointTag>/api/catalogo/equipos/&lt;equipo_id&gt;</EndpointTag>
            </header>
            <DataNotice title="No se exponen en el detalle del equipo" status="No expuesto por la API">
              La respuesta de equipos no incluye país ni confederación; esos vínculos no se pueden resolver desde los endpoints actuales.
            </DataNotice>
          </section>

          <section className="team-info-panel">
            <header className="team-panel-heading">
              <div><span className="section-label">SEDE</span><h3>Estadio</h3></div>
              <EndpointTag>/api/catalogo/equipos/&lt;equipo_id&gt;</EndpointTag>
            </header>
            {details?.estadio ? (
              <div className="team-stadium">
                <ImageWithFallback
                  url={details.estadio.foto_url}
                  alt={`Foto de ${details.estadio.nombre}`}
                  fallback={
                    <span className="team-stadium-image-fallback">
                      {details.estadio.nombre.slice(0, 1)}
                    </span>
                  }
                />
                <div>
                  <strong>{details.estadio.nombre}</strong>
                  <span>{details.estadio.ciudad || "Ciudad no informada"}</span>
                  <small>Capacidad · {formatCapacity(details.estadio.capacidad)}</small>
                </div>
                <p>La API devuelve la ciudad, pero no dirección ni coordenadas precisas.</p>
              </div>
            ) : (
              <p className="team-empty-state">{detailsLoading ? "Cargando estadio…" : "No hay un estadio asociado."}</p>
            )}
          </section>
        </div>

        <section className="team-info-panel team-competitions-panel">
          <header className="team-panel-heading">
            <div><span className="section-label">PARTICIPACIÓN</span><h3>Competencias y temporadas</h3></div>
            <EndpointTag>/api/catalogo/equipos/&lt;equipo_id&gt;</EndpointTag>
          </header>
          {details?.competiciones.length ? (
            <div className="team-competition-grid">
              {details.competiciones.map((competition) => (
                <article className="team-competition-card" key={competition.id}>
                  <ImageWithFallback
                    url={competition.logo_url}
                    alt=""
                    fallback={
                      <span className="team-competition-image-fallback">
                        {competition.nombre.slice(0, 1)}
                      </span>
                    }
                  />
                  <div>
                    <EntityLink kind="competicion" id={competition.id}>{competition.nombre}</EntityLink>
                    <span>{competition.tipo}</span>
                    <small>{competition.temporadas.map(({ etiqueta }) => etiqueta).join(" · ") || "Sin temporadas"}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="team-empty-state">{detailsLoading ? "Cargando competencias…" : "No hay competencias registradas para este equipo."}</p>
          )}
          {statsCompetitions.length > 0 && (
            <div className="team-competition-footer">
              <button
                className="team-view-detail-link"
                onClick={() => {
                  const firstSeason = availableSeasons[0]
                  if (!firstSeason) return
                  setStatsCompetitionId(firstSeason.competicion.id)
                  setStatsSeasonId(firstSeason.id)
                  setShowingSeasonStats(true)
                }}
                type="button"
              >
                Ver detalle <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </section>

        <div className="team-overview-grid">
          <section className="team-info-panel">
            <header className="team-panel-heading">
              <div><span className="section-label">PLANTILLA</span><h3>Jugadores</h3></div>
              <EndpointTag>{`/api/partidos/jugadores/?equipo_id=${selectedId ?? ""}`}</EndpointTag>
            </header>
            {playersLoading ? (
              <p className="team-empty-state">Consultando la plantilla…</p>
            ) : playersError ? (
              <p className="team-api-error" role="alert">No se pudo consultar la plantilla: {playersError}</p>
            ) : players.length ? (
              <div className="team-player-grid">
                {players.map((player) => (
                  <article className="team-player-card" key={player.id}>
                    <EntityLink kind="jugador" id={player.id}>
                      <ImageWithFallback
                        url={player.foto_url}
                        alt=""
                        fallback={
                          <span className="team-player-initial">
                            {player.nombre.slice(0, 1).toLocaleUpperCase()}
                          </span>
                        }
                      />
                      <strong>{player.nombre}</strong>
                    </EntityLink>
                  </article>
                ))}
              </div>
            ) : (
              <p className="team-empty-state">
                No hay jugadores registrados para este equipo.
              </p>
            )}
          </section>
          <DataNotice title="Palmarés histórico">
            No hay un endpoint ni un recurso de títulos históricos en la API disponible.
          </DataNotice>
        </div>

        <section className="team-info-panel team-matches-panel">
          <header className="team-panel-heading team-matches-heading">
            <div><span className="section-label">HISTORIAL DE PARTIDOS</span><h3>Partidos del equipo</h3></div>
            <EndpointTag>/api/catalogo/equipos/&lt;equipo_id&gt;/partidos</EndpointTag>
          </header>
          <div className="team-match-summary">
            <article><strong>{matchesLoading ? "…" : matches.length}</strong><span>EN TOTAL</span></article>
            <article><strong>{matchesLoading ? "…" : currentSeasonMatches}</strong><span>TEMPORADA MÁS RECIENTE</span></article>
            <article><strong>{filteredMatches.length}</strong><span>SEGÚN FILTROS</span></article>
          </div>
          <div className="team-match-filters">
            <label>
              <span>COMPETICIÓN</span>
              <select
                value={competitionFilter}
                onChange={(event) => {
                  setCompetitionFilter(event.target.value)
                  setSeasonFilter("all")
                }}
              >
                <option value="all">Todas las competiciones</option>
                {details?.competiciones.map((competition) => (
                  <option key={competition.id} value={competition.id}>{competition.nombre}</option>
                ))}
              </select>
            </label>
            <label>
              <span>TEMPORADA</span>
              <select value={seasonFilter} onChange={(event) => setSeasonFilter(event.target.value)}>
                <option value="all">Todas las temporadas</option>
                {availableSeasons
                  .filter(({ competicion }) => competitionFilter === "all" || String(competicion.id) === competitionFilter)
                  .map((season) => (
                    <option key={season.id} value={season.id}>{season.competicion.nombre} · {season.etiqueta}</option>
                  ))}
              </select>
            </label>
          </div>
          <div className="team-matches-endpoints">
            <EndpointTag>/api/catalogo/equipos/&lt;equipo_id&gt;/partidos</EndpointTag>
            <span>Con temporada: <EndpointTag>?temporada_id=&lt;temporada_id&gt;</EndpointTag></span>
          </div>
          {matchesError && <p className="team-api-error" role="alert">No se pudieron cargar los partidos: {matchesError}</p>}
          {matchesLoading ? (
            <p className="team-empty-state">Cargando partidos…</p>
          ) : filteredMatches.length ? (
            <div className="team-match-list">{filteredMatches.map((match) => <TeamMatchRow key={match.id} match={match} teamId={selectedId} />)}</div>
          ) : (
            <p className="team-empty-state">{selectedId === null ? "Selecciona un equipo para consultar sus partidos." : "No hay partidos para estos filtros."}</p>
          )}
        </section>
          </>
        )}
      </div>
    </div>
  )
}