import { useEffect, useMemo, useState } from "react"
import {
  fetchTeamDetails,
  fetchTeamMatches,
  fetchTeamPlayers,
  fetchTeams,
  type TeamCatalogItem,
  type TeamDetails,
  type TeamMatch,
  type TeamPlayer,
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

  const selectedTeam = details ?? teams.find(({ id }) => id === selectedId) ?? null
  const availableSeasons = useMemo(() => {
    const competitions = details?.competiciones ?? []
    return competitions.flatMap((competition) =>
      competition.temporadas.map((season) => ({ ...season, competicion: competition })),
    )
  }, [details])
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
      </div>
    </div>
  )
}