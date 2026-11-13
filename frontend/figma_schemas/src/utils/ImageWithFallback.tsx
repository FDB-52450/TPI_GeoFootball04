import { useState, type ReactNode } from "react"

export function ImageWithFallback({
  url,
  alt,
  fallback,
  className,
}: {
  url: string | null | undefined
  alt: string
  fallback: ReactNode
  className?: string
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const imageUrl = url?.trim() ?? ""

  if (!imageUrl || failedUrl === imageUrl) return fallback

  return (
    <img
      alt={alt}
      className={className}
      src={imageUrl}
      onError={() => setFailedUrl(imageUrl)}
    />
  )
}
