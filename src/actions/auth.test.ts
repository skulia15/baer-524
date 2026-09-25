import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/invite', () => ({
  verifyInviteToken: vi.fn(),
}))

import { verifyInviteToken } from '@/lib/invite'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { HH, world } from '@/test/world'
import { redirect } from 'next/navigation'
import { login, logout, setPassword, signupViaInvite } from './auth'

type MockSupabase = ReturnType<typeof createClient> extends Promise<infer T> ? T : never

describe('login', () => {
  it('returns error on failed login', async () => {
    const supabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          error: { message: 'Invalid login credentials' },
        }),
      },
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    const result = await login('test@example.com', 'wrongpassword')
    expect(result).toEqual({ error: 'Invalid login credentials' })
  })

  it('returns success on successful login (client navigates)', async () => {
    const supabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    const result = await login('test@example.com', 'password123')
    expect(result).toEqual({ success: true })
  })
})

describe('setPassword', () => {
  it('returns error if user not authenticated', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        updateUser: vi.fn(),
      },
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    const result = await setPassword('newpass123')
    expect(result).toEqual({ error: 'Notandi ekki innskráður' })
  })

  it('returns error if updateUser fails', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
        updateUser: vi.fn().mockResolvedValue({
          error: { message: 'Password too short' },
        }),
      },
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    const result = await setPassword('short')
    expect(result).toEqual({ error: 'Password too short' })
  })
})

describe('signupViaInvite', () => {
  it('returns error for invalid token', async () => {
    vi.mocked(verifyInviteToken).mockResolvedValue(null)

    const result = await signupViaInvite('bad-token', 'Name', 'test@example.com', 'password')
    expect(result).toEqual({ error: 'Ógildur eða útrunnin boðshlekkur' })
  })

  it('cleans up the auth user and frees the invite if the profile insert fails', async () => {
    const db = world()
    db.tables.invite = [
      { id: 'inv-1', household_id: HH.A, expires_at: '2999-01-01T00:00:00Z', used_at: null },
    ]
    db.failures['profile.insert'] = 'Profile insert failed'
    vi.mocked(verifyInviteToken).mockResolvedValue({ householdId: HH.A, inviteId: 'inv-1' })
    vi.mocked(createServiceClient).mockReturnValue(
      db.client('service') as unknown as ReturnType<typeof createServiceClient>,
    )

    const result = await signupViaInvite('valid-token', 'Name', 'test@example.com', 'password')

    expect(result).toEqual({ error: 'Profile insert failed' })
    expect(Object.values(db.authEmails)).not.toContain('test@example.com')
    expect(db.rows('invite')[0].used_at).toBeNull()
  })
})

describe('logout', () => {
  it('calls signOut and redirects to /login', async () => {
    const supabase = {
      auth: {
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    try {
      await logout()
    } catch {
      // redirect throws
    }
    expect(supabase.auth.signOut).toHaveBeenCalled()
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/login')
  })
})
