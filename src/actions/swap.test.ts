import { describe, it, expect, vi } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { approveSwap, declineSwap, cancelSwap, createSwap } from './swap'

type MockSupabase = ReturnType<typeof createClient> extends Promise<infer T> ? T : never

function mockUnauthenticated() {
  const supabase = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    from: vi.fn(),
  }
  vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)
  return supabase
}

function mockAsRole(role: 'head' | 'member', householdId = 'hh-1') {
  let profileFetched = false
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn().mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      const methods = ['select', 'eq', 'neq', 'in', 'update', 'insert', 'order']
      for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain)
      chain['single'] = vi.fn().mockImplementation(() => {
        if (!profileFetched) {
          profileFetched = true
          return Promise.resolve({ data: { role, household_id: householdId }, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      })
      return chain
    }),
  }
  vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)
  return supabase
}

describe('createSwap', () => {
  it('returns error if not authenticated', async () => {
    mockUnauthenticated()
    const result = await createSwap('alloc-a', ['2026-01-01'], 'alloc-b', ['2026-01-08'])
    expect(result.error).toBe('Ekki innskráður')
  })

  it('returns error if profile not found', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        const chain: Record<string, unknown> = {}
        const methods = ['select', 'eq', 'insert', 'in', 'update']
        for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain)
        chain['single'] = vi.fn().mockResolvedValue({ data: null, error: null })
        return chain
      }),
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)
    const result = await createSwap('alloc-a', ['2026-01-01'], 'alloc-b', ['2026-01-08'])
    expect(result.error).toBe('Prófíll ekki fundinn')
  })
})

describe('approveSwap', () => {
  it('returns error if not authenticated', async () => {
    mockUnauthenticated()
    const result = await approveSwap('swap-1')
    expect(result.error).toBe('Ekki innskráður')
  })

  it('returns error if user is not a head', async () => {
    mockAsRole('member')
    const result = await approveSwap('swap-1')
    expect(result.error).toBe('Aðeins yfirmenn geta samþykkt')
  })
})

describe('declineSwap', () => {
  it('returns error if not authenticated', async () => {
    mockUnauthenticated()
    const result = await declineSwap('swap-1', 'reason')
    expect(result.error).toBe('Ekki innskráður')
  })

  it('returns error if user is not a head', async () => {
    mockAsRole('member')
    const result = await declineSwap('swap-1')
    expect(result.error).toBe('Aðeins yfirmenn geta hafnað')
  })
})

describe('cancelSwap', () => {
  it('returns error if not authenticated', async () => {
    mockUnauthenticated()
    const result = await cancelSwap('swap-1')
    expect(result.error).toBe('Ekki innskráður')
  })
})
