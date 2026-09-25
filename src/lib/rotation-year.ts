// A rotation year's weeks start on its first Thursday (see generateThursdayWeeks),
// so early-January days before that Thursday still belong to the previous year.

function firstThursday(year: number): string {
  const jan1Dow = new Date(Date.UTC(year, 0, 1)).getUTCDay()
  const offset = (4 - jan1Dow + 7) % 7
  return new Date(Date.UTC(year, 0, 1 + offset)).toISOString().slice(0, 10)
}

/** Rotation year that the 'yyyy-MM-dd' date belongs to */
export function rotationYear(date: string): number {
  const year = Number(date.slice(0, 4))
  return date < firstThursday(year) ? year - 1 : year
}

const todayIso = () => new Date().toISOString().slice(0, 10) // Iceland is UTC year-round

/** Year from an `?ar=` search param, falling back to the rotation year containing today */
export function yearFromParam(ar: string | null | undefined, today = todayIso()): number {
  return ar && /^\d{4}$/.test(ar) ? Number(ar) : rotationYear(today)
}

/** Link to a week page (or one of its sub-pages) in a given rotation year */
export function weekHref(year: number, weekNumber: number | string, sub?: string): string {
  return `/dagatal/vika/${weekNumber}${sub ? `/${sub}` : ''}?ar=${year}`
}
