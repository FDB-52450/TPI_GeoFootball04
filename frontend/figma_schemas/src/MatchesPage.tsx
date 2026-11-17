import { useEffect, useState, type ReactNode } from "react"
import { EntityLink } from "./EntityNavigation"
import {
  fetchTodayMatches,
  fetchUpcomingMatches,
  type Match,
} from "./api/matches"
import { ImageWithFallback } from "./utils/ImageWithFallback"

function Icon({children, size = 18, className = ""}: {children: ReactNode, size?: number, className?: string}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    >
      {children}
    </svg>
  )
}

function TeamBadge({ name, image }: { name: string; image: string }) {
  return (
    <ImageWithFallback
      url={image}
      alt=""
      className="team-badge-image"
      fallback={<span className="team-badge">{name.slice(0, 1)}</span>}
    />
  )
}

function statusPresentation(match: Match) {
  if (match.status === "EN_JUEGO") {
    return {
      className: "live",
      label: match.minute === null ? "EN VIVO" : `${match.minute}'`,
    }
  }
  if (match.status === "PROGRAMADO") {
    return { className: "upcoming", label: "PROGRAMADO" }
  }
  return {
    className: "played",
    label: match.status.replace(/_/g, " "),
  }
}

function statusFilterLabel(status: string): string {
  const label = status.replace(/_/g, " ").toLocaleLowerCase("es")
  return label.charAt(0).toLocaleUpperCase("es") + label.slice(1)
}

function formatMatchDate(dateValue: string): string {
  const date = new Date(dateValue)
  return Number.isNaN(date.getTime())
    ? dateValue
    : date.toLocaleString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
}

function MatchCard({ match }: { match: Match }) {
  const scoreAvailable = match.score.home !== null && match.score.away !== null
  const status = statusPresentation(match)

  return (
    <article className={`match-card match-card-${status.className}`}>
      <div className="match-meta">
        <div>
          <ImageWithFallback
            url={match.competition.image}
            alt=""
            className="match-competition-image"
            fallback={<span className="country-code">COMP</span>}
          />
          <EntityLink kind="competicion" id={match.competition.id}>
            {match.competition.name}
          </EntityLink>
        </div>
        <span className={`live-time match-status-${status.className}`}>
          {status.className === "live" && <span className="live-dot" />}
          {status.label}
        </span>
      </div>

      <div className="match-teams">
        <div className="team">
          <TeamBadge name={match.home.name} image={match.home.image} />
          <EntityLink kind="equipo" id={match.home.id}>{match.home.name}</EntityLink>
        </div>
        <span className={match.status == 'EN_JUEGO' ? 'team-score' : 'gray-team-score'}>{scoreAvailable ? match.score.home : "—"}</span>
        <span className="score-divider">{status.className === "upcoming" ? "VS" : "—"}</span>
        <span className={match.status == 'EN_JUEGO' ? 'team-score' : 'gray-team-score'}>{scoreAvailable ? match.score.away : "—"}</span>
        <div className="team team-away">
          <EntityLink kind="equipo" id={match.away.id}>{match.away.name}</EntityLink>
          <TeamBadge name={match.away.name} image={match.away.image} />
        </div>
      </div>

      <div className="match-footer">
        <div className="match-footer-info">
          <EntityLink kind="pais" id={match.competition.country.id}>
            {match.competition.country.name}
          </EntityLink>
          <time dateTime={match.date}>{formatMatchDate(match.date)}</time>
        </div>
        <EntityLink
          className="text-button"
          kind="partido"
          id={match.id}
        >
          Ver partido
          <Icon size={15}>
            <path
              d="m9 6 6 6-6 6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.8"
            />
          </Icon>
        </EntityLink>
      </div>
    </article>
  )
}

