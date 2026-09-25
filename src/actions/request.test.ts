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
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email')>()),
  sendEmail: vi.fn(),
}))

import { sendEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'
import type { FakeDb } from '@/test/fake-supabase'
import { useDb } from '@/test/use-db'
import { HH, USER, WEEK, WEEK10_DAYS, world } from '@/test/world'
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

// ── Behaviour against an in-memory database ──────────────────────────────────

function released(db: FakeDb, allocId: string, dates: string[]) {
  for (const date of dates) {
    db.tables.day_release.push({
      id: `dr-${allocId}-${date}`,
      week_allocation_id: allocId,
      date,
      status: 'released',
      claimed_by_household_id: null,
    })
  }
}

function pendingRequest(id: string, householdId: string, createdBy: string, days: string[]) {
  return {
    id,
    year_id: 'yr-2026',
    requesting_household_id: householdId,
    target_week_allocation_id: WEEK.a10,
    requested_days: days,
    status: 'pending_releasing_head',
    created_by: createdBy,
  }
}

const statusOf = (db: FakeDb, id: string) => db.rows('request').find((r) => r.id === id)?.status

describe('approveRequest — releasing head approves', () => {
  it('auto-cancels only pending requests whose days overlap the approved ones', async () => {
    const db = useDb(world(USER.headA))
    released(db, WEEK.a10, WEEK10_DAYS)
    db.tables.request = [
      pendingRequest('req-b', HH.B, USER.headB, [WEEK10_DAYS[0], WEEK10_DAYS[1]]),
      pendingRequest('req-c-overlap', HH.C, USER.headC, [WEEK10_DAYS[1], WEEK10_DAYS[2]]),
      pendingRequest('req-c-separate', HH.C, USER.headC, [WEEK10_DAYS[5]]),
    ]

    const result = await approveRequest('req-b')

    expect(result).toEqual({ success: true })
    expect(statusOf(db, 'req-b')).toBe('approved')
    expect(statusOf(db, 'req-c-overlap')).toBe('cancelled')
    expect(statusOf(db, 'req-c-separate')).toBe('pending_releasing_head')
  })
})

describe('declineRequest — already resolved', () => {
  it('does not change status or notify when the request is no longer pending', async () => {
    const db = useDb(world(USER.headA))
    db.tables.request = [
      { ...pendingRequest('req-b', HH.B, USER.headB, [WEEK10_DAYS[0]]), status: 'approved' },
    ]

    const result = await declineRequest('req-b', 'nei')

    expect(result.error).toBe('Beiðni er ekki í bíðstöðu')
    expect(statusOf(db, 'req-b')).toBe('approved')
    expect(db.rows('notification')).toHaveLength(0)
  })
})

describe('createRequest — validation', () => {
  it('rejects days that are not released in the target week', async () => {
    const db = useDb(world(USER.headB))
    released(db, WEEK.a10, [WEEK10_DAYS[0]])

    const result = await createRequest(WEEK.a10, [WEEK10_DAYS[0], WEEK10_DAYS[1]])

    expect(result.error).toBe('Einn eða fleiri dagar eru ekki lausir')
    expect(db.rows('request')).toHaveLength(0)
  })

  it('rejects requesting days in your own week', async () => {
    const db = useDb(world(USER.headA))
    released(db, WEEK.a10, [WEEK10_DAYS[0]])

    const result = await createRequest(WEEK.a10, [WEEK10_DAYS[0]])

    expect(result.error).toBe('Þetta er þín vika')
    expect(db.rows('request')).toHaveLength(0)
  })

  it('creates a request for released days and notifies the releasing head', async () => {
    const db = useDb(world(USER.headB))
    released(db, WEEK.a10, [WEEK10_DAYS[0], WEEK10_DAYS[1]])

    const result = await createRequest(WEEK.a10, [WEEK10_DAYS[0]])

    expect(result).toEqual({ success: true })
    expect(db.rows('request')).toMatchObject([
      { requesting_household_id: HH.B, status: 'pending_releasing_head' },
    ])
    expect(db.rows('notification')).toMatchObject([
      { user_id: USER.headA, type: 'request_received' },
    ])
  })

  it('emails the releasing head a link straight to the request', async () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://baer.test'
    const db = useDb(world(USER.headB))
    released(db, WEEK.a10, [WEEK10_DAYS[0]])

    await createRequest(WEEK.a10, [WEEK10_DAYS[0]])

    const requestId = db.rows('request')[0].id
    expect(vi.mocked(sendEmail)).toHaveBeenLastCalledWith(
      'a@x.is',
      expect.any(String),
      expect.stringContaining(`href="https://baer.test/tilkynningar/beidni/${requestId}"`),
    )
  })
})
