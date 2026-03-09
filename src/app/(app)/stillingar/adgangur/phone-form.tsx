'use client'

import { updatePhone } from '@/actions/auth'
import { useState } from 'react'

interface PhoneFormProps {
  currentPhone: string | null
}

export default function PhoneForm({ currentPhone }: PhoneFormProps) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const [displayPhone, setDisplayPhone] = useState(currentPhone)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const fd = new FormData(e.currentTarget)
    const phone = (fd.get('phone') as string).replace(/\D/g, '')
    if (phone && phone.length !== 7) {
      setError('Símanúmer verður að vera 7 tölustafir')
      return
    }
    setLoading(true)
    const result = await updatePhone(phone)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setDisplayPhone(phone || null)
      setEditing(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <span className="text-stone-400">Símanúmer:</span>{' '}
          <span className="text-stone-800">{displayPhone ?? '—'}</span>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-green-700 hover:underline"
        >
          Breyta
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <label className="block text-sm text-stone-400">Símanúmer</label>
      <input
        name="phone"
        type="tel"
        defaultValue={displayPhone ?? ''}
        maxLength={7}
        className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-green-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {loading ? 'Vistar...' : 'Vista'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-lg px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-100"
        >
          Hætta við
        </button>
      </div>
    </form>
  )
}
