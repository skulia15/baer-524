'use client'

import { useEffect } from 'react'
import { WeekRow } from './week-row'
import { HouseholdLegend } from './household-legend'
import type { WeekAllocation, Household, DayRelease } from '@/types/db'

interface CalendarViewProps {
  allocations: WeekAllocation[]
  releases: DayRelease[]
  households: Household[]
  currentHouseholdId: string
  year: number
  onYearChange: (year: number) => void
}

export function CalendarView({
  allocations,
  releases,
  households,
  currentHouseholdId,
  year,
  onYearChange,
}: CalendarViewProps) {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const currentWeek = allocations.find(
    (a) => a.week_start <= todayStr && todayStr <= a.week_end,
  )

  useEffect(() => {
    if (currentWeek) {
      const el = document.getElementById(`week-${currentWeek.week_number}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentWeek])

  const householdMap = new Map(households.map((h) => [h.id, h]))

  return (
    <div>
      <div className="flex items-center justify-center gap-4 py-2">
        <button
          type="button"
          onClick={() => onYearChange(year - 1)}
          className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
        >
          ◀
        </button>
        <span className="font-semibold">{year}</span>
        <button
          type="button"
          onClick={() => onYearChange(year + 1)}
          className="rounded px-2 py-1 text-gray-600 hover:bg-gray-100"
        >
          ▶
        </button>
      </div>

      <HouseholdLegend households={households} />

      <div className="px-3 pb-20 pt-2">
        {allocations.map((allocation) => {
          const household = allocation.household_id
            ? (householdMap.get(allocation.household_id) ?? null)
            : null
          const weekReleases = releases.filter((r) => r.week_allocation_id === allocation.id)
          const isPast = allocation.week_end < todayStr
          const isCurrent = currentWeek?.id === allocation.id
          const isOwn = allocation.household_id === currentHouseholdId

          return (
            <WeekRow
              key={allocation.id}
              allocation={allocation}
              household={household}
              releases={weekReleases}
              isOwn={isOwn}
              isPast={isPast}
              isCurrentWeek={isCurrent}
            />
          )
        })}
      </div>
    </div>
  )
}
