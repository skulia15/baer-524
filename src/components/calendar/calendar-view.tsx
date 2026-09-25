'use client'

import type { DayRelease, Household, WeekAllocation } from '@/types/db'
import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CalendarGridView } from './calendar-grid-view'
import { HouseholdLegend } from './household-legend'
import { WeekRow } from './week-row'

interface ApprovedSwap {
  allocation_a_id: string
  allocation_b_id: string
  household_a_id: string
  household_b_id: string
}

interface CalendarViewProps {
  allocations: WeekAllocation[]
  releases: DayRelease[]
  households: Household[]
  currentHouseholdId: string
  year: number
  onYearChange: (year: number) => void
  approvedSwaps: ApprovedSwap[]
}

export function CalendarView({
  allocations,
  releases,
  households,
  currentHouseholdId,
  year,
  onYearChange,
  approvedSwaps,
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const currentWeek = allocations.find((a) => a.week_start <= todayStr && todayStr <= a.week_end)

  useEffect(() => {
    if (viewMode === 'list' && currentWeek) {
      const el = document.getElementById(`week-${currentWeek.week_number}`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentWeek, viewMode])

  const householdMap = new Map(households.map((h) => [h.id, h]))

  return (
    <div>
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onYearChange(year - 1)}
            className="rounded-lg p-1.5 text-stone-500 transition-colors hover:bg-stone-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-semibold text-stone-900">{year}</span>
          <button
            type="button"
            onClick={() => onYearChange(year + 1)}
            className="rounded-lg p-1.5 text-stone-500 transition-colors hover:bg-stone-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center rounded-lg border border-stone-200 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === 'list'
                ? 'bg-stone-900 text-white'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`rounded-md p-1.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-stone-900 text-white'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      <HouseholdLegend households={households} />

      {viewMode === 'grid' ? (
        <CalendarGridView
          allocations={allocations}
          releases={releases}
          households={households}
          currentHouseholdId={currentHouseholdId}
          year={year}
          approvedSwaps={approvedSwaps}
        />
      ) : (
        <div className="px-3 pb-20 pt-2">
          {allocations
            .filter((a) => a.week_end >= todayStr)
            .map((allocation) => {
              const household = allocation.household_id
                ? (householdMap.get(allocation.household_id) ?? null)
                : null
              const weekReleases = releases.filter((r) => r.week_allocation_id === allocation.id)
              const isCurrent = currentWeek?.id === allocation.id
              const isOwn = allocation.household_id === currentHouseholdId

              const swap = approvedSwaps.find(
                (s) => s.allocation_a_id === allocation.id || s.allocation_b_id === allocation.id,
              )
              const originalOwnerId = swap
                ? swap.allocation_a_id === allocation.id
                  ? swap.household_a_id
                  : swap.household_b_id
                : null
              // Partial swaps keep ownership (days show as claimed); only whole-week swaps move it
              const swappedFrom =
                originalOwnerId && originalOwnerId !== allocation.household_id
                  ? (householdMap.get(originalOwnerId) ?? null)
                  : null

              const claimedHouseholdIds = [
                ...new Set(
                  weekReleases
                    .filter((r) => r.status === 'claimed' && r.claimed_by_household_id)
                    .map((r) => r.claimed_by_household_id as string),
                ),
              ]
              const claimedByHousehold =
                claimedHouseholdIds.length === 1
                  ? (householdMap.get(claimedHouseholdIds[0]) ?? null)
                  : null

              return (
                <WeekRow
                  key={allocation.id}
                  allocation={allocation}
                  household={household}
                  releases={weekReleases}
                  isOwn={isOwn}
                  isPast={allocation.week_end < todayStr}
                  isCurrentWeek={isCurrent}
                  swappedFrom={swappedFrom}
                  claimedByHousehold={claimedByHousehold}
                  year={year}
                />
              )
            })}
        </div>
      )}
    </div>
  )
}
