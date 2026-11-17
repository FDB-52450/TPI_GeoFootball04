import { useEffect, useMemo, useRef, useState } from "react"
import {
  fetchLiveCatalog,
  fetchLiveMatches,
  type LiveMatch,
} from "../api/liveMatches"
import { EntityLink } from "../EntityNavigation"

import * as THREE from "three";

type LocatedLiveMatch = LiveMatch & {
  stadium: { name: string; latitude: number; longitude: number }
}

type GlobePoint = LocatedLiveMatch & { lat: number; lng: number }

type CountryFeature = Record<string, unknown>

type GlobeInstance = {
  globeMaterial: (material: THREE.Material) => GlobeInstance
  backgroundColor: (color: string) => GlobeInstance
  showAtmosphere: (enabled: boolean) => GlobeInstance
  atmosphereColor: (color: string) => GlobeInstance
  atmosphereAltitude: (altitude: number) => GlobeInstance
  polygonsData: (features: CountryFeature[]) => GlobeInstance
  polygonCapColor: (
    color: string | ((feature: CountryFeature) => string),
  ) => GlobeInstance
  polygonSideColor: (color: string | (() => string)) => GlobeInstance
  polygonStrokeColor: (color: string | (() => string)) => GlobeInstance
  polygonAltitude: (altitude: number) => GlobeInstance
  polygonLabel: (label: (feature: CountryFeature) => string) => GlobeInstance
  pointsData: (points: GlobePoint[]) => GlobeInstance
  pointAltitude: (altitude: number) => GlobeInstance
  pointRadius: (radius: number) => GlobeInstance
  pointColor: (color: (point: GlobePoint) => string) => GlobeInstance
  pointLabel: (label: (point: GlobePoint) => string) => GlobeInstance
  onPointHover: (callback: (point: GlobePoint | null) => void) => GlobeInstance
  onPointClick: (callback: (point: GlobePoint | null) => void) => GlobeInstance
  pointOfView: (
    point: { lat: number; lng: number; altitude: number },
    transitionMs: number,
  ) => GlobeInstance
  controls: () => { autoRotate: boolean }
  width: (value: number) => GlobeInstance
  height: (value: number) => GlobeInstance
  _destructor?: () => void
}

type GlobeFactory = () => (element: HTMLElement) => GlobeInstance

declare global {
  interface Window {
    Globe?: GlobeFactory
  }
}

