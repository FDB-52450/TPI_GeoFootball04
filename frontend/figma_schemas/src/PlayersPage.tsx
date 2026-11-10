import { useEffect, useMemo, useState } from "react"
import {
  fetchPlayerDetails,
  fetchPlayers,
  type PlayerCatalogItem,
  type PlayerDetails,
  type PlayerPerformance,
  type PlayerRecentMatch,
} from "./api/players"
import { EntityLink } from "./EntityNavigation"
import { getSeasonLabel } from "./utils/seasonLabel.ts"

function EndpointTag({ children }: { children: string }) {
  return <code className="country-endpoint">{children}</code>
}

function PlayerPhoto({
  url,
  name,
  alt,
  fallbackClassName,
}: {
  url: string
  name: string
  alt: string
  fallbackClassName: string
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (!url || failedUrl === url) {
    return (
      <span className={fallbackClassName} aria-label={`No hay foto disponible para ${name}`}>
        {name.slice(0, 1)}
      </span>
    )
  }

  return <img alt={alt} src={url} onError={() => setFailedUrl(url)} />
}

function formatDate(value: string | null) {
  if (!value) return "No informada"
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
}

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const date = new Date(birthDate)
  if (Number.isNaN(date.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  if (
    today.getMonth() < date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() < date.getDate())
  ) {
    age -= 1
  }
  return age
}

function seasonLabel(season: PlayerPerformance["temporada"]) {
  return getSeasonLabel(season.periodo) || String(season.id)
}

function PerformanceCard({
  performance,
}: {
  performance: PlayerPerformance
}) {
  return (
    <article className="player-performance-card">
      {performance.competicion.logo_url ? (
        <img alt="" src={performance.competicion.logo_url} />
      ) : (
        <span className="player-league-fallback">
          {performance.competicion.nombre}
        </span>
      )}
      <div className="player-performance-competition">
        <EntityLink kind="competicion" id={performance.competicion.id}>
          {performance.competicion.nombre}
        </EntityLink>
        <small>{seasonLabel(performance.temporada)}</small>
      </div>
      <dl>
        <div><dt>Partidos</dt><dd>{performance.partidos}</dd></div>
        <div><dt>Minutos</dt><dd>{performance.minutos}</dd></div>
        <div><dt>Goles</dt><dd>{performance.goles}</dd></div>
        <div>
          <dt>Minutos por gol</dt>
          <dd>{performance["min/gol"] ?? "—"}</dd>
        </div>
      </dl>
    </article>
  )
}

function RecentMatchRow({ match }: { match: PlayerRecentMatch }) {
  return (
    <article className="player-recent-match">
      <div className="player-recent-date">
        <strong>{formatDate(match.fecha)}</strong>
      </div>
      <EntityLink
        kind="equipo"
        id={match.equipo_jugador.id}
        className="player-recent-team"
      >
        {match.equipo_jugador.escudo_url ? (
          <img alt="" src={match.equipo_jugador.escudo_url} />
        ) : (
          <span className="player-team-initial">
            {match.equipo_jugador.nombre.slice(0, 1)}
          </span>
        )}
        <strong>{match.equipo_jugador.nombre}</strong>
      </EntityLink>
      <div className="player-recent-score">
        <strong>
          {match.marcador.equipo_jugador !== null && match.marcador.equipo_rival !== null
            ? `${match.marcador.equipo_jugador} — ${match.marcador.equipo_rival}`
            : "—"}
        </strong>
      </div>
      <EntityLink
        kind="equipo"
        id={match.equipo_rival.id}
        className="player-recent-team player-recent-rival"
      >
        {match.equipo_rival.escudo_url ? (
          <img alt="" src={match.equipo_rival.escudo_url} />
        ) : (
          <span className="player-team-initial">
            {match.equipo_rival.nombre.slice(0, 1)}
          </span>
        )}
        <strong>{match.equipo_rival.nombre}</strong>
      </EntityLink>
      <EntityLink
        kind="competicion"
        id={match.competicion.id}
        className="player-recent-league"
      >
        {match.competicion.logo_url ? (
          <img alt="" src={match.competicion.logo_url} />
        ) : (
          <span>{match.competicion.nombre}</span>
        )}
      </EntityLink>
      <div className="player-recent-stats">
        <span>{match.minutos} min</span>
        <span>{match.goles} {match.goles === 1 ? "gol" : "goles"}</span>
      </div>
    </article>
  )
}

export default function PlayersPage({ playerId }: { playerId: number | null }) {
  const [players, setPlayers] = useState<PlayerCatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(playerId)
  const [player, setPlayer] = useState<PlayerDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [competitionId, setCompetitionId] = useState("all")
  const [playerSearch, setPlayerSearch] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadPlayers() {
      try {
        const result = await fetchPlayers()
        if (!cancelled) {
          setPlayers(result)
          setSelectedId((current) => current ?? playerId ?? result[0]?.id ?? null)
        }
      } catch (error) {
        if (!cancelled) {
          setCatalogError(
            error instanceof Error ? error.message : "No se pudo cargar el catálogo de jugadores.",
          )
        }
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    }

    void loadPlayers()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (playerId !== null) setSelectedId(playerId)
  }, [playerId])

  useEffect(() => {
    const selectedPlayer = players.find(({ id }) => id === selectedId)
    if (selectedPlayer) setPlayerSearch(selectedPlayer.nombre)
  }, [selectedId, players])

  useEffect(() => {
    if (selectedId === null) {
      setPlayer(null)
      setDetailsError(null)
      setDetailsLoading(false)
      return
    }
    const id = selectedId
    let cancelled = false
    setPlayer(null)
    setDetailsError(null)
    setDetailsLoading(true)
    async function loadPlayer() {
      try {
        const result = await fetchPlayerDetails(id)
        if (!cancelled) setPlayer(result)
      } catch (error) {
        if (!cancelled) {
          setDetailsError(
            error instanceof Error ? error.message : "No se pudo cargar el detalle del jugador.",
          )
        }
      } finally {
        if (!cancelled) setDetailsLoading(false)
      }
    }
    void loadPlayer()
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const competitions = useMemo(() => {
    const values = new Map<number, PlayerPerformance["competicion"]>()
    for (const performance of player?.datos_rendimiento ?? []) {
      values.set(performance.competicion.id, performance.competicion)
    }
    return [...values.values()]
  }, [player])
  const visiblePerformance = (player?.datos_rendimiento ?? []).filter(
    (performance) => competitionId === "all" || String(performance.competicion.id) === competitionId,
  )
  const matchingPlayers = useMemo(() => {
    const query = playerSearch.trim().toLocaleLowerCase()
    if (!query) return []
    return players
      .filter(({ nombre }) => nombre.toLocaleLowerCase().includes(query))
      .slice(0, 8)
  }, [playerSearch, players])
  const age = calculateAge(player?.fecha_nacimiento ?? null)

  function selectPlayer(id: number | null) {
    setSelectedId(id)
    setPlayerSearch(players.find((item) => item.id === id)?.nombre ?? "")
    setSearchOpen(false)
    if (id === null) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`)
    } else {
      window.location.hash = `#jugador/${id}`
    }
  }

  return (
    <div className="players-page">
      <section className="player-page-hero">
        <div className="content">
          <div className="confed-breadcrumb">INICIO <span>/</span> JUGADORES</div>
          <div className="player-page-title-row">
            <div>
              <span className="section-label">PERFILES Y ESTADÍSTICAS</span>
              <h1>Jugadores</h1>
              <p>Datos personales, rendimiento y trayectoria en clubes.</p>
            </div>
            <div className="player-search-field">
              <label htmlFor="player-search">BUSCAR JUGADOR</label>
              <div className="player-search-input-wrap">
                <svg
                  aria-hidden="true"
                  fill="none"
                  height="19"
                  viewBox="0 0 24 24"
                  width="19"
                >
                  <circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m16 16 4.2 4.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
                </svg>
                <input
                  autoComplete="off"
                  disabled={catalogLoading || Boolean(catalogError)}
                  id="player-search"
                  onBlur={() => window.setTimeout(() => setSearchOpen(false), 120)}
                  onChange={(event) => {
                    setPlayerSearch(event.target.value)
                    setSearchOpen(true)
                  }}
                  onFocus={() => setSearchOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && matchingPlayers[0]) {
                      event.preventDefault()
                      selectPlayer(matchingPlayers[0].id)
                    }
                    if (event.key === "Escape") setSearchOpen(false)
                  }}
                  placeholder={catalogLoading ? "Cargando jugadores…" : "Escribe el nombre del jugador"}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-controls="player-search-results"
                  aria-expanded={searchOpen && matchingPlayers.length > 0}
                  value={playerSearch}
                />
                {playerSearch && (
                  <button
                    aria-label="Limpiar búsqueda"
                    className="player-search-clear"
                    onClick={() => {
                      setPlayerSearch("")
                      setSearchOpen(true)
                    }}
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
              {searchOpen && playerSearch.trim() && (
                <div className="player-search-results" id="player-search-results" role="listbox">
                  {matchingPlayers.length ? matchingPlayers.map((item) => (
                    <button
                      aria-selected={selectedId === item.id}
                      className={selectedId === item.id ? "selected" : ""}
                      key={item.id}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectPlayer(item.id)}
                      role="option"
                      type="button"
                    >
                      <PlayerPhoto
                        url={item.foto_url}
                        name={item.nombre}
                        alt=""
                        fallbackClassName="player-search-initial"
                      />
                      <span>{item.nombre}</span>
                    </button>
                  )) : (
                    <p role="status">No se encontraron jugadores con ese nombre.</p>
                  )}
                </div>
              )}
              <EndpointTag>/api/partidos/jugadores/</EndpointTag>
              {catalogError && (
                <span className="player-api-error" role="alert">{catalogError}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="content player-page-content">
        {detailsError && (
          <p className="player-api-error" role="alert">
            No se pudo cargar el jugador: {detailsError}
          </p>
        )}
        <section className="player-profile-card">
          <div className="player-portrait">
            <PlayerPhoto
              url={player?.foto_url ?? ""}
              name={player?.nombre ?? "Jugador"}
              alt={player ? `Foto de ${player.nombre}` : ""}
              fallbackClassName="player-profile-initial"
            />
          </div>
          <div className="player-profile-main">
            <span className="player-profile-kicker">PERFIL DEL JUGADOR</span>
            <h2>{player?.nombre ?? (detailsLoading ? "Cargando jugador…" : "Selecciona un jugador")}</h2>
            {player?.apodo && <p className="player-nickname">“{player.apodo}”</p>}
            <div className="player-profile-links">
              {player?.pais ? (
                <EntityLink kind="pais" id={player.pais.id} className="player-country-link">
                  {player.pais.bandera_url ? (
                    <img alt="" src={player.pais.bandera_url} />
                  ) : (
                    <span className="player-country-fallback">{player.pais.nombre.slice(0, 2).toUpperCase()}</span>
                  )}
                  {player.pais.nombre}
                </EntityLink>
              ) : (
                <span className="player-data-missing">País no informado por la API</span>
              )}
              <div className="player-league-logos">
                <span className="player-league-caption">LIGAS CON DATOS</span>
                {(player?.datos_rendimiento ?? []).length ? (
                  [...new Map(
                    player?.datos_rendimiento.map((performance) => [
                    performance.competicion.id,
                    performance,
                    ])
                  ).values()].map((performance) => (
                    <EntityLink
                    kind="competicion"
                    id={performance.competicion.id}
                    className="player-league-link"
                    title={`${performance.competicion.nombre}`}
                    key={performance.competicion.id}
                    >
                    {performance.competicion.logo_url ? (
                        <img
                        alt={performance.competicion.nombre}
                        src={performance.competicion.logo_url}
                        />
                    ) : (
                        <span>{performance.competicion.nombre}</span>
                    )}
                  </EntityLink>
                  ))
                ) : (
                  <span className="player-data-missing">Ligas sin información disponible</span>
                )}
              </div>
            </div>
            <EndpointTag>/api/partidos/jugadores/&lt;jugador_id&gt;</EndpointTag>
          </div>
          <div className="player-bio-stats">
            <article><strong>{age ?? "—"}</strong><span>EDAD</span></article>
            <article><strong>{player?.peso ?? "—"}<small>{player?.peso !== null && player?.peso !== undefined ? " kg" : ""}</small></strong><span>PESO</span></article>
            <article><strong>{player?.altura ?? "—"}<small>{player?.altura !== null && player?.altura !== undefined ? " cm" : ""}</small></strong><span>ALTURA</span></article>
          </div>
        </section>

        <section className="player-content-panel player-performance-section">
          <header className="player-panel-heading">
            <div>
              <span className="section-label">DATOS DE RENDIMIENTO</span>
              <h3>Estadísticas</h3>
            </div>
            <label className="player-season-select">
              <span>COMPETICIÓN</span>
              <select
                value={competitionId}
                onChange={(event) => setCompetitionId(event.target.value)}
                disabled={!competitions.length}
              >
                <option value="all">Todas las competiciones disponibles</option>
                {competitions.map((competition) => (
                  <option key={competition.id} value={competition.id}>{competition.nombre}</option>
                ))}
              </select>
            </label>
          </header>
          <div className="player-section-source">
            <EndpointTag>/api/partidos/jugadores/&lt;jugador_id&gt;</EndpointTag>
            <span>La API solo devuelve rendimiento de temporadas que incluyen el año actual.</span>
          </div>
          {detailsLoading ? (
            <p className="player-empty-state">Cargando estadísticas…</p>
          ) : visiblePerformance.length ? (
            <div className="player-performance-grid">
              {visiblePerformance.map((performance) => (
                <PerformanceCard
                  performance={performance}
                  key={`${performance.temporada.id}-${performance.competicion.id}`}
                />
              ))}
            </div>
          ) : (
            <p className="player-empty-state">
              {player ? "No hay estadísticas disponibles para la competición seleccionada." : "Selecciona un jugador para consultar sus estadísticas."}
            </p>
          )}
        </section>

        <section className="player-content-panel">
          <header className="player-panel-heading">
            <div><span className="section-label">TRAYECTORIA</span><h3>Historial de clubes</h3></div>
            <EndpointTag>/api/partidos/jugadores/&lt;jugador_id&gt;</EndpointTag>
          </header>
          {player?.historial_clubes.length ? (
            <div className="player-club-table-wrap">
              <table className="player-club-table">
                <thead>
                  <tr>
                    <th>Equipo</th><th>Desde</th><th>Hasta</th><th>Partidos</th><th>Goles</th>
                  </tr>
                </thead>
                <tbody>
                  {player.historial_clubes.map((club) => (
                    <tr key={club.equipo.id}>
                      <td>
                        <EntityLink kind="equipo" id={club.equipo.id} className="player-club-link">
                          {club.equipo.escudo_url && <img alt="" src={club.equipo.escudo_url} />}
                          <strong>{club.equipo.nombre}</strong>
                        </EntityLink>
                      </td>
                      <td>{formatDate(club.fecha_desde)}</td>
                      <td>{formatDate(club.fecha_hasta)}</td>
                      <td>{club.partidos}</td>
                      <td>{club.goles}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="player-empty-state">
              {player ? "No se encontró historial de clubes." : "Selecciona un jugador para ver su trayectoria."}
            </p>
          )}
        </section>

        <section className="player-content-panel player-recent-section">
          <header className="player-panel-heading">
            <div><span className="section-label">ACTUACIONES RECIENTES</span><h3>Últimos partidos</h3></div>
            <EndpointTag>/api/partidos/jugadores/&lt;jugador_id&gt;</EndpointTag>
          </header>
          {player?.ultimos_partidos.length ? (
            <div className="player-recent-list">
              {player.ultimos_partidos.map((match, index) => (
                <RecentMatchRow
                  key={`${match.temporada.id}-${match.equipo_jugador.id}-${index}`}
                  match={match}
                />
              ))}
            </div>
          ) : (
            <p className="player-empty-state">
              {player ? "No hay últimas apariciones disponibles." : "Selecciona un jugador para consultar sus últimos partidos."}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
