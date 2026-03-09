'use client'

import { login } from '@/actions/auth'
import { useState } from 'react'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await login(fd.get('email') as string, fd.get('password') as string)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-4xl font-semibold tracking-tight text-stone-900">
            Bær 542
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">Bæjardagatal</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">
                Netfang
              </label>
              <input
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-green-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-stone-700">
                Lykilorð
              </label>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-green-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20"
              />
            </div>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-700 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? 'Skrái inn...' : 'Skrá inn'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
