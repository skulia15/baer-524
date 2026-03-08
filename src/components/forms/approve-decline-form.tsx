'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveRequest, declineRequest } from '@/actions/request'
import { approveSwap, declineSwap } from '@/actions/swap'
import { useBanner } from '@/hooks/use-banner'

interface ApproveDeclineFormProps {
  type: 'request' | 'swap'
  id: string
}

export function ApproveDeclineForm({ type, id }: ApproveDeclineFormProps) {
  const router = useRouter()
  const { showBanner } = useBanner()
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleApprove() {
    setLoading(true)
    const result = type === 'request' ? await approveRequest(id) : await approveSwap(id)
    if (result.error) {
      showBanner(result.error, 'error')
    } else {
      showBanner(type === 'request' ? 'Beiðni samþykkt' : 'Skipti samþykkt')
      router.push('/tilkynningar')
    }
    setLoading(false)
  }

  async function handleDecline() {
    setLoading(true)
    const result =
      type === 'request' ? await declineRequest(id, reason) : await declineSwap(id, reason)
    if (result.error) {
      showBanner(result.error, 'error')
    } else {
      showBanner(type === 'request' ? 'Beiðni hafnað' : 'Skiptatillögu hafnað')
      router.push('/tilkynningar')
    }
    setLoading(false)
  }

  return (
    <div>
      {!declining ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            className="flex-1 rounded bg-green-600 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Samþykkja
          </button>
          <button
            type="button"
            onClick={() => setDeclining(true)}
            disabled={loading}
            className="flex-1 rounded bg-red-600 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Hafna
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ástæða (valfrjálst)..."
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            rows={3}
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDeclining(false)}
              className="flex-1 rounded border border-gray-300 py-3 text-sm text-gray-700"
            >
              Hætta við
            </button>
            <button
              type="button"
              onClick={handleDecline}
              disabled={loading}
              className="flex-1 rounded bg-red-600 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Staðfesta höfnun
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
