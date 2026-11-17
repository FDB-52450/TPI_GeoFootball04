import { useEffect, useState } from "react"
import {
  fetchMatchDetails,
  type MatchEvent,
  type MatchDetails,
  type MatchLineupEntry,
  type MatchPlayer,
  type MatchStatistics,
} from "./api/matches"
import { EntityLink } from "./EntityNavigation"
import { ImageWithFallback } from "./utils/ImageWithFallback"
import { getSeasonLabel } from "./utils/seasonLabel"

const statisticDefinitions: {
  key: keyof MatchStatistics
  label: string
  digits: number
  suffix?: string
}[] = [
  { key: "xg", label: "Goles esperados (xG)", digits: 2 },
  { key: "xg_prematch", label: "xG previo al partido", digits: 2 },
  { key: "tiros_total", label: "Tiros totales", digits: 0 },
  { key: "tiros_a_puerta", label: "Tiros a puerta", digits: 0 },
  { key: "tiros_fuera", label: "Tiros fuera", digits: 0 },
  { key: "posesion", label: "Posesión", digits: 1, suffix: "%" },
  { key: "corners", label: "Córneres", digits: 0 },
  { key: "offsides", label: "Fueras de juego", digits: 0 },
  { key: "tarjetas_amarillas", label: "Tarjetas amarillas", digits: 0 },
  { key: "tarjetas_rojas", label: "Tarjetas rojas", digits: 0 },
  { key: "faltas", label: "Faltas", digits: 0 },
  { key: "ataques", label: "Ataques", digits: 0 },
  { key: "ataques_peligrosos", label: "Ataques peligrosos", digits: 0 },
]

type MatchSection = "alineacion" | "estadisticas" | "eventos"

const matchSections: { id: MatchSection; label: string }[] = [
  { id: "alineacion", label: "Alineación" },
  { id: "estadisticas", label: "Estadísticas" },
  { id: "eventos", label: "Eventos" },
]

function EndpointTag({ children }: { children: string }) {
  return <code className="country-endpoint">{children}</code>
}

function formatStatistic(
  value: number | null,
  digits: number,
  suffix = "",
): string {
  if (value === null) return "—"
  return `${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: digits,
  }).format(value)}${suffix}`
}

function formatMatchDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("es-AR", {
        dateStyle: "full",
        timeStyle: "short",
      })
}

function statusLabel(match: MatchDetails): string {
  if (match.status === "EN_JUEGO") {
    return match.minute === null ? "EN VIVO" : `EN VIVO · ${match.minute}′`
  }
  return match.status.replace(/_/g, " ")
}

function TeamEmblem({
  name,
  image,
}: {
  name: string
  image: string
}) {
  return (
    <ImageWithFallback
      url={image}
      alt=""
      className="match-detail-team-emblem"
      fallback={<span className="match-detail-team-emblem-fallback">{name.slice(0, 1)}</span>}
    />
  )
}

function MatchContext({
  match,
  endpoint,
}: {
  match: MatchDetails
  endpoint: string
}) {
  const hasCoordinates =
    match.stadium.latitude !== null && match.stadium.longitude !== null

  return (
    <section className="match-detail-context" aria-label="Estadio y competición">
      <article className="match-detail-context-card">
        <div className="match-detail-context-heading">
          <span className="section-label">SEDE</span>
          <span aria-hidden="true">⌖</span>
        </div>
        <h2>{match.stadium.name || "Estadio no informado"}</h2>
        {hasCoordinates ? (
          <p>
            {match.stadium.latitude}, {match.stadium.longitude}
          </p>
        ) : (
          <p>El endpoint no informa coordenadas para este estadio.</p>
        )}
        <EndpointTag>{`${endpoint} → partido.estadio`}</EndpointTag>
      </article>

      <article className="match-detail-context-card">
        <div className="match-detail-context-heading">
          <span className="section-label">COMPETICIÓN</span>
          <span aria-hidden="true">◈</span>
        </div>
        <div className="match-detail-competition">
          <ImageWithFallback
            url={match.competition.image}
            alt=""
            className="match-detail-competition-emblem"
            fallback={<span className="match-detail-competition-fallback">C</span>}
          />
          <div>
            <EntityLink
              kind="competicion"
              id={match.competition.id}
              className="match-detail-competition-link"
            >
              {match.competition.name}
            </EntityLink>
            <p>
              Temporada {getSeasonLabel(match.season.periodo)}
              {match.week !== null ? ` · Fecha ${match.week}` : ""}
            </p>
          </div>
        </div>
        <EndpointTag>{`${endpoint} → partido.competicion`}</EndpointTag>
      </article>
    </section>
  )
}

