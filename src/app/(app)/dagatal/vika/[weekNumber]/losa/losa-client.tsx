'use client'

import { releaseDays } from '@/actions/release'
import { DayPicker } from '@/components/forms/day-picker'
import { useBanner } from '@/hooks/use-banner'
import { useWeekAllocation } from '@/hooks/use-week-allocation'
import { weekHref } from '@/lib/rotation-year'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LosaClient() {
  const { weekNumber, year, allocation, days } = useWeekAllocation()
  const router = useRouter()
  const { showBanner } = useBanner()
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  if (!allocation) return <div className="p-4 text-sm text-stone-500">Hleður...</div>

  async function handleSubmit() {
    if (!allocation || selected.length === 0) return
    setLoading(true)
    const result = await releaseDays(allocation.id, selected)
    if (result.error) {
      showBanner(result.error, 'error')
    } else {
      showBanner('Dagar losaðir')
      router.push(weekHref(year, weekNumber))
    }
    setLoading(false)
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-1 text-stone-500 transition-colors hover:bg-stone-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-stone-900">
          Gera daga lausa / Í boði — Vika {weekNumber}
        </h1>
      </div>
      <p className="mb-4 text-sm text-stone-500">Veldu daga til að losa:</p>
      <DayPicker days={days} value={selected} onChange={setSelected} />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || selected.length === 0}
        className="mt-6 w-full rounded-xl bg-green-700 py-3 text-sm font-medium text-white transition-colors hover:bg-green-800 disabled:opacity-50"
      >
        {loading ? 'Vistar...' : 'Losa valda daga'}
      </button>
    </div>
  )
}