export default function MatchesPage() {
  const [todayMatches, setTodayMatches] = useState<Match[]>([])
  const [todayLoading, setTodayLoading] = useState(true)
  const [todayError, setTodayError] = useState<string | null>(null)
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([])
  const [upcomingLoading, setUpcomingLoading] = useState(true)
  const [upcomingError, setUpcomingError] = useState<string | null>(null)
  const [competitionFilter, setCompetitionFilter] = useState("Todas")
  const [statusFilter, setStatusFilter] = useState("Todos")

  useEffect(() => {
    let cancelled = false
    async function loadTodayMatches() {
      try {
        const result = await fetchTodayMatches()
        if (!cancelled) setTodayMatches(result)
      } catch (error) {
        if (!cancelled) {
          setTodayError(
            error instanceof Error ? error.message : "No se pudieron cargar los partidos de hoy.",
          )
        }
      } finally {
        if (!cancelled) setTodayLoading(false)
      }
    }

    void loadTodayMatches()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadUpcomingMatches() {
      try {
        const result = await fetchUpcomingMatches()
        if (!cancelled) {
          setUpcomingMatches(
            result
              .filter((match) => match.status === "PROGRAMADO")
              .sort((first, second) => first.date.localeCompare(second.date)),
          )
        }
      } catch (error) {
        if (!cancelled) {
          setUpcomingError(
            error instanceof Error ? error.message : "No se pudieron cargar los próximos partidos.",
          )
        }
      } finally {
        if (!cancelled) setUpcomingLoading(false)
      }
    }

    void loadUpcomingMatches()
    return () => {
      cancelled = true
    }
  }, [])

  const dateMatches = todayMatches.filter(
    (match) =>
      (competitionFilter === "Todas" ||
        match.competition.name === competitionFilter) &&
      (statusFilter === "Todos" || match.status === statusFilter),
  )
  const competitions = [
    ...new Set(todayMatches.map((match) => match.competition.name)),
  ]
  const statuses = [...new Set(todayMatches.map((match) => match.status))]
  const liveMatches = todayMatches.filter((match) => match.status === "EN_JUEGO")
  const liveCountries = new Set(
    liveMatches.map((match) => match.competition.country.id),
  ).size

  return (
    <div className="matches-page">
      <main>
        <section className="competitions-hero">
        <div className="content">
          <div className="confed-breadcrumb">
            INICIO <span>/</span> PARTIDOS
          </div>
          <div className="competitions-title-row">
            <div>
              <span className="section-label">TEMPORADAS Y CALENDARIOS</span>
              <h1>Partidos</h1>
              <p>Los partidos del dia, y las que se jugaran en las proximas fechas.</p>
            </div>
            <div className="hero-stat">
            <strong>{todayLoading ? "…" : todayError ? "—" : liveMatches.length}</strong>
              <span>partidos en vivo</span>
            {!todayLoading && !todayError && (
              <small>en {liveCountries} países</small>
            )}
            </div>
          </div>
        </div>
      </section>
            <div className="content dashboard">
              <section className="matches-section">
                <div className="section-heading">
                  <div>
                    <span className="section-label">MARCADOR GLOBAL</span>
                    <h2>Partidos del dia</h2>
                  </div>
                  <div className="matches-controls">
                    <label className="match-competition-filter">
                      <span>COMPETICIÓN</span>
                      <select
                        value={competitionFilter}
                        onChange={(event) => {
                          setCompetitionFilter(event.target.value)
                        }}
                      >
                        <option value="Todas">Todas</option>
                        {competitions.map((competition) => (
                          <option key={competition} value={competition}>{competition}</option>
                        ))}
                      </select>
                    </label>
                    <label className="match-status-filter">
                      <span>ESTADO</span>
                      <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                      >
                        <option value="Todos">Todos</option>
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {statusFilterLabel(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="matches-list">
                  {todayError && (
                    <p className="matches-error-state" role="alert">
                      No se pudieron cargar los partidos de hoy: {todayError}
                    </p>
                  )}
                  {todayLoading && (
                    <p className="matches-empty-state">Cargando partidos de hoy…</p>
                  )}
                  {dateMatches.map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                  {!todayLoading && !todayError && !dateMatches.length && (
                    <p className="matches-empty-state">
                      No hay partidos para hoy en esta competición.
                    </p>
                  )}
                </div>
              </section>

              <aside className="sidebar">
                <section className="side-card">
                  <div className="side-heading">
                    <div>
                      <span className="section-label">LO QUE SE VIENE</span>
                      <h3>Próximos partidos</h3>
                    </div>
                  </div>
                  {upcomingError && (
                    <p className="matches-error-state" role="alert">
                      No se pudieron cargar los próximos partidos: {upcomingError}
                    </p>
                  )}
                  {upcomingLoading ? (
                    <p className="upcoming-matches-message">Cargando próximos partidos…</p>
                  ) : !upcomingError && upcomingMatches.length ? (
                    <div className="upcoming-match-list">
                      {upcomingMatches.map((match) => (
                        <article className="upcoming-match" key={match.id}>
                          <time dateTime={match.date}>{formatMatchDate(match.date)}</time>
                          <div className="upcoming-match-teams">
                            <span>
                              <TeamBadge name={match.home.name} image={match.home.image} />
                              <EntityLink kind="equipo" id={match.home.id}>
                                {match.home.name}
                              </EntityLink>
                            </span>
                            <span>
                              <TeamBadge name={match.away.name} image={match.away.image} />
                              <EntityLink kind="equipo" id={match.away.id}>
                                {match.away.name}
                              </EntityLink>
                            </span>
                          </div>
                          <EntityLink
                            className="upcoming-match-competition"
                            kind="competicion"
                            id={match.competition.id}
                          >
                            {match.competition.name}
                          </EntityLink>
                          <EntityLink
                            className="upcoming-match-detail-link"
                            kind="partido"
                            id={match.id}
                          >
                            Ver detalle <span aria-hidden="true">→</span>
                          </EntityLink>
                        </article>
                      ))}
                    </div>
                  ) : !upcomingError ? (
                    <p className="upcoming-matches-message">
                      No hay próximos partidos en los siguientes siete días.
                    </p>
                  ) : null
                  }
                </section>
              </aside>
            </div>
      </main>
    </div>
  )
}
