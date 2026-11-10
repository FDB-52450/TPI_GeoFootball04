import type { ReactNode } from "react"

export type EntityKind = "equipo" | "pais" | "confederacion" | "competicion"

export type EntityRoute = {
  page: "Equipos" | "Países" | "Confederaciones" | "Competiciones"
  id: number | null
}

const entityPages: Record<EntityKind, EntityRoute["page"]> = {
  equipo: "Equipos",
  pais: "Países",
  confederacion: "Confederaciones",
  competicion: "Competiciones",
}

export function entityHref(kind: EntityKind, id?: number | null): string {
  return id === undefined || id === null ? `#${kind}` : `#${kind}/${id}`
}

export function parseEntityRoute(hash: string): EntityRoute | null {
  const match = hash.match(/^#(equipo|pais|confederacion|competicion)(?:\/(\d+))?$/)
  if (!match) return null

  return {
    page: entityPages[match[1] as EntityKind],
    id: match[2] ? Number(match[2]) : null,
  }
}

export function EntityLink({
  kind,
  id,
  children,
  className,
  title,
}: {
  kind: EntityKind
  id?: number | null
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <a className={className ? `entity-link ${className}` : "entity-link"} href={entityHref(kind, id)} title={title}>
      {children}
    </a>
  )
}