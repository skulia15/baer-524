import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))

import { useDb } from '@/test/use-db'
import { HH, USER, world } from '@/test/world'
import { signupViaInvite } from './auth'
import { generateInviteLink } from './invite'

beforeEach(() => {
  process.env.INVITE_SECRET = 'test-secret-that-is-at-least-32-characters-long'
  process.env.NEXT_PUBLIC_APP_URL = 'https://baer.test'
})

const tokenOf = (url: string) => new URL(url).searchParams.get('token') ?? ''

describe('invite links', () => {
  it('link points at the configured app URL', async () => {
    useDb(world(USER.headA))

    const { url } = await generateInviteLink(HH.A)

    expect(url).toMatch(/^https:\/\/baer\.test\/signup\?token=/)
  })

  it('can be used to sign up only once', async () => {
    const db = useDb(world(USER.headA))
    const { url } = await generateInviteLink(HH.A)
    const token = tokenOf(url ?? '')

    await signupViaInvite(token, 'Ný', 'ny@x.is', 'password123')
    const second = await signupViaInvite(token, 'Önnur', 'onnur@x.is', 'password123')

    expect(second).toEqual({ error: 'Boðshlekkur hefur þegar verið notaður eða er útrunninn' })
    const members = db.rows('profile').filter((p) => p.household_id === HH.A)
    expect(members.map((p) => p.email)).toEqual(['a@x.is', 'm@x.is', 'ny@x.is'])
  })

  it('stays usable if sign-up fails (e.g. email already registered)', async () => {
    const db = useDb(world(USER.headA))
    const { url } = await generateInviteLink(HH.A)
    const token = tokenOf(url ?? '')

    const failed = await signupViaInvite(token, 'Ný', 'b@x.is', 'password123')
    await signupViaInvite(token, 'Ný', 'ny@x.is', 'password123')

    expect(failed).toEqual({ error: 'User already registered' })
    expect(db.rows('profile').some((p) => p.email === 'ny@x.is')).toBe(true)
  })
})
