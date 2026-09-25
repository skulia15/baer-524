'use client'

import { createRequest } from '@/actions/request'
import { DayPicker } from '@/components/forms/day-picker'
import { useBanner } from '@/hooks/use-banner'
import { useWeekAllocation } from '@/hooks/use-week-allocation'
import { weekHref } from '@/lib/rotation-year'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function BidniPage() {
  const { weekNumber, year, allocation } = useWeekAllocation()
  const router = useRouter()
  const { showBanner } = useBanner()
  const [selected, setSelected] = useState<string[]>([])
  const [senderMessage, setSenderMessage] = useState('')
  const [loading, setLoading] = useState(false)
  // Only released (unclaimed) days can be requested
  const [allDays, setAllDays] = useState<string[] | null>(null)

  useEffect(() => {
    if (!allocation) return
    createClient()
      .from('day_release')
      .select('date')
      .eq('week_allocation_id', allocation.id)
      .eq('status', 'released')
      .order('date')
      .then(({ data }) => setAllDays((data ?? []).map((r) => r.date)))
  }, [allocation])

  if (!allocation || !allDays) return <div className="p-4 text-sm text-stone-500">Hleður...</div>

  async function handleSubmit() {
    if (!allocation || selected.length === 0) return
    setLoading(true)
    const result = await createRequest(allocation.id, selected, senderMessage || undefined)
    if (result.error) {
      showBanner(result.error, 'error')
    } else {
      showBanner('Beiðni send')
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
        <h1 className="font-semibold text-stone-900">Óska eftir dögum — Vika {weekNumber}</h1>
      </div>
      <p className="mb-4 text-sm text-stone-500">Veldu daga sem þú óskar eftir:</p>
      {allDays.length === 0 ? (
        <p className="text-sm text-stone-400">Engir lausir dagar í þessari viku.</p>
      ) : (
        <DayPicker days={allDays} value={selected} onChange={setSelected} />
      )}
      <textarea
        value={senderMessage}
        onChange={(e) => setSenderMessage(e.target.value)}
        placeholder="Skilaboð (valkvætt)..."
        rows={3}
        className="mt-4 w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-green-700"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || selected.length === 0}
        className="mt-6 w-full rounded-xl bg-green-700 py-3 text-sm font-medium text-white transition-colors hover:bg-green-800 disabled:opacity-50"
      >
        {loading ? 'Sendir...' : 'Senda beiðni'}
      </button>
    </div>
  )
}
