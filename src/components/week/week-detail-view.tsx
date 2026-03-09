import { getHouseholdStyle } from '@/lib/colors'
import { formatDay, formatWeekRange } from '@/lib/dates'
import type { DayPlan, DayRelease, Household, Profile, WeekAllocation } from '@/types/db'
import { addDays } from 'date-fns'
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarCheck,
  CalendarPlus,
  CalendarX,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import Link from 'next/link'

interface WeekDetailViewProps {
  allocation: WeekAllocation
  household: Household | null
  releases: DayRelease[]
  plans: DayPlan[]
  profile: Profile
  prevWeek: number | null
  nextWeek: number | null
}

export function WeekDetailView({
  allocation,
  household,
  releases,
  plans,
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
  const plannedDays = new Set(plans.map((p) => p.date))

  const barStyle = isShared
    ? { backgroundColor: '#9ca3af', color: '#ffffff' }
    : household
      ? getHouseholdStyle(household.color)
      : { backgroundColor: '#9ca3af', color: '#ffffff' }

  return (
    <div>
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
        <Link href="/dagatal" className="flex items-center gap-1 text-sm text-green-700">
          <ArrowLeft className="h-4 w-4" />
          Dagatal
        </Link>
        <div className="flex gap-1">
          {prevWeek && (
            <Link
              href={`/dagatal/vika/${prevWeek}`}
              className="rounded-lg p-1.5 text-green-700 transition-colors hover:bg-stone-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
          )}
          {nextWeek && (
            <Link
              href={`/dagatal/vika/${nextWeek}`}
              className="rounded-lg p-1.5 text-green-700 transition-colors hover:bg-stone-100"
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      <div className="px-4 py-3" style={barStyle}>
        <div className="font-semibold">
          Vika {allocation.week_number}
          {!isShared && household && ` — ${household.name}`}
          {isShared &&
            (allocation.type === 'shared_verslunarmannahelgi' ? ' — Versló vika' : ' — Vinnuvika')}
        </div>
        <div className="text-sm opacity-90">
          {formatWeekRange(allocation.week_start, allocation.week_end)}
        </div>
      </div>

      <div className="divide-y divide-stone-100 px-4">
        {days.map((day) => {
          const dateStr = day.toISOString().split('T')[0]
          const isReleased = releasedDays.has(dateStr)
          const isClaimed = claimedDays.has(dateStr)
          const isPlanned = plannedDays.has(dateStr)

          let statusLabel: string
          let statusColor: string
          if (isClaimed) {
            statusLabel = 'Krafist'
            statusColor = 'text-green-700'
          } else if (isReleased) {
            statusLabel = 'Losað'
            statusColor = 'text-orange-600'
          } else if (isPlanned) {
            statusLabel = 'Staðfest'
            statusColor = 'text-green-600'
          } else {
            statusLabel = 'Úthlutað'
            statusColor = 'text-stone-400'
          }

          return (
            <div key={dateStr} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-stone-800">{formatDay(day)}</span>
              <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
            </div>
          )
        })}
      </div>

      {!isPast && !isShared && (
        <div className="mt-4 flex flex-col gap-2 px-4 pb-24">
          {isOwn && (
            <>
              <Link
                href={`/dagatal/vika/${allocation.week_number}/stadfesta`}
                className="flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-800"
              >
                <CalendarCheck className="h-4 w-4" />
                Staðfesta nýtingu
              </Link>
              <Link
                href={`/dagatal/vika/${allocation.week_number}/losa`}
                className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                <CalendarX className="h-4 w-4" />
                Gera daga lausa / Í boði
              </Link>
              <Link
                href={`/dagatal/vika/${allocation.week_number}/skipti`}
                className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Leggja til skipti
              </Link>
            </>
          )}
          {!isOwn && (
            <>
              <Link
                href={`/dagatal/vika/${allocation.week_number}/bidni`}
                className="flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-green-800"
              >
                <CalendarPlus className="h-4 w-4" />
                Óska eftir dögum
              </Link>
              <Link
                href={`/dagatal/vika/${allocation.week_number}/skipti`}
                className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-4 py-3 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
              >
                <ArrowLeftRight className="h-4 w-4" />
                Leggja til skipti
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
