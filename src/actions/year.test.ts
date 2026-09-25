import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { useDb } from '@/test/use-db'
import { HH, USER, world } from '@/test/world'
import { createYear } from './year'

beforeEach(() => {
  process.env.ADMIN_EMAIL = 'a@x.is' // headA
})

describe('createYear', () => {
  it('creates the next year with the rotation continuing where the previous year ended', async () => {
    const db = useDb(world(USER.headA))

    const result = await createYear(2027)

    expect(result).toEqual({ success: true })
    const y2027 = db.rows('year').find((y) => y.year === 2027)
    // 2026 has 52 owned weeks (Verslunarmannahelgi has no owner) with rotation A,B,C:
    // the last owned week is A's, so 2027 starts with B
    expect(y2027).toMatchObject({ house_id: 'house-1', rotation_order: [HH.B, HH.C, HH.A] })
    const weeks = db.rows('week_allocation').filter((w) => w.year_id === y2027?.id)
    expect(weeks).toHaveLength(52)
    expect(weeks[0]).toMatchObject({ week_number: 1, week_start: '2027-01-07', household_id: HH.B })
  })

  it('refuses when the year already exists', async () => {
    const db = useDb(world(USER.headA))

    const result = await createYear(2026)

    expect(result.error).toBe('Árið 2026 er þegar til')
    expect(db.rows('year')).toHaveLength(1)
  })

  it('is admin-only', async () => {
    const db = useDb(world(USER.headB))

    const result = await createYear(2027)

    expect(result.error).toBe('Aðeins stjórnandi getur búið til ár')
    expect(db.rows('year')).toHaveLength(1)
  })
})