function LineupPlayer({ entry }: { entry: MatchLineupEntry }) {
  const player = entry.player
  const displayName = player?.nickname || player?.name || "Jugador no disponible"
  const appearance = (() => {
    if (entry.minuteIn !== null && entry.minuteOut !== null) {
      return `${entry.minuteIn}′–${entry.minuteOut}′`
    }
    if (entry.minuteIn !== null) return `Desde ${entry.minuteIn}′`
    if (entry.minuteOut !== null) return `Hasta ${entry.minuteOut}′`
    return null
  })()

  return (
    <li className="match-lineup-player">
      <span className="match-lineup-number">{entry.number ?? "—"}</span>
      {player?.image ? (
        <ImageWithFallback
          url={player.image}
          alt=""
          className="match-lineup-avatar"
          fallback={<span className="match-lineup-avatar-fallback">{displayName.slice(0, 1)}</span>}
        />
      ) : (
        <span className="match-lineup-avatar-fallback">{displayName.slice(0, 1)}</span>
      )}
      <div className="match-lineup-player-info">
        {player ? (
          <EntityLink kind="jugador" id={player.id}>
            {displayName}
          </EntityLink>
        ) : (
          <strong>{displayName}</strong>
        )}
        <small>
          {[entry.position || null, appearance].filter(Boolean).join(" · ") || "Datos adicionales no informados"}
        </small>
      </div>
    </li>
  )
}

function TeamLineup({
  teamName,
  entries,
}: {
  teamName: string
  entries: MatchLineupEntry[]
}) {
  const starters = entries.filter((entry) => entry.starter)
  const substitutes = entries.filter((entry) => !entry.starter)

  function roster(title: string, players: MatchLineupEntry[]) {
    return (
      <section className="match-lineup-roster">
        <h4>
          {title}
          <span>{players.length}</span>
        </h4>
        {players.length ? (
          <ol>
            {players.map((entry, index) => (
              <LineupPlayer
                entry={entry}
                key={`${entry.player?.id ?? "unknown"}-${index}`}
              />
            ))}
          </ol>
        ) : (
          <p className="match-detail-data-note">
            {title === "Alineación inicial"
              ? "La API no informa titulares para este equipo."
              : "La API no informa suplentes para este equipo."}
          </p>
        )}
      </section>
    )
  }

  return (
    <article className="match-lineup-team">
      <h3>{teamName}</h3>
      {roster("Alineación inicial", starters)}
      {roster("Suplentes", substitutes)}
    </article>
  )
}

function MatchLineups({ match, endpoint }: {
  match: MatchDetails
  endpoint: string
}) {
  const hasLineups = match.lineups.home.length > 0 || match.lineups.away.length > 0

  return (
    <section className="match-detail-panel match-detail-lineups">
      <header className="match-detail-panel-heading">
        <div>
          <span className="section-label">PLANTELES DEL ENCUENTRO</span>
          <h2>Alineación y suplentes</h2>
        </div>
        <EndpointTag>{`${endpoint} → partido.convocatorias`}</EndpointTag>
      </header>
      {!hasLineups && (
        <p className="match-detail-data-note">
          La API no tiene convocatorias registradas para este partido.
        </p>
      )}
      <div className="match-lineup-teams">
        <TeamLineup teamName={match.home.name} entries={match.lineups.home} />
        <TeamLineup teamName={match.away.name} entries={match.lineups.away} />
      </div>
    </section>
  )
}

function eventKind(event: MatchEvent): string {
  switch (event.typeCode.toLowerCase()) {
    case "goal":
      return "goal"
    case "own goal":
      return "own-goal"
    case "yellow":
      return "yellow-card"
    case "second yellow":
      return "second-yellow"
    case "red":
      return "red-card"
    case "substitution":
      return "substitution"
    case "penalty":
      return "penalty"
    default:
      return "other"
  }
}

