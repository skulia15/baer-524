import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })),
  })),
}))

import { createClient } from '@/lib/supabase/server'
import { releaseDays, retractRelease } from './release'

type MockSupabase = ReturnType<typeof createClient> extends Promise<infer T> ? T : never

function makeChain(singleData: unknown) {
  // Use a real Promise as base so `await chain` works without needing a manual `then` property
  const chain = Object.assign(
    Promise.resolve({ data: singleData, error: null }),
    {} as Record<string, unknown>,
  )
  const methods = ['select', 'eq', 'neq', 'in', 'update', 'insert', 'delete', 'not']
  for (const m of methods) (chain as Record<string, unknown>)[m] = vi.fn().mockReturnValue(chain)
  ;(chain as Record<string, unknown>).single = vi
    .fn()
    .mockResolvedValue({ data: singleData, error: null })
  ;(chain as Record<string, unknown>).maybeSingle = vi
    .fn()
    .mockResolvedValue({ data: singleData, error: null })
  return chain
}

describe('releaseDays', () => {
  it('returns error if not authenticated', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    const result = await releaseDays('alloc-1', ['2026-01-01'])
    expect(result.error).toBe('Ekki innskráður')
  })

  it('returns error if profile not found', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => makeChain(null)),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    const result = await releaseDays('alloc-1', ['2026-01-01'])
    expect(result.error).toBe('Prófíll ekki fundinn')
  })

  it('returns error if member (non-admin) tries to release days', async () => {
    process.env.ADMIN_EMAIL = 'admin@test.com'
    let callCount = 0
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1)
          return makeChain({ role: 'member', household_id: 'hh-1', email: 'member@example.com' })
        if (callCount === 2)
          return makeChain({
            id: 'alloc-1',
            household_id: 'hh-1',
            week_number: 5,
            year_id: 'yr-1',
            year: { house_id: 'house-1' },
          })
        return makeChain(null)
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    const result = await releaseDays('alloc-1', ['2026-01-01'])
    expect(result.error).toBe('Aðeins eigendur geta losað daga')
  })

  it('succeeds for admin user with member role', async () => {
    process.env.ADMIN_EMAIL = 'admin@test.com'
    let callCount = 0
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1)
          return makeChain({ role: 'member', household_id: 'hh-1', email: 'admin@test.com' })
        if (callCount === 2)
          return makeChain({
            id: 'alloc-1',
            household_id: 'hh-1',
            week_number: 5,
            year_id: 'yr-1',
            year: { house_id: 'house-1' },
          })
        return makeChain(null)
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    const result = await releaseDays('alloc-1', ['2026-01-01'])
    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
  })

  it('returns error if week does not belong to user household', async () => {
    let callCount = 0
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) return makeChain({ role: 'head', household_id: 'hh-1' })
        return makeChain({
          id: 'alloc-1',
          household_id: 'hh-2',
          week_number: 5,
          year_id: 'yr-1',
          year: { house_id: 'house-1' },
        })
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    const result = await releaseDays('alloc-1', ['2026-01-01'])
    expect(result.error).toBe('Þetta er ekki þín vika')
  })
})

describe('retractRelease', () => {
  it('returns error if not authenticated', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    const result = await retractRelease(['dr-1', 'dr-2'])
    expect(result.error).toBe('Ekki innskráður')
  })

  it('returns success if authenticated', async () => {
    let callCount = 0
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) return makeChain({ household_id: 'hh-1' })
        if (callCount === 2)
          return makeChain([{ id: 'dr-1', week_allocation: { household_id: 'hh-1' } }])
        return makeChain(null)
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    const result = await retractRelease(['dr-1'])
    expect(result.error).toBeUndefined()
    expect(result.success).toBe(true)
  })
})
