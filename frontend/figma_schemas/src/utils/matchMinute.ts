export function formatMatchMinute(minute: number): string {
  return minute > 90 ? `90+${minute - 90}` : String(minute)
}
