'use client'

import type { DayRelease, Household, WeekAllocation } from '@/types/db'
import { ChevronLeft, ChevronRight, LayoutGrid, List } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CalendarGridView } from './calendar-grid-view'
import { HouseholdLegend } from './household-legend'
import { WeekRow } from './week-row'

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

              return (
                <WeekRow
                  key={allocation.id}
                  allocation={allocation}
                  household={household}
                  releases={weekReleases}
                  isOwn={isOwn}
                  isPast={false}
                  isCurrentWeek={isCurrent}
                />
              )
            })}
        </div>
      )}
    </div>
  )
}
