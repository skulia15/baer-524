'use client'

import { createRequest } from '@/actions/request'
import { DayPicker } from '@/components/forms/day-picker'
import { useBanner } from '@/hooks/use-banner'
import { createClient } from '@/lib/supabase/client'
import type { WeekAllocation } from '@/types/db'
import { addDays } from 'date-fns'
import { ChevronLeft } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function BidniPage() {
  const { weekNumber } = useParams<{ weekNumber: string }>()
  const router = useRouter()
  const { showBanner } = useBanner()
  const [allocation, setAllocation] = useState<WeekAllocation | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [senderMessage, setSenderMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const year = new Date().getFullYear()
      const { data: yr } = await supabase.from('year').select('id').eq('year', year).single()
      if (!yr) return
      const { data: alloc } = await supabase
        .from('week_allocation')
        .select('*')
        .eq('year_id', yr.id)
        .eq('week_number', Number.parseInt(weekNumber))
        .single()
      if (!alloc) return
      setAllocation(alloc)
    }
    load()
  }, [weekNumber])

  if (!allocation) return <div className="p-4 text-sm text-stone-500">Hleður...</div>

  const allDays: string[] = []
  const start = new Date(allocation.week_start)
  for (let i = 0; i < 7; i++) {
    allDays.push(addDays(start, i).toISOString().split('T')[0])
  }

  async function handleSubmit() {
    if (!allocation || selected.length === 0) return
    setLoading(true)
    const result = await createRequest(allocation.id, selected, senderMessage || undefined)
    if (result.error) {
      showBanner(result.error, 'error')
    } else {
      showBanner('Beiðni send')
      router.push(`/dagatal/vika/${weekNumber}`)
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
      <DayPicker days={allDays} value={selected} onChange={setSelected} />
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
