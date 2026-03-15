'use client'

import { getHouseholdFadedStyle, getHouseholdSharedStyle, getHouseholdStyle } from '@/lib/colors'
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
  swappedFrom?: Household | null
  claimedByHousehold?: Household | null
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
  swappedFrom = null,
  claimedByHousehold = null,
}: WeekRowProps) {
  const availableCount = releases.filter((r) => r.status === 'released').length
  const claimedCount = releases.filter((r) => r.status === 'claimed').length
  const isFullyReleased = availableCount === 7
  const isPartiallyReleased = availableCount > 0 && availableCount < 7
  const hasAvailable = availableCount > 0
  const isShared = allocation.type !== 'household'

  const sharedLabel =
    allocation.type === 'shared_verslunarmannahelgi' ? 'Versló vika' : 'Vinnuvika'

  const barStyle = isShared
    ? household
      ? getHouseholdSharedStyle(household.color)
      : { background: 'repeating-linear-gradient(-45deg, #9ca3af, #9ca3af 8px, rgba(255,255,255,0.22) 8px, rgba(255,255,255,0.22) 16px)', color: '#ffffff' }
    : isOwn && isFullyReleased && household
      ? getHouseholdFadedStyle(household.color)
      : !isOwn && hasAvailable && household
        ? getHouseholdFadedStyle(household.color)
        : household
          ? getHouseholdStyle(household.color)
          : { backgroundColor: '#9ca3af', color: '#ffffff' }

  const label = isShared
    ? household
      ? `${household.name} — ${sharedLabel}`
      : sharedLabel
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
              {swappedFrom && !isShared && (
                <div className="text-[10px] opacity-60 mt-0.5">↔ Skipti frá {swappedFrom.name}</div>
              )}
            </div>
            {(isFullyReleased || isPartiallyReleased) && !isShared && isOwn && (
              <span className="ml-2 rounded-md bg-white/25 px-1.5 py-0.5 text-[10px] font-semibold">
                {isFullyReleased ? 'Laust' : `${availableCount}d laust`}
              </span>
            )}
            {hasAvailable && !isShared && !isOwn && (
              <span className="ml-2 rounded-md bg-white/30 px-1.5 py-0.5 text-[10px] font-semibold">
                {availableCount === 7 ? 'Laust' : `${availableCount}d laust`}
              </span>
            )}
            {claimedCount > 0 && !isShared && !isOwn && !hasAvailable && (
              <span className="ml-2 rounded-md bg-white/25 px-1.5 py-0.5 text-[10px] font-semibold">
                {claimedByHousehold ? `Tekið – ${claimedByHousehold.name}` : 'Tekið'}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
