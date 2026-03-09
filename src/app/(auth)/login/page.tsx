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
    } else {
      window.location.href = '/dagatal'
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Cover image */}
      <div className="relative min-h-[45vh] lg:min-h-screen">
        <img
          src="/cover.jpg"
          alt="Bær 524"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Gradient scrim — visible on mobile, subtle on desktop */}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent lg:bg-linear-to-r lg:from-transparent lg:to-black/10" />
        <div className="absolute bottom-6 left-6 lg:bottom-10 lg:left-10">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white drop-shadow lg:text-4xl">
            Bær 524
          </h1>
          <p className="mt-1 text-sm text-white/80 drop-shadow">Bæjardagatal</p>
        </div>
      </div>

      {/* Login form */}
      <div className="flex items-center justify-center bg-stone-50 px-6 py-12 lg:py-0">
        <div className="w-full max-w-sm">
          <h2 className="mb-6 text-xl font-semibold text-stone-900">Skrá inn</h2>
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-stone-700">
                  Netfang
                </label>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-green-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-600/20"
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-stone-700"
                >
                  Lykilorð
                </label>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
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
    </div>
  )
}
