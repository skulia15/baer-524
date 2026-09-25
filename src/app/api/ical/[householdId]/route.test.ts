import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { feedToken } from '@/lib/ical'
import { useDb } from '@/test/use-db'
import { HH, WEEK, world } from '@/test/world'
import { GET } from './route'

beforeEach(() => {
  process.env.INVITE_SECRET = 'test-secret-that-is-at-least-32-characters-long'
  vi.useFakeTimers({ now: new Date('2026-03-01T12:00:00Z') })
})
afterEach(() => vi.useRealTimers())

const get = (householdId: string, token: string) =>
  GET(new Request(`https://baer.test/api/ical/${householdId}?token=${token}`), {
    params: Promise.resolve({ householdId }),
  })

describe('GET /api/ical/[householdId]', () => {
  it("serves the household's calendar without a login", async () => {
    const db = useDb(world(null))
    db.tables.day_release = [
      {
        id: 'dr',
        week_allocation_id: WEEK.b11,
        date: '2026-03-14',
        status: 'claimed',
        claimed_by_household_id: HH.A,
      },
    ]

    const res = await get(HH.A, feedToken(HH.A))
    const body = await res.text()

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/calendar')
    expect(body).toContain('DTSTART;VALUE=DATE:20260305') // A's week 10
    expect(body).toContain('SUMMARY:Bær 524 (frá B)') // day received in B's week
    expect(body).not.toContain('DTSTART;VALUE=DATE:20260319') // C's week 12
  })

  it('rejects a token made for another household', async () => {
    useDb(world(null))

    const res = await get(HH.A, feedToken(HH.B))

    expect(res.status).toBe(404)
  })
})
