'use client'

import { cancelRequest } from '@/actions/request'
import { cancelSwap } from '@/actions/swap'
import { useBanner } from '@/hooks/use-banner'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface CancelFormProps {
  type: 'request' | 'swap'
  id: string
}

export function CancelForm({ type, id }: CancelFormProps) {
  const router = useRouter()
  const { showBanner } = useBanner()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleCancel() {
    setLoading(true)
    const result = type === 'request' ? await cancelRequest(id) : await cancelSwap(id)
    if (result.error) {
      showBanner(result.error, 'error')
      setLoading(false)
    } else {
      showBanner(type === 'request' ? 'Beiðni afturkölluð' : 'Skiptatillaga afturkölluð')
      router.push('/tilkynningar')
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="w-full rounded-xl border border-stone-200 py-3 text-sm text-stone-600 transition-colors hover:bg-stone-50"
      >
        Hætta við
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-center text-sm text-stone-600">Ertu viss um að þú viljir afturkalla?</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="flex-1 rounded-xl border border-stone-200 py-3 text-sm text-stone-600 transition-colors hover:bg-stone-50 disabled:opacity-50"
        >
          Nei
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          Já, afturkalla
        </button>
      </div>
    </div>
  )
}
