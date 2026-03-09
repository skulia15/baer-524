'use client'

import { changePassword } from '@/actions/auth'
import { useState } from 'react'

export default function ChangePasswordForm() {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    const fd = new FormData(e.currentTarget)
    const pw = fd.get('password') as string
    const pw2 = fd.get('password2') as string
    if (pw !== pw2) {
      setError('Lykilorðin stemma ekki')
      return
    }
    if (pw.length < 8) {
      setError('Lykilorð verður að vera a.m.k. 8 stafir')
      return
    }
    setLoading(true)
    const result = await changePassword(pw)
    setLoading(false)
    if (result?.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      ;(e.target as HTMLFormElement).reset()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-stone-700">Nýtt lykilorð</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-green-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-stone-700">
          Staðfesta lykilorð
        </label>
        <input
          name="password2"
          type="password"
          required
          className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 focus:border-green-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20"
        />
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {success && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Lykilorð uppfært
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-green-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-800 disabled:opacity-50"
      >
        {loading ? 'Vistar...' : 'Breyta lykilorði'}
      </button>
    </form>
  )
}
