import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: vi.fn(() => ({
    from: vi.fn(() => ({ insert: vi.fn().mockResolvedValue({ error: null }) })),
  })),
}))

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import type { FakeDb } from '@/test/fake-supabase'
import { useDb } from '@/test/use-db'
import { HH, USER, WEEK, WEEK10_DAYS, world } from '@/test/world'
import { releaseDays, retractRelease, setDayPlans } from './release'

type MockSupabase = ReturnType<typeof createClient> extends Promise<infer T> ? T : never
type ServiceClient = ReturnType<typeof createServiceClient>

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
    process.env.ADMIN_EMAIL = 'm@x.is' // memberA's email
    const db = useDb(world(USER.memberA))

    const result = await releaseDays(WEEK.a10, [WEEK10_DAYS[0]])
    expect(result).toEqual({ success: true })
    expect(db.rows('day_release')).toMatchObject([{ date: WEEK10_DAYS[0], status: 'released' }])
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

  it('deletes own unclaimed releases', async () => {
    const db = world(USER.headA)
    db.tables.day_release = [
      { id: 'dr-1', week_allocation_id: WEEK.a10, date: WEEK10_DAYS[0], status: 'released' },
      { id: 'dr-2', week_allocation_id: WEEK.a10, date: WEEK10_DAYS[1], status: 'released' },
    ]
    vi.mocked(createClient).mockResolvedValue(db.client() as unknown as MockSupabase)
    vi.mocked(createServiceClient).mockReturnValue(db.client('service') as unknown as ServiceClient)

    const result = await retractRelease(['dr-1'])
    expect(result).toEqual({ success: true })
    expect(db.rows('day_release').map((r) => r.id)).toEqual(['dr-2'])
  })
})

describe('releaseDays — validation', () => {
  it('rejects dates outside the week', async () => {
    const db = useDb(world(USER.headA))

    const result = await releaseDays(WEEK.a10, [WEEK10_DAYS[6], '2026-03-12'])

    expect(result.error).toBe('Dagar verða að vera innan vikunnar')
    expect(db.rows('day_release')).toHaveLength(0)
  })
})

describe('setDayPlans — shared weeks', () => {
  const plans = (db: FakeDb) =>
    db
      .rows('day_plan')
      .map((p) => [p.household_id, p.date])
      .sort()

  it('lets several households sign up for the same shared days', async () => {
    const db = useDb(world(USER.memberA))
    await setDayPlans(WEEK.shared13, ['2026-03-27', '2026-03-28'])

    db.userId = USER.headB
    const result = await setDayPlans(WEEK.shared13, ['2026-03-28'])

    expect(result).toEqual({ success: true })
    expect(plans(db)).toEqual([
      [HH.A, '2026-03-27'],
      [HH.A, '2026-03-28'],
      [HH.B, '2026-03-28'],
    ])
  })

  it("changing your sign-up leaves other households' untouched", async () => {
    const db = useDb(world(USER.headB))
    db.tables.day_plan = [
      { id: 'p1', week_allocation_id: WEEK.shared13, date: '2026-03-28', household_id: HH.A },
    ]

    await setDayPlans(WEEK.shared13, [])

    expect(plans(db)).toEqual([[HH.A, '2026-03-28']])
  })

  it("still refuses plans in another household's own week", async () => {
    const db = useDb(world(USER.headB))

    const result = await setDayPlans(WEEK.a10, [WEEK10_DAYS[0]])

    expect(result.error).toBe('Ekki heimild')
    expect(db.rows('day_plan')).toHaveLength(0)
  })
})
