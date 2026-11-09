import { useState, type ReactNode } from "react"
import ConfederationsPage from "./ConfederationsPage"
import CompetitionsPage from "./CompetitionsPage"
import CountriesPage from "./CountriesPage"

type Match = {
  competition: string
  country: string
  flag: string
  minute: string
  home: string
  away: string
  homeCode: string
  awayCode: string
  homeScore: number
  awayScore: number
  colorA: string
  colorB: string
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
    minute: "67'",
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
    minute: "81'",
    home: "Flamengo",
    away: "River Plate",
    homeCode: "FLA",
    awayCode: "RIV",
    homeScore: 3,
    awayScore: 2,
    colorA: "#d72635",
    colorB: "#efefeb",
  },
  {
    competition: "Serie A",
    country: "Italia",
    flag: "IT",
    minute: "24'",
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
  return (
    <article className="match-card">
      <div className="match-meta">
        <div>
          <span className="country-code">{match.flag}</span>
          <span>{match.competition}</span>
        </div>
        <span className="live-time">
          <span className="live-dot" />
          {match.minute}
        </span>
      </div>

      <div className="match-teams">
        <div className="team">
          <TeamBadge code={match.homeCode} color={match.colorA} />
          <span>{match.home}</span>
        </div>
        <span className="team-score">{match.homeScore}</span>
        <span className="score-divider">—</span>
        <span className="team-score">{match.awayScore}</span>
        <div className="team team-away">
          <span>{match.away}</span>
          <TeamBadge code={match.awayCode} color={match.colorB} />
        </div>
      </div>

      <div className="match-footer">
        <span>{match.country}</span>
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
  const [activeNav, setActiveNav] = useState("Home")
  const [selectedDay, setSelectedDay] = useState("Hoy")
  const [showAll, setShowAll] = useState(false)

  const visibleMatches = showAll ? matches : matches.slice(0, 3)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="nav-wrap">
          <button
            className="brand"
            type="button"
            onClick={() => setActiveNav("Home")}
            aria-label="Ir al inicio"
          >
            <BallMark />
            <span>GeoFootball</span>
          </button>

          <nav className="main-nav" aria-label="Navegación principal">
            <button
              className={`home-button ${activeNav === "Home" ? "active" : ""}`}
              type="button"
              onClick={() => setActiveNav("Home")}
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
                onClick={() => setActiveNav(item)}
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
          <ConfederationsPage />
        ) : activeNav === "Países" ? (
          <CountriesPage />
        ) : activeNav === "Competiciones" ? (
          <CompetitionsPage />
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
                    <h2>Partidos en vivo</h2>
                  </div>
                  <div className="date-switcher" aria-label="Seleccionar fecha">
                    {["Ayer", "Hoy", "Mañana"].map((day) => (
                      <button
                        className={selectedDay === day ? "selected" : ""}
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="matches-list">
                  {visibleMatches.map((match) => (
                    <MatchCard
                      key={`${match.home}-${match.away}`}
                      match={match}
                    />
                  ))}
                </div>

                <button
                  className="all-matches"
                  type="button"
                  onClick={() => setShowAll((current) => !current)}
                >
                  {showAll ? "Mostrar menos" : "Ver todos los partidos"}
                  <Icon size={16}>
                    <path
                      d={showAll ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"}
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeWidth="1.8"
                    />
                  </Icon>
                </button>
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
                            <strong>{club}</strong>
                            <small>{country}</small>
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

                <section className="news-card">
                  <span className="news-tag">HISTORIAS</span>
                  <p>Dentro del juego</p>
                  <h3>
                    Las cinco ligas que están redefiniendo el fútbol mundial
                  </h3>
                  <button type="button">
                    Leer historia <span>→</span>
                  </button>
                  <div className="pitch-lines" aria-hidden="true" />
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
