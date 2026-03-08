import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Supabase mock ─────────────────────────────────────────────────────────────
// Build a chainable mock that returns configured data at .single() / .eq() etc.

function makeSupabaseMock(overrides: Record<string, unknown> = {}) {
  const chain = {
    data: null as unknown,
    error: null as unknown,
    ...overrides,
  }

  // Every method returns `this` for chaining, except terminal calls
  const proxy: Record<string, unknown> = {}
  const terminal = ['single', 'maybeSingle']
  const chainable = [
    'from',
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'in',
    'not',
    'order',
    'limit',
    'is',
  ]

  for (const method of chainable) {
    proxy[method] = vi.fn().mockReturnValue(proxy)
  }

  for (const method of terminal) {
    proxy[method] = vi.fn().mockResolvedValue({ data: chain.data, error: chain.error })
  }

  // count queries
  proxy['select'] = vi.fn().mockReturnValue(proxy)
  proxy['head'] = chain

  return proxy
}

// We need per-query control, so use a factory pattern
function buildMock(queries: Map<string, { data: unknown; error: unknown }>) {
  let currentTable = ''

  function makeChain(data: unknown, error: unknown) {
    const c: Record<string, unknown> = {}
    const methods = [
      'select',
      'insert',
      'update',
      'delete',
      'eq',
      'neq',
      'in',
      'not',
      'order',
      'limit',
    ]
    for (const m of methods) {
      c[m] = vi.fn().mockReturnValue(c)
    }
    c['single'] = vi.fn().mockResolvedValue({ data, error })
    c['maybeSingle'] = vi.fn().mockResolvedValue({ data, error })
    return c
  }

  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      currentTable = table
      const q = queries.get(table)
      return makeChain(q?.data ?? null, q?.error ?? null)
    }),
  }

  return supabase
}

// ── Mock next/navigation ──────────────────────────────────────────────────────
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// ── Mock the server client ────────────────────────────────────────────────────
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { approveRequest, cancelRequest, createRequest, declineRequest } from './request'

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockSupabaseWith(tableData: Record<string, unknown>) {
  const supabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      const data = tableData[table] ?? null
      const chain: Record<string, unknown> = {}
      const chainMethods = [
        'select',
        'insert',
        'update',
        'delete',
        'eq',
        'neq',
        'in',
        'not',
        'order',
      ]
      for (const m of chainMethods) {
        chain[m] = vi.fn().mockReturnValue(chain)
      }
      chain['single'] = vi.fn().mockResolvedValue({ data, error: null })
      chain['maybeSingle'] = vi.fn().mockResolvedValue({ data, error: null })
      return chain
    }),
  }
  vi.mocked(createClient).mockResolvedValue(
    supabase as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
  )
  return supabase
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('approveRequest', () => {
  it('returns error if user is not authenticated', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
    )

    const result = await approveRequest('req-1')
    expect(result.error).toBe('Ekki innskráður')
  })

  it('returns error if user is not a head', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        const chain: Record<string, unknown> = {}
        const methods = ['select', 'eq', 'in', 'update', 'insert', 'neq']
        for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain)
        chain['single'] = vi.fn().mockResolvedValue({
          data: { role: 'member', household_id: 'hh-1' },
          error: null,
        })
        return chain
      }),
    }
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
    )

    const result = await approveRequest('req-1')
    expect(result.error).toBe('Aðeins eigendur geta samþykkt')
  })

  it('returns error if request is not in pending state', async () => {
    let callCount = 0
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        callCount++
        const chain: Record<string, unknown> = {}
        const methods = ['select', 'eq', 'in', 'update', 'insert', 'neq']
        for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain)
        chain['single'] = vi.fn().mockResolvedValue({
          data:
            callCount === 1
              ? { role: 'head', household_id: 'hh-1' }
              : {
                  status: 'approved',
                  requesting_household_id: 'hh-2',
                  allocation: { household_id: 'hh-1', week_number: 5, year_id: 'yr-1' },
                },
          error: null,
        })
        return chain
      }),
    }
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
    )

    const result = await approveRequest('req-1')
    expect(result.error).toBe('Beiðni er ekki í bíðstöðu')
  })
})

describe('declineRequest', () => {
  it('returns error if user is not a head', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        const chain: Record<string, unknown> = {}
        const methods = ['select', 'eq', 'in', 'update', 'insert']
        for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain)
        chain['single'] = vi.fn().mockResolvedValue({
          data: { role: 'member' },
          error: null,
        })
        return chain
      }),
    }
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
    )

    const result = await declineRequest('req-1', 'test reason')
    expect(result.error).toBe('Aðeins eigendur geta hafnað')
  })
})

describe('cancelRequest', () => {
  it('returns error if not authenticated', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
    )

    const result = await cancelRequest('req-1')
    expect(result.error).toBe('Ekki innskráður')
  })
})

describe('createRequest', () => {
  it('returns error if not authenticated', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: vi.fn(),
    }
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
    )

    const result = await createRequest('alloc-1', ['2026-06-04'])
    expect(result.error).toBe('Ekki innskráður')
  })

  it('returns error if profile not found', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      },
      from: vi.fn().mockImplementation(() => {
        const chain: Record<string, unknown> = {}
        const methods = ['select', 'eq', 'in', 'insert']
        for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain)
        chain['single'] = vi.fn().mockResolvedValue({ data: null, error: null })
        return chain
      }),
    }
    vi.mocked(createClient).mockResolvedValue(
      supabase as unknown as ReturnType<typeof createClient> extends Promise<infer T> ? T : never,
    )

    const result = await createRequest('alloc-1', ['2026-06-04'])
    expect(result.error).toBe('Prófíll ekki fundinn')
  })
})