function eventTitle(event: MatchEvent): string {
  switch (eventKind(event)) {
    case "goal":
      return "Gol"
    case "own-goal":
      return "Gol en contra"
    case "yellow-card":
      return "Tarjeta amarilla"
    case "second-yellow":
      return "Segunda tarjeta amarilla"
    case "red-card":
      return "Tarjeta roja"
    case "substitution":
      return "Sustitución"
    case "penalty":
      return "Penal"
    default:
      return event.type
  }
}

function EventPlayer({ player }: { player: MatchPlayer }) {
  return (
    <EntityLink kind="jugador" id={player.id} className="match-event-player">
      {player.nickname || player.name}
    </EntityLink>
  )
}

function MatchEventRow({ event }: { event: MatchEvent }) {
  const kind = eventKind(event)
  const isSubstitution = kind === "substitution"

  return (
    <li className={`match-event-row match-event-${kind}`}>
      <time className="match-event-minute">{event.minute}′</time>
      <span className="match-event-marker" aria-hidden="true">
        {kind === "goal" || kind === "own-goal"
          ? "GOL"
          : kind === "yellow-card"
            ? "A"
            : kind === "second-yellow"
              ? "2A"
              : kind === "red-card"
                ? "R"
                : kind === "substitution"
                  ? "↔"
                  : kind === "penalty"
                    ? "P"
                    : "·"}
      </span>
      <div className="match-event-description">
        <strong>{eventTitle(event).toUpperCase()}</strong>
        {isSubstitution ? (
          <p>
            {event.player ? (
              <>
                Entró <EventPlayer player={event.player} />
              </>
            ) : (
              "Jugador entrante no informado"
            )}
            {event.playerOut && (
              <>
                {" · salió "}
                <EventPlayer player={event.playerOut} />
              </>
            )}
          </p>
        ) : event.player ? (
          <p>
            <EventPlayer player={event.player} />
            {event.player.nickname && event.player.nickname !== event.player.name && (
              <span> · {event.player.name}</span>
            )}
          </p>
        ) : (
          <p>La API no informa el jugador asociado al evento.</p>
        )}
      </div>
    </li>
  )
}

function MatchEvents({ match, endpoint }: {
  match: MatchDetails
  endpoint: string
}) {
  const events = [...match.events].sort(
    (first, second) => first.minute - second.minute || first.id - second.id,
  )

  return (
    <section className="match-detail-panel match-detail-events">
      <header className="match-detail-panel-heading">
        <div>
          <span className="section-label">CRONOLOGÍA</span>
          <h2>Eventos del partido</h2>
        </div>
        <EndpointTag>{`${endpoint} → partido.eventos`}</EndpointTag>
      </header>
      {events.length ? (
        <ol className="match-event-list">
          {events.reverse().map((event) => (
            <MatchEventRow event={event} key={event.id} />
          ))}
        </ol>
      ) : (
        <p className="match-detail-data-note">
          La API no tiene eventos registrados para este partido.
        </p>
      )}
    </section>
  )
}

