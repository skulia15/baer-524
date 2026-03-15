import type { Household } from '@/types/db'

interface HouseholdLegendProps {
  households: Household[]
}

export function HouseholdLegend({ households }: HouseholdLegendProps) {
  return (
    <div className="sticky top-0 z-10 grid grid-cols-2 gap-x-4 gap-y-1.5 bg-white px-4 py-2 shadow-sm">
      {households.map((h) => (
        <div key={h.id} className="flex items-center gap-2 text-sm">
          <span
            className="h-3 w-3 flex-shrink-0 rounded-full"
            style={{ backgroundColor: h.color }}
          />
          <span className="truncate font-medium text-stone-700">{h.name}</span>
        </div>
      ))}
      <div className="flex items-center gap-2 text-sm col-span-2 mt-0.5">
        <span
          className="h-3 w-8 flex-shrink-0 rounded-full"
          style={{ background: 'repeating-linear-gradient(-45deg, #9ca3af, #9ca3af 3px, rgba(255,255,255,0.5) 3px, rgba(255,255,255,0.5) 6px)' }}
        />
        <span className="text-stone-500">Sameiginleg vika (versló / vinnuvika)</span>
      </div>
    </div>
  )
}
