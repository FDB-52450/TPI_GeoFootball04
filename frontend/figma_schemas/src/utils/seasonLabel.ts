export function getSeasonLabel(periodo: string): string {
  if (periodo.length == 4)
    return periodo
  else
    return periodo.slice(0, 4) + '/' + periodo.slice(4)
}
