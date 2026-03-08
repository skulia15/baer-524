import type { WeekAllocation, Household, DayRelease, Profile } from '@/types/db'
import { formatDay, formatWeekRange } from '@/lib/dates'
import { getHouseholdStyle } from '@/lib/colors'
import Link from 'next/link'
import { addDays } from 'date-fns'

interface WeekDetailViewProps {
  allocation: WeekAllocation
  household: Household | null
  releases: DayRelease[]
  profile: Profile
  prevWeek: number | null
  nextWeek: number | null
}

export function WeekDetailView({
  allocation,
  household,
  releases,
  profile,
  prevWeek,
  nextWeek,
}: WeekDetailViewProps) {
  const today = new Date().toISOString().split('T')[0]
  const isPast = allocation.week_end < today
  const isOwn = allocation.household_id === profile.household_id
  const isShared = allocation.type !== 'household'

  const days: Date[] = []
  const start = new Date(allocation.week_start)
  for (let i = 0; i < 7; i++) {
    days.push(addDays(start, i))
  }

  const releasedDays = new Set(releases.filter((r) => r.status === 'released').map((r) => r.date))
  const claimedDays = new Set(releases.filter((r) => r.status === 'claimed').map((r) => r.date))

  const barStyle = isShared
    ? { backgroundColor: '#9ca3af', color: '#ffffff' }
    : household
      ? getHouseholdStyle(household.color)
      : { backgroundColor: '#9ca3af', color: '#ffffff' }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <Link href="/dagatal" className="text-blue-600">
          ← Dagatal
        </Link>
        <div className="flex gap-3">
          {prevWeek && (
            <Link href={`/dagatal/vika/${prevWeek}`} className="text-blue-600">
              ←
            </Link>
          )}
          {nextWeek && (
            <Link href={`/dagatal/vika/${nextWeek}`} className="text-blue-600">
              →
            </Link>
          )}
        </div>
      </div>

      <div className="px-4 py-3" style={barStyle}>
        <div className="font-semibold">
          Vika {allocation.week_number}
          {!isShared && household && ` — ${household.name}`}
          {isShared &&
            (allocation.type === 'shared_verslunarmannahelgi'
              ? ' — Sameiginleg (versl.)'
              : ' — Sameiginleg (vor)')}
        </div>
        <div className="text-sm opacity-90">
          {formatWeekRange(allocation.week_start, allocation.week_end)}
        </div>
      </div>

      <div className="divide-y divide-gray-100 px-4">
        {days.map((day) => {
          const dateStr = day.toISOString().split('T')[0]
          const isReleased = releasedDays.has(dateStr)
          const isClaimed = claimedDays.has(dateStr)

          return (
            <div key={dateStr} className="flex items-center justify-between py-2.5">
              <span className="text-sm">{formatDay(day)}</span>
              <span
                className={`text-xs ${isClaimed ? 'text-green-600' : isReleased ? 'text-orange-600' : 'text-gray-500'}`}
              >
                {isClaimed ? 'Krafist' : isReleased ? 'Losað' : 'Úthlutað'}
              </span>
            </div>
          )
        })}
      </div>

      {!isPast && !isShared && (
        <div className="mt-4 flex flex-col gap-2 px-4 pb-24">
          {isOwn && (
            <>
              <Link
                href={`/dagatal/vika/${allocation.week_number}/losa`}
                className="rounded bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white"
              >
                Losa daga
              </Link>
              <Link
                href={`/dagatal/vika/${allocation.week_number}/skipti`}
                className="rounded border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700"
              >
                Leggja til skipti
              </Link>
            </>
          )}
          {!isOwn && releasedDays.size > 0 && (
            <Link
              href={`/dagatal/vika/${allocation.week_number}/bidni`}
              className="rounded bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white"
            >
              Óska eftir völdum dögum
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
