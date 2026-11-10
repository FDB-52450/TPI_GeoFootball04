import { useEffect, useState, type ReactNode } from "react"
import ConfederationsPage from "./ConfederationsPage"
import CompetitionsPage from "./CompetitionsPage"
import CountriesPage from "./CountriesPage"
import TeamsPage from "./TeamsPage"
import PlayersPage from "./PlayersPage"
import { EntityLink, parseEntityRoute } from "./EntityNavigation"

type Match = {
  competition: string
  country: string
  flag: string
  minute: string
  dateOffset: number
  status: "live" | "played" | "upcoming"
  home: string
  away: string
  homeCode: string
  awayCode: string
  homeScore: number | null
  awayScore: number | null
  colorA: string
  colorB: string
}

function localDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function dateWithOffset(offset: number): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return localDateKey(date)
}

const navItems = [
  "Confederaciones",
  "Países",
  "Competiciones",
  "Equipos",
  "Jugadores",
  "Partidos",
]

const matches: Match[] = [
  {
    competition: "Premier League",
    country: "Inglaterra",
    flag: "GB",
    minute: "FINALIZADO",
    dateOffset: -1,
    status: "played",
    home: "Arsenal",
    away: "Manchester City",
    homeCode: "ARS",
    awayCode: "MCI",
    homeScore: 2,
    awayScore: 1,
    colorA: "#e52a34",
    colorB: "#6cb8e8",
  },
  {
    competition: "LaLiga",
    country: "España",
    flag: "ES",
    minute: "43'",
    dateOffset: 0,
    status: "live",
    home: "Real Madrid",
    away: "Real Sociedad",
    homeCode: "RMA",
    awayCode: "RSO",
    homeScore: 1,
    awayScore: 1,
    colorA: "#e8e8e3",
    colorB: "#1674c9",
  },
  {
    competition: "CONMEBOL Libertadores",
    country: "Sudamérica",
    flag: "SA",
    minute: "PROGRAMADO · 20:00",
    dateOffset: 1,
    status: "upcoming",
    home: "Flamengo",
    away: "River Plate",
    homeCode: "FLA",
    awayCode: "RIV",
    homeScore: null,
    awayScore: null,
    colorA: "#d72635",
    colorB: "#efefeb",
  },
  {
    competition: "Serie A",
    country: "Italia",
    flag: "IT",
    minute: "24'",
    dateOffset: 0,
    status: "live",
    home: "Inter",
    away: "Napoli",
    homeCode: "INT",
    awayCode: "NAP",
    homeScore: 0,
    awayScore: 0,
    colorA: "#1562bd",
    colorB: "#35a4df",
  },
]

const rankings = [
  ["1", "Liverpool", "ENG", "26", "60"],
  ["2", "Real Madrid", "ESP", "25", "57"],
  ["3", "Bayern München", "GER", "24", "55"],
  ["4", "Inter", "ITA", "25", "54"],
]