function StatisticsComparison({ match, endpoint }: {
  match: MatchDetails
  endpoint: string
}) {
  const hasAnyStatistics = match.statistics.home !== null || match.statistics.away !== null

  return (
    <section className="match-detail-panel match-detail-statistics">
      <header className="match-detail-panel-heading">
        <div>
          <span className="section-label">COMPARATIVA</span>
          <h2>Estadísticas del partido</h2>
        </div>
        <EndpointTag>{`${endpoint} → partido.estadisticas`}</EndpointTag>
      </header>

      {!hasAnyStatistics && (
        <p className="match-detail-data-note">
          La API no tiene estadísticas registradas para este partido.
        </p>
      )}

      <div className="match-stat-column-headings" aria-hidden="true">
        <strong>{match.home.name}</strong>
        <span>ESTADÍSTICA</span>
        <strong>{match.away.name}</strong>
      </div>

      <div className="match-stat-list">
        {statisticDefinitions.map(({ key, label, digits, suffix }) => {
          const homeValue = match.statistics.home?.[key] ?? null
          const awayValue = match.statistics.away?.[key] ?? null
          const comparable = homeValue !== null && awayValue !== null
          let homeShare = 50
          if (homeValue !== null && awayValue !== null) {
            const total = homeValue + awayValue
            if (total > 0) homeShare = (homeValue / total) * 100
          }

          return (
            <div className="match-stat-row" key={key}>
              <strong className="match-stat-home-value">
                {formatStatistic(homeValue, digits, suffix)}
              </strong>
              <div className="match-stat-middle">
                <span>{label}</span>
                <div
                  className={`match-stat-track${comparable ? "" : " match-stat-track-unavailable"}`}
                  aria-hidden="true"
                >
                  {comparable && (
                    <>
                      <i style={{ width: `${homeShare}%` }} />
                      <i style={{ width: `${100 - homeShare}%` }} />
                    </>
                  )}
                </div>
              </div>
              <strong className="match-stat-away-value">
                {formatStatistic(awayValue, digits, suffix)}
              </strong>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default function MatchDetailsPage({ matchId }: { matchId: number }) {
  const [match, setMatch] = useState<MatchDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] =
    useState<MatchSection>("estadisticas")
  const endpoint = `/api/partidos/partidos/${matchId}`

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setMatch(null)

    fetchMatchDetails(matchId)
      .then((result) => {
        if (!cancelled) setMatch(result)
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "No se pudo cargar el detalle del partido.",
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [matchId])

  return (
    <div className="match-detail-page">
      <section className="match-detail-hero">
        <div className="content">
          <nav className="match-detail-breadcrumb" aria-label="Ruta de navegación">
            <EntityLink kind="partido">PARTIDOS</EntityLink>
            <span>/</span>
            <span>DETALLE</span>
          </nav>

          {loading ? (
            <p className="match-detail-loading" aria-live="polite">
              Cargando detalle del partido…
            </p>
          ) : error ? (
            <div className="match-detail-error" role="alert">
              <strong>No se pudo cargar el partido #{matchId}.</strong>
              <span>{error}</span>
            </div>
          ) : match ? (
            <>
              <div className="match-detail-title-row">
                <div>
                  <span className="section-label">DETALLE DEL ENCUENTRO</span>
                  <h1>{match.competition.name}</h1>
                </div>
                <EndpointTag>{endpoint}</EndpointTag>
              </div>

              <div className="match-detail-scoreboard">
                <div className="match-detail-team">
                  <TeamEmblem name={match.home.name} image={match.home.image} />
                  <span>LOCAL</span>
                  <EntityLink kind="equipo" id={match.home.id}>
                    {match.home.name}
                  </EntityLink>
                </div>

                <div className="match-detail-score">
                  <span className={`match-detail-status match-detail-status-${match.status.toLowerCase()}`}>
                    {statusLabel(match)}
                  </span>
                  <strong>
                    {match.score.home !== null && match.score.away !== null
                      ? `${match.score.home} — ${match.score.away}`
                      : "VS"}
                  </strong>
                  <time dateTime={match.date}>{formatMatchDate(match.date)}</time>
                </div>

                <div className="match-detail-team match-detail-team-away">
                  <TeamEmblem name={match.away.name} image={match.away.image} />
                  <span>VISITANTE</span>
                  <EntityLink kind="equipo" id={match.away.id}>
                    {match.away.name}
                  </EntityLink>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {match && (
        <div className="content match-detail-content">
          <div
            className="match-detail-tabs"
            role="group"
            aria-label="Secciones del partido"
          >
            {matchSections.map(({ id, label }) => (
              <button
                aria-controls={`match-detail-panel-${match.id}`}
                aria-pressed={selectedSection === id}
                className={selectedSection === id ? "selected" : ""}
                key={id}
                onClick={() => setSelectedSection(id)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div
            aria-label={matchSections.find(({ id }) => id === selectedSection)?.label}
            className="match-detail-selected-panel"
            id={`match-detail-panel-${match.id}`}
          >
            {selectedSection === "alineacion" ? (
              <MatchLineups match={match} endpoint={endpoint} />
            ) : selectedSection === "eventos" ? (
              <MatchEvents match={match} endpoint={endpoint} />
            ) : (
              <StatisticsComparison match={match} endpoint={endpoint} />
            )}
          </div>
          <MatchContext match={match} endpoint={endpoint} />
        </div>
      )}
    </div>
  )
}
