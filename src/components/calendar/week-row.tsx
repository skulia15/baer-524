'use client'

import { getHouseholdFadedStyle, getHouseholdStyle } from '@/lib/colors'
import { formatWeekRange } from '@/lib/dates'
import type { DayRelease, Household, WeekAllocation } from '@/types/db'
import Link from 'next/link'

interface WeekRowProps {
  allocation: WeekAllocation
  household: Household | null
  releases: DayRelease[]
  isOwn: boolean
  isPast: boolean
  isCurrentWeek: boolean
}

function darkenColor(hex: string): string {
  const num = Number.parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, (num >> 16) - 40)
  const g = Math.max(0, ((num >> 8) & 0xff) - 40)
  const b = Math.max(0, (num & 0xff) - 40)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

export function WeekRow({
  allocation,
  household,
  releases,
  isOwn,
  isPast,
  isCurrentWeek,
}: WeekRowProps) {
  const releasedCount = releases.filter((r) => r.status === 'released').length
  const isFullyReleased = releasedCount === 7
  const isPartiallyReleased = releasedCount > 0 && releasedCount < 7
  const isShared = allocation.type !== 'household'

  const barStyle = isShared
    ? { backgroundColor: '#9ca3af', color: '#ffffff' }
    : isOwn && isFullyReleased && household
      ? getHouseholdFadedStyle(household.color)
      : household
        ? getHouseholdStyle(household.color)
        : { backgroundColor: '#9ca3af', color: '#ffffff' }

  const label = isShared
    ? allocation.type === 'shared_verslunarmannahelgi'
      ? 'Versló vika'
      : 'Vinnuvika'
    : (household?.name ?? '—')

  return (
    <Link href={`/dagatal/vika/${allocation.week_number}`}>
      <div
        id={`week-${allocation.week_number}`}
        className={`mb-1 cursor-pointer ${isPast ? 'opacity-50' : ''}`}
      >
        <div
          className={`relative rounded-lg px-3 py-2.5 ${isCurrentWeek ? 'ring-2 ring-stone-800 ring-offset-1' : ''}`}
          style={barStyle}
        >
          {isOwn && !isShared && (
            <div
              className="absolute bottom-0 left-0 top-0 w-1 rounded-l-lg"
              style={{ backgroundColor: household ? darkenColor(household.color) : '#000' }}
            />
          )}
          <div className="flex items-center justify-between pl-2">
            <div>
              <div className="text-xs font-semibold">
                V.{allocation.week_number}{' '}
                {formatWeekRange(allocation.week_start, allocation.week_end)}
              </div>
              <div className="text-xs opacity-80">{label}</div>
            </div>
            {(isFullyReleased || isPartiallyReleased) && !isShared && (
              <span className="ml-2 rounded-md bg-white/25 px-1.5 py-0.5 text-[10px] font-semibold">
                Losað
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
