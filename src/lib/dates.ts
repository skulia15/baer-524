import { isYesterday, isToday } from 'date-fns'

const IS_DAY_ABBR = ['sun', 'mán', 'þri', 'mið', 'fim', 'fös', 'lau']
const IS_MONTH_ABBR = [
  'jan',
  'feb',
  'mar',
  'apr',
  'maí',
  'jún',
  'júl',
  'ágú',
  'sep',
  'okt',
  'nóv',
  'des',
]

function isDay(date: Date): string {
  return IS_DAY_ABBR[date.getDay()]
}

function isMonth(date: Date): string {
  return IS_MONTH_ABBR[date.getMonth()]
}

// "fim 4. jún – mið 10. jún"
export function formatWeekRange(start: Date | string, end: Date | string): string {
  const s = typeof start === 'string' ? new Date(start) : start
  const e = typeof end === 'string' ? new Date(end) : end
  return `${isDay(s)} ${s.getDate()}. ${isMonth(s)} – ${isDay(e)} ${e.getDate()}. ${isMonth(e)}`
}

// "Fim 18. jún"
export function formatDay(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const dayAbbr = IS_DAY_ABBR[d.getDay()]
  const capitalized = dayAbbr.charAt(0).toUpperCase() + dayAbbr.slice(1)
  return `${capitalized} ${d.getDate()}. ${isMonth(d)}`
}

// "Fyrir 2 klst." / "Í gær" / "Fyrir 3 dögum"
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()

  if (isToday(d)) {
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 60) return `Fyrir ${diffMins} mín.`
    const diffHours = Math.floor(diffMins / 60)
    return `Fyrir ${diffHours} klst.`
  }
  if (isYesterday(d)) return 'Í gær'

  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  return `Fyrir ${diffDays} dögum`
}