type LiveCatalog = Awaited<ReturnType<typeof fetchLiveCatalog>>
function loadGlobeLibrary(): Promise<GlobeFactory> {
  if (window.Globe) return Promise.resolve(window.Globe)
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src =
      "https://cdn.jsdelivr.net/npm/globe.gl@2.46.1/dist/globe.gl.min.js"
    script.async = true
    script.onload = () => {
      if (window.Globe) {
        resolve(window.Globe)
      } else {
        reject(new Error("La biblioteca del globo no pudo inicializarse."))
      }
    }
    script.onerror = () => {
      reject(
        new Error("No se pudo cargar la biblioteca del globo interactivo."),
      )
    }
    document.head.appendChild(script)
  })
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
function getCountryFeatures(value: unknown): CountryFeature[] {
  if (Array.isArray(value)) return value.filter(isRecord)
  if (isRecord(value) && Array.isArray(value.features)) {
    return value.features.filter(isRecord)
  }
  throw new Error("El archivo de países no contiene geometrías válidas.")
}
function countryName(feature: CountryFeature): string {
  const properties = isRecord(feature.properties) ? feature.properties : {}
  const name = properties.ADMIN ?? properties.name
  return typeof name === "string" ? name : ""
}
function hasCoordinates(match: LiveMatch): match is LocatedLiveMatch {
  const { latitude, longitude } = match.stadium
  return (
    latitude !== null &&
    longitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  )
}
function matchMinute(minute: number | null): string {
  return minute === null ? "EN VIVO" : `${minute}′`
}
export default function LiveMatchesGlobe() {
  const globeContainerRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<GlobeInstance | null>(null)
  const mapPointsRef = useRef<GlobePoint[]>([])
  const selectedPointIdRef = useRef<number | null>(null)
  const [matches, setMatches] = useState<LiveMatch[]>([])
  const [catalog, setCatalog] = useState<LiveCatalog>({
    confederations: [],
    competitions: [],
  })
  const [selectedConfederation, setSelectedConfederation] = useState("all")
  const [selectedCompetition, setSelectedCompetition] = useState("all")
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [globeError, setGlobeError] = useState<string | null>(null)
  const competitionById = useMemo(
    () =>
      new Map(
        catalog.competitions.map((competition) => [
          competition.id,
          competition,
        ]),
      ),
    [catalog.competitions],
  )
  const availableCompetitions = useMemo(
    () =>
      selectedConfederation === "all"
        ? catalog.competitions
        : catalog.competitions.filter(
            (competition) =>
              String(competition.confederation.id) === selectedConfederation,
          ),
    [catalog.competitions, selectedConfederation],
  )
  const visibleMatches = useMemo(
    () =>
      matches.filter((match) => {
        if (
          selectedCompetition !== "all" &&
          String(match.competition.id) !== selectedCompetition
        ) {
          return false
        }
        if (selectedConfederation === "all") return true
        return (
          String(
            competitionById.get(match.competition.id)?.confederation.id,
          ) === selectedConfederation
        )
      }),
    [competitionById, matches, selectedCompetition, selectedConfederation],
  )
  const mapMatches = useMemo(
    () => visibleMatches.filter(hasCoordinates),
    [visibleMatches],
  )
  const selectedMatch =
    visibleMatches.find((match) => match.id === selectedMatchId) ?? null
  useEffect(() => {
    let cancelled = false
    let timeoutId: number | undefined
    async function refreshMatches() {
      try {
        const nextMatches = await fetchLiveMatches()
        if (cancelled) return
        setMatches(nextMatches)
      } catch (error) {
        if (cancelled) return
        console.error("No se pudieron cargar los partidos en vivo.", error)
        setMatches([])
      } finally {
        if (!cancelled) {
          timeoutId = window.setTimeout(refreshMatches, 60_000)
        }
      }
    }
    void refreshMatches()
    return () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [])
  useEffect(() => {
    let cancelled = false
    fetchLiveCatalog()
      .then((nextCatalog) => {
        if (!cancelled) {
          setCatalog(nextCatalog)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error(
            "No se pudieron cargar los filtros de confederación y competición.",
            error,
          )
        }
      })
      .finally(() => {
        if (!cancelled) setCatalogLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])
  useEffect(() => {
    const container = globeContainerRef.current
    if (!container) return
    const globeElement: HTMLDivElement = container
    let cancelled = false
    let observer: ResizeObserver | null = null
    let globe: GlobeInstance | null = null
    async function initializeGlobe() {
      try {
        const [globeFactory, response] = await Promise.all([
          loadGlobeLibrary(),
          fetch(`${import.meta.env.BASE_URL}globe-data/countries.geojson`),
        ])
        if (!response.ok) {
          throw new Error(
            `No se pudieron cargar los países (HTTP ${response.status}).`,
          )
        }
        const features = getCountryFeatures(await response.json())
        if (cancelled) return
        globe = globeFactory()(globeElement)
          .globeMaterial(
            new THREE.MeshPhongMaterial({
              color: "#102B3A",
              shininess: 15,
            }),
          )
          .backgroundColor("#07131d")
          .showAtmosphere(true)
          .atmosphereColor("#ff7652")
          .atmosphereAltitude(0.125)
          .polygonsData(features)
          .polygonCapColor(() => "rgba(42, 105, 132, 0.90)")
          .polygonSideColor(() => "rgba(3, 15, 23, 0.35)")
          .polygonStrokeColor(() => "rgba(151, 190, 205, 0.30)")
          .polygonAltitude(0.010)
          .polygonLabel(countryName)
          .pointsData(mapPointsRef.current)
          .pointAltitude(0.045)
          .pointRadius(0.48)
          .pointColor((point) =>
            point.id === selectedPointIdRef.current ? "#ffd071" : "#ff5b35",
          )
          .pointLabel(() => "")
          .onPointHover((point) => {
            if (point) setSelectedMatchId(point.id)
          })
          .onPointClick((point) => {
            if (point) setSelectedMatchId(point.id)
          })
          .pointOfView({ lat: 15, lng: 0, altitude: 2.25 }, 0)
        globe.controls().autoRotate = false
        globe.width(Math.floor(globeElement.clientWidth))
        globe.height(Math.floor(globeElement.clientHeight))
        globeRef.current = globe
        observer = new ResizeObserver((entries) => {
          const bounds = entries[0]?.contentRect
          if (bounds && globe) {
            globe.width(Math.floor(bounds.width))
            globe.height(Math.floor(bounds.height))
          }
        })
        observer.observe(globeElement)
        if (!cancelled) setGlobeError(null)
      } catch (error) {
        if (!cancelled) {
          setGlobeError(
            error instanceof Error
              ? error.message
              : "No se pudo iniciar el globo interactivo.",
          )
        }
      }
    }
    void initializeGlobe()
    return () => {
      cancelled = true
      observer?.disconnect()
      globe?._destructor?.()
      if (globeRef.current === globe) globeRef.current = null
      globeElement.replaceChildren()
    }
  }, [])
  useEffect(() => {
    mapPointsRef.current = mapMatches.map((match) => ({
      ...match,
      lat: match.stadium.latitude,
      lng: match.stadium.longitude,
    }))
    globeRef.current?.pointsData(mapPointsRef.current)
  }, [mapMatches])
  useEffect(() => {
    selectedPointIdRef.current = selectedMatch?.id ?? null
    globeRef.current
      ?.pointColor((point) =>
        point.id === selectedPointIdRef.current ? "#ffd071" : "#ff5b35",
      )
  }, [selectedMatch?.id])
  function handleConfederationChange(value: string) {
    setSelectedConfederation(value)
    setSelectedCompetition("all")
  }
  return (
    <section className="live-globe-section" aria-label="Partidos en vivo en el globo">
      <div
        className="live-globe-card"
        onMouseLeave={() => setSelectedMatchId(null)}
      >
        <div className="live-globe-canvas-wrap">
          <div
            className="live-globe-canvas"
            ref={globeContainerRef}
            role="img"
            aria-label="Globo interactivo con marcadores de partidos en vivo"
          />
          {globeError && (
            <div className="live-globe-status live-globe-status-error" role="alert">
              {globeError}
            </div>
          )}
        </div>
        {selectedMatch && (
          <aside className="live-match-details" aria-live="polite">
            <div className="live-match-details-heading">
              <span className="live-match-badge">
                <span className="live-dot" />
                {matchMinute(selectedMatch.minute)}
              </span>
              <span className="live-match-id">PARTIDO #{selectedMatch.id}</span>
            </div>
            <EntityLink
              className="live-match-competition"
              kind="competicion"
              id={selectedMatch.competition.id}
            >
              {selectedMatch.competition.name}
            </EntityLink>
            <div className="live-match-score">
              <EntityLink kind="equipo" id={selectedMatch.home.id}>
                {selectedMatch.home.name}
              </EntityLink>
              <strong>
                {selectedMatch.score.home ?? "—"}
                <span>:</span>
                {selectedMatch.score.away ?? "—"}
              </strong>
              <EntityLink kind="equipo" id={selectedMatch.away.id}>
                {selectedMatch.away.name}
              </EntityLink>
            </div>
            <div className="live-match-venue">
              <span>ESTADIO</span>
              <strong>{selectedMatch.stadium.name || "No informado"}</strong>
            </div>
            {competitionById.get(selectedMatch.competition.id) && (
              <p className="live-match-confederation">
                Confederación:{" "}
                <EntityLink
                  kind="confederacion"
                  id={
                    competitionById.get(selectedMatch.competition.id)!
                      .confederation.id
                  }
                >
                  {
                    competitionById.get(selectedMatch.competition.id)!
                      .confederation.name
                  }
                </EntityLink>
              </p>
            )}
            <EntityLink
              className="live-match-detail-link"
              kind="partido"
              id={selectedMatch.id}
            >
              Abrir detalle del partido <span>↗</span>
            </EntityLink>
          </aside>
        )}
      </div>
      <div className="live-globe-filters" aria-label="Filtrar partidos">
        <label>
          <span>CONFEDERACIÓN</span>
          <select
            value={selectedConfederation}
            onChange={(event) => handleConfederationChange(event.target.value)}
            disabled={catalogLoading}
          >
            <option value="all">Todas las confederaciones</option>
            {catalog.confederations.map((confederation) => (
              <option key={confederation.id} value={confederation.id}>
                {confederation.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>COMPETICIÓN</span>
          <select
            value={selectedCompetition}
            onChange={(event) => setSelectedCompetition(event.target.value)}
            disabled={catalogLoading}
          >
            <option value="all">Todas las competiciones</option>
            {availableCompetitions.map((competition) => (
              <option key={competition.id} value={competition.id}>
                {competition.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  )
}
