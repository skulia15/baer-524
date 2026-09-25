'use client'

import type { DayRelease, Household, WeekAllocation } from '@/types/db'
import { getHolidays } from 'fridagar'
import type { Holiday } from 'fridagar'
import { useMemo } from 'react'
import { MonthGrid } from './month-grid'

interface ApprovedSwap {
  allocation_a_id: string
  allocation_b_id: string
  household_a_id: string
  household_b_id: string
}

interface Props {
  allocations: WeekAllocation[]
  releases: DayRelease[]
  households: Household[]
  currentHouseholdId: string
  year: number
  approvedSwaps: ApprovedSwap[]
}

export function CalendarGridView({
  allocations,
  releases,
  households,
  currentHouseholdId,
  year,
  approvedSwaps,
}: Props) {
  const todayStr = new Date().toISOString().split('T')[0]
  const householdMap = useMemo(() => new Map(households.map((h) => [h.id, h])), [households])
  const swappedAllocIds = useMemo(
    () => new Set(approvedSwaps.flatMap((s) => [s.allocation_a_id, s.allocation_b_id])),
    [approvedSwaps],
  )

  const holidayMap = useMemo(() => {
    const holidays = getHolidays(year) as Holiday[]
    const map = new Map<string, Holiday>()
    for (const h of holidays) {
      // fridagar dates are UTC midnight — extract YYYY-MM-DD
      map.set(h.date.toISOString().split('T')[0], h)
    }
    return map
  }, [year])

  return (
    <div className="px-3 pb-20 pt-2">
      {Array.from({ length: 12 }, (_, i) => i + 1)
        .filter((month) => {
          // Hide months that are over. December stays while the year's last week
          // (which can run into January) is ongoing.
          const lastWeekEnd = allocations.at(-1)?.week_end ?? ''
          const monthEnd = `${year}-${String(month).padStart(2, '0')}-31`
          const end = month === 12 && lastWeekEnd > monthEnd ? lastWeekEnd : monthEnd
          return end >= todayStr
        })
        .map((month) => (
          <MonthGrid
            key={month}
            year={year}
            month={month}
            allocations={allocations}
            releases={releases}
            householdMap={householdMap}
            currentHouseholdId={currentHouseholdId}
            holidayMap={holidayMap}
            todayStr={todayStr}
            swappedAllocIds={swappedAllocIds}
          />
        ))}
    </div>
  )
}
