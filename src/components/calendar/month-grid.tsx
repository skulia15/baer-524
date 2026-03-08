'use client'

import type { DayRelease, Household, WeekAllocation } from '@/types/db'
import type { Holiday } from 'fridagar'
import Link from 'next/link'

const DAY_HEADERS = ['Mán', 'Þri', 'Mið', 'Fim', 'Fös', 'Lau', 'Sun']
const MONTH_NAMES = [
  'Janúar',
  'Febrúar',
  'Mars',
  'Apríl',
  'Maí',
  'Júní',
  'Júlí',
  'Ágúst',
  'September',
  'Október',
  'Nóvember',
  'Desember',
]

function hexToRgb(hex: string) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return r
    ? { r: Number.parseInt(r[1], 16), g: Number.parseInt(r[2], 16), b: Number.parseInt(r[3], 16) }
    : null
}

interface Props {
  year: number
  month: number // 1-indexed
  allocations: WeekAllocation[]
  releases: DayRelease[]
  householdMap: Map<string, Household>
  currentHouseholdId: string
  holidayMap: Map<string, Holiday>
  todayStr: string
}

export function MonthGrid({
  year,
  month,
  allocations,
  releases,
  householdMap,
  currentHouseholdId,
  holidayMap,
  todayStr,
}: Props) {
  // Build day cells for this month
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()

  // Monday = 0 offset (getDay returns 0=Sun, 1=Mon…)
  const startOffset = (firstDay.getDay() + 6) % 7 // Mon=0

  // Build cells as { day: number | null, key: string }
  const cells = [
    ...Array.from({ length: startOffset }, (_, i) => ({ day: null, key: `pre-${i}` })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, key: `day-${i + 1}` })),
  ]
  const trailing = (7 - (cells.length % 7)) % 7
  for (let i = 0; i < trailing; i++) cells.push({ day: null, key: `post-${i}` })

  function dateStr(day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function getAllocation(day: number): WeekAllocation | null {
    const ds = dateStr(day)
    return allocations.find((a) => a.week_start <= ds && ds <= a.week_end) ?? null
  }

  const releasedDays = new Set(releases.filter((r) => r.status === 'released').map((r) => r.date))

  return (
    <div className="mb-6">
      <h2 className="mb-2 px-1 text-sm font-semibold text-stone-600">{MONTH_NAMES[month - 1]}</h2>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-stone-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px bg-stone-100 rounded-lg overflow-hidden border border-stone-100">
        {cells.map(({ day, key }) => {
          if (!day) {
            return <div key={key} className="bg-white min-h-[52px]" />
          }

          const ds = dateStr(day)
          const allocation = getAllocation(day)
          const household = allocation?.household_id
            ? (householdMap.get(allocation.household_id) ?? null)
            : null
          const isShared = allocation && allocation.type !== 'household'
          const isReleased = allocation && releasedDays.has(ds)
          const isToday = ds === todayStr
          const isPast = ds < todayStr
          const isOwn = allocation?.household_id === currentHouseholdId
          const holiday = holidayMap.get(ds)

          const rgb = household ? hexToRgb(household.color) : null
          const bgColor = isShared
            ? 'rgba(156,163,175,0.15)'
            : rgb
              ? isReleased
                ? `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`
                : `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`
              : 'white'

          const accentColor = isShared ? '#9ca3af' : (household?.color ?? null)

          return (
            <Link key={ds} href={allocation ? `/dagatal/vika/${allocation.week_number}` : '#'}>
              <div
                className={`relative min-h-[52px] bg-white p-1 flex flex-col ${isPast ? 'opacity-50' : ''}`}
                style={{ backgroundColor: bgColor }}
              >
                {/* Allocation color strip at top */}
                {accentColor && (
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ backgroundColor: accentColor }}
                  />
                )}

                {/* Day number */}
                <div className="flex items-center justify-center">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday
                        ? 'bg-stone-900 text-white'
                        : 'text-stone-900'
                    }`}
                  >
                    {day}
                  </span>
                </div>

                {/* Holiday name */}
                {holiday && (
                  <div className="mt-0.5 text-[9px] leading-tight text-center text-amber-700 font-medium truncate px-0.5">
                    {holiday.description}
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