function Icon({
  children,
  size = 18,
  className = "",
}: {
  children: ReactNode
  size?: number
  className?: string
}) {
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

function HomeIcon() {
  return (
    <Icon size={17}>
      <path
        d="M3.5 10.7 12 3.8l8.5 6.9v8.8a1 1 0 0 1-1 1h-5v-6h-5v6h-5a1 1 0 0 1-1-1v-8.8Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </Icon>
  )
}

function BallMark() {
  return (
    <div className="ball-mark" aria-hidden="true">
      <svg viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r="17"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
        />
        <path
          d="m20 12 5.4 3.9-2.1 6.3h-6.6l-2.1-6.3L20 12Zm-5.4 3.9-5.2-1.6m7.3 7.9-3.1 5.3m9.7-5.3 3.1 5.3m-1-11.6 5.2-1.6M13.6 27.5l-1.1 5m13.9-5 1.1 5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
      </svg>
    </div>
  )
}

function TeamBadge({ code, color }: { code: string; color: string }) {
  return (
    <span
      className="team-badge"
      style={{ "--team-color": color } as React.CSSProperties}
    >
      <span>{code.slice(0, 1)}</span>
    </span>
  )
}

function MatchCard({ match }: { match: Match }) {
  const scoreAvailable = match.homeScore !== null && match.awayScore !== null

  return (
    <article className={`match-card match-card-${match.status}`}>
      <div className="match-meta">
        <div>
          <span className="country-code">{match.flag}</span>
          <EntityLink kind="competicion">{match.competition}</EntityLink>
        </div>
        <span className={`live-time match-status-${match.status}`}>
          {match.status === "live" && <span className="live-dot" />}
          {match.minute}
        </span>
      </div>

      <div className="match-teams">
        <div className="team">
          <TeamBadge code={match.homeCode} color={match.colorA} />
          <EntityLink kind="equipo">{match.home}</EntityLink>
        </div>
        <span className="team-score">{scoreAvailable ? match.homeScore : "—"}</span>
        <span className="score-divider">{match.status === "upcoming" ? "VS" : "—"}</span>
        <span className="team-score">{scoreAvailable ? match.awayScore : "—"}</span>
        <div className="team team-away">
          <EntityLink kind="equipo">{match.away}</EntityLink>
          <TeamBadge code={match.awayCode} color={match.colorB} />
        </div>
      </div>

      <div className="match-footer">
        <EntityLink kind="pais">{match.country}</EntityLink>
        <button
          className="text-button"
          type="button"
          aria-label={`Ver ${match.home} contra ${match.away}`}
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
        </button>
      </div>
    </article>
  )
}

export default function App() {
  const [route, setRoute] = useState(() => parseEntityRoute(window.location.hash))
  const [activeNav, setActiveNav] = useState(() => route?.page ?? "Home")
  const [selectedDate, setSelectedDate] = useState(() => dateWithOffset(0))
  const [competitionFilter, setCompetitionFilter] = useState("Todas")

  const selectedOffset = [-1, 0, 1].find(
    (offset) => dateWithOffset(offset) === selectedDate,
  )
  const dateShortcuts = [
    { label: "Ayer", offset: -1 },
    { label: "Hoy", offset: 0 },
    { label: "Mañana", offset: 1 },
  ]
  const dateMatches = matches.filter(
    (match) =>
      dateWithOffset(match.dateOffset) === selectedDate &&
      (competitionFilter === "Todas" || match.competition === competitionFilter),
  )
  const competitions = [...new Set(matches.map((match) => match.competition))]

  useEffect(() => {
    function handleHashChange() {
      const nextRoute = parseEntityRoute(window.location.hash)
      setRoute(nextRoute)
      if (nextRoute) setActiveNav(nextRoute.page)
    }

    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  function navigateToSection(section: string) {
    setActiveNav(section)
    setRoute(null)
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    )
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="nav-wrap">
          <button
            className="brand"
            type="button"
            onClick={() => navigateToSection("Home")}
            aria-label="Ir al inicio"
          >
            <BallMark />
            <span>GeoFootball</span>
          </button>

          <nav className="main-nav" aria-label="Navegación principal">
            <button
              className={`home-button ${activeNav === "Home" ? "active" : ""}`}
              type="button"
              onClick={() => navigateToSection("Home")}
            >
              <HomeIcon />
              Home
            </button>
            <span className="nav-separator" />
            {navItems.map((item) => (
              <button
                className={activeNav === item ? "active" : ""}
                key={item}
                type="button"
                onClick={() => navigateToSection(item)}
              >
                {item}
              </button>
            ))}
          </nav>

          <div className="nav-actions">
            <button className="icon-button" type="button" aria-label="Buscar">
              <Icon size={20}>
                <circle
                  cx="10.8"
                  cy="10.8"
                  r="6.8"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="m16 16 4.2 4.2"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                />
              </Icon>
            </button>
            <button
              className="menu-button"
              type="button"
              aria-label="Abrir menú"
            >
              <Icon size={22}>
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                />
              </Icon>
            </button>
          </div>
        </div>
      </header>

      <main>
        {activeNav === "Confederaciones" ? (
          <ConfederationsPage initialId={route?.page === "Confederaciones" ? route.id : null} />
        ) : activeNav === "Países" ? (
          <CountriesPage initialId={route?.page === "Países" ? route.id : null} />
        ) : activeNav === "Competiciones" ? (
          <CompetitionsPage initialId={route?.page === "Competiciones" ? route.id : null} />
        ) : activeNav === "Equipos" ? (
          <TeamsPage teamId={route?.page === "Equipos" ? route.id : null} />
        ) : activeNav === "Jugadores" ? (
          <PlayersPage playerId={route?.page === "Jugadores" ? route.id : null} />
        ) : (
          <>
            <section className="hero">
              <div className="hero-glow" />
              <div className="content hero-content">
                <div className="eyebrow">
                  <span className="live-dot" />
                  EN DIRECTO · FÚTBOL GLOBAL
                </div>
                <div className="hero-title-row">
                  <div>
                    <p className="kicker">
                      {activeNav === "Home"
                        ? "Todo el fútbol, en un solo lugar"
                        : `Explora: ${activeNav}`}
                    </p>
                    <h1>
                      El mundo juega.
                      <br />
                      <span>Vívelo en tiempo real.</span>
                    </h1>
                  </div>
                  <div className="hero-stat">
                    <strong>18</strong>
                    <span>partidos en vivo</span>
                    <small>en 12 países</small>
                  </div>
                </div>
              </div>
            </section>

            <div className="content dashboard">
              <section className="matches-section">
                <div className="section-heading">
                  <div>
                    <span className="section-label">MARCADOR GLOBAL</span>
                    <h2>{activeNav === "Partidos" ? "Partidos" : "Partidos en vivo"}</h2>
                  </div>
                  <div className="matches-controls">
                    <div className="date-switcher" aria-label="Seleccionar fecha">
                    {dateShortcuts.map(({ label, offset }) => (
                      <button
                        className={selectedOffset === offset ? "selected" : ""}
                        key={label}
                        type="button"
                        onClick={() => {
                          setSelectedDate(dateWithOffset(offset))
                        }}
                      >
                        {label}
                      </button>
                    ))}
                    </div>
                    <label className="match-date-picker">
                      <span>FECHA</span>
                      <input
                        aria-label="Elegir fecha de partidos"
                        type="date"
                        value={selectedDate}
                        onChange={(event) => {
                          setSelectedDate(event.target.value)
                        }}
                      />
                    </label>
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
                  </div>
                </div>

                <div className="matches-list">
                  {dateMatches.map((match) => (
                    <MatchCard
                      key={`${match.home}-${match.away}`}
                      match={match}
                    />
                  ))}
                  {!dateMatches.length && (
                    <p className="matches-empty-state">
                      No hay partidos de muestra para esta fecha y competición.
                    </p>
                  )}
                </div>
                <aside className="matches-api-note">
                  <span>DATOS DE DEMOSTRACIÓN</span>
                  <p>
                    <code>/api/partidos/</code> actualmente ofrece filtro por fecha solo para hoy y por temporada; el filtro arbitrario por fecha y competición de este boceto aún no está disponible en el endpoint.
                  </p>
                </aside>
              </section>

              <aside className="sidebar">
                <section className="side-card">
                  <div className="side-heading">
                    <div>
                      <span className="section-label">POWER RANKING</span>
                      <h3>Forma mundial</h3>
                    </div>
                    <button
                      className="more-button"
                      type="button"
                      aria-label="Más opciones"
                    >
                      •••
                    </button>
                  </div>
                  <div className="ranking-labels">
                    <span>CLUB</span>
                    <span>PJ</span>
                    <span>PTS</span>
                  </div>
                  <div className="ranking-list">
                    {rankings.map(
                      ([position, club, country, played, points], index) => (
                        <div className="ranking-row" key={club}>
                          <span className="rank-number">{position}</span>
                          <span className={`mini-crest crest-${index + 1}`}>
                            {club.slice(0, 1)}
                          </span>
                          <span className="rank-team">
                            <strong><EntityLink kind="equipo">{club}</EntityLink></strong>
                            <small><EntityLink kind="pais">{country}</EntityLink></small>
                          </span>
                          <span>{played}</span>
                          <strong>{points}</strong>
                        </div>
                      ),
                    )}
                  </div>
                  <button className="ranking-link" type="button">
                    Ver ranking completo <span>→</span>
                  </button>
                </section>

              </aside>
            </div>
          </>
        )}
      </main>

      <footer>
        <div className="content footer-inner">
          <span>GeoFootball</span>
          <p>Resultados globales. Una sola pasión.</p>
          <small>Actualizado hace 20 segundos</small>
        </div>
      </footer>
    </div>
  )
}
