import type { Household } from '@/types/db'

interface HouseholdLegendProps {
  households: Household[]
}

export function HouseholdLegend({ households }: HouseholdLegendProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-2">
      {households.map((h) => (
        <div key={h.id} className="flex items-center gap-2 text-sm">
          <span
            className="h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: h.color }}
          />
          <span className="truncate text-gray-700">{h.name}</span>
        </div>
      ))}
    </div>
  )
}
