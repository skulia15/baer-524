import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/email', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/email')>()),
  sendEmail: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import type { FakeDb } from '@/test/fake-supabase'
import { useDb } from '@/test/use-db'
import { HH, USER, WEEK, WEEK10_DAYS, WEEK11_DAYS, world } from '@/test/world'
import { approveSwap, cancelSwap, createSwap, declineSwap } from './swap'

type MockSupabase = ReturnType<typeof createClient> extends Promise<infer T> ? T : never

function pendingSwap(daysA: string[], daysB: string[]) {
  return {
    id: 'swap-1',
    year_id: 'yr-2026',
    household_a_id: HH.A,
    allocation_a_id: WEEK.a10,
    days_a: daysA,
    household_b_id: HH.B,
    allocation_b_id: WEEK.b11,
    days_b: daysB,
    status: 'pending_other_head',
    created_by: USER.headA,
  }
}

const owner = (db: FakeDb, allocId: string) =>
  db.rows('week_allocation').find((w) => w.id === allocId)?.household_id
const claims = (db: FakeDb) =>
  db
    .rows('day_release')
    .filter((r) => r.status === 'claimed')
    .map((r) => [r.week_allocation_id, r.date, r.claimed_by_household_id])

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
    expect(result.error).toBe('Aðeins eigendur geta samþykkt')
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
    expect(result.error).toBe('Aðeins eigendur geta hafnað')
  })
})

describe('cancelSwap', () => {
  it('returns error if not authenticated', async () => {
    mockUnauthenticated()
    const result = await cancelSwap('swap-1')
    expect(result.error).toBe('Ekki innskráður')
  })
})

describe('approveSwap — final approval by other head', () => {
  it('partial swap transfers only the chosen days and keeps week ownership', async () => {
    const db = useDb(world(USER.headB))
    db.tables.swap_proposal = [pendingSwap(WEEK10_DAYS.slice(0, 2), WEEK11_DAYS.slice(3, 5))]

    const result = await approveSwap('swap-1')

    expect(result).toEqual({ success: true })
    expect(owner(db, WEEK.a10)).toBe(HH.A)
    expect(owner(db, WEEK.b11)).toBe(HH.B)
    expect(claims(db)).toEqual([
      [WEEK.a10, WEEK10_DAYS[0], HH.B],
      [WEEK.a10, WEEK10_DAYS[1], HH.B],
      [WEEK.b11, WEEK11_DAYS[3], HH.A],
      [WEEK.b11, WEEK11_DAYS[4], HH.A],
    ])
    expect(db.rows('swap_proposal')[0].status).toBe('approved')
  })

  it('full-week swap on both sides moves week ownership', async () => {
    const db = useDb(world(USER.headB))
    db.tables.swap_proposal = [pendingSwap(WEEK10_DAYS, WEEK11_DAYS)]

    const result = await approveSwap('swap-1')

    expect(result).toEqual({ success: true })
    expect(owner(db, WEEK.a10)).toBe(HH.B)
    expect(owner(db, WEEK.b11)).toBe(HH.A)
    expect(claims(db)).toEqual([])
  })

  it('full week for part of a week is a day-level transfer', async () => {
    const db = useDb(world(USER.headB))
    db.tables.swap_proposal = [pendingSwap(WEEK10_DAYS, WEEK11_DAYS.slice(0, 3))]

    await approveSwap('swap-1')

    expect(owner(db, WEEK.a10)).toBe(HH.A)
    expect(owner(db, WEEK.b11)).toBe(HH.B)
    expect(claims(db)).toHaveLength(10)
  })

  it('refuses when a swapped day has already been claimed by someone else', async () => {
    const db = useDb(world(USER.headB))
    db.tables.swap_proposal = [pendingSwap([WEEK10_DAYS[0]], [WEEK11_DAYS[0]])]
    db.tables.day_release = [
      {
        id: 'dr-claimed',
        week_allocation_id: WEEK.a10,
        date: WEEK10_DAYS[0],
        status: 'claimed',
        claimed_by_household_id: HH.C,
      },
    ]

    const result = await approveSwap('swap-1')

    expect(result.error).toBe('Einn eða fleiri dagar eru þegar teknir')
    expect(claims(db)).toEqual([[WEEK.a10, WEEK10_DAYS[0], HH.C]])
    expect(db.rows('swap_proposal')[0].status).toBe('pending_other_head')
  })
})

describe('createSwap — validation', () => {
  it('rejects days outside the offered week', async () => {
    const db = useDb(world(USER.headA))

    const result = await createSwap(WEEK.a10, [WEEK11_DAYS[0]], WEEK.b11, [WEEK11_DAYS[1]])

    expect(result.error).toBe('Dagar verða að vera innan viðkomandi viku')
    expect(db.rows('swap_proposal')).toHaveLength(0)
  })

  it('rejects swapping with a week that has no other owning household', async () => {
    const db = useDb(world(USER.headA))
    const weekB = db.rows('week_allocation').find((w) => w.id === WEEK.b11)
    Object.assign(weekB ?? {}, { type: 'shared_spring', household_id: null })

    const result = await createSwap(WEEK.a10, [WEEK10_DAYS[0]], WEEK.b11, [WEEK11_DAYS[0]])

    expect(result.error).toBe('Veldu viku annarrar fjölskyldu')
    expect(db.rows('swap_proposal')).toHaveLength(0)
  })
})

describe('declineSwap — already resolved', () => {
  it('does not change status or notify when the swap is no longer pending', async () => {
    const db = useDb(world(USER.headB))
    db.tables.swap_proposal = [
      { ...pendingSwap([WEEK10_DAYS[0]], [WEEK11_DAYS[0]]), status: 'cancelled' },
    ]

    const result = await declineSwap('swap-1')

    expect(result.error).toBe('Tillaga er ekki í bíðstöðu')
    expect(db.rows('swap_proposal')[0].status).toBe('cancelled')
    expect(db.rows('notification')).toHaveLength(0)
  })
})
