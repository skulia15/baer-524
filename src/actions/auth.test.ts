import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/invite', () => ({
  verifyInviteToken: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { verifyInviteToken } from '@/lib/invite'
import { redirect } from 'next/navigation'
import { login, setPassword, signupViaInvite, logout } from './auth'

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

  it('redirects on successful login', async () => {
    const supabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
    }
    vi.mocked(createClient).mockResolvedValue(supabase as unknown as MockSupabase)

    // redirect() throws in Next.js so we catch the error
    try {
      await login('test@example.com', 'password123')
    } catch {
      // redirect throws in Next.js
    }
    expect(vi.mocked(redirect)).toHaveBeenCalledWith('/dagatal')
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
    expect(result).toEqual({ error: 'Ógilt eða útrunnið boðshlekkur' })
  })

  it('returns error if auth user creation fails', async () => {
    vi.mocked(verifyInviteToken).mockResolvedValue({ householdId: 'hh-1' })

    const serviceClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            error: { message: 'Email already in use' },
          }),
        },
      },
      from: vi.fn(),
    }
    vi.mocked(createServiceClient).mockReturnValue(serviceClient as unknown as ReturnType<typeof createServiceClient>)

    const result = await signupViaInvite('valid-token', 'Name', 'test@example.com', 'password')
    expect(result).toEqual({ error: 'Email already in use' })
  })

  it('cleans up auth user if profile insert fails', async () => {
    vi.mocked(verifyInviteToken).mockResolvedValue({ householdId: 'hh-1' })

    const deleteUser = vi.fn().mockResolvedValue({ error: null })
    // Supabase insert() is awaited directly (no .single() call)
    const insertChain = {
      then: undefined as unknown, // not a Promise itself
    }
    const insertMock = vi.fn().mockResolvedValue({ error: { message: 'Profile insert failed' } })
    const fromChain = { insert: insertMock }

    const serviceClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-user-id' } },
            error: null,
          }),
          deleteUser,
        },
      },
      from: vi.fn().mockReturnValue(fromChain),
    }
    vi.mocked(createServiceClient).mockReturnValue(serviceClient as unknown as ReturnType<typeof createServiceClient>)

    const result = await signupViaInvite('valid-token', 'Name', 'test@example.com', 'password')
    expect(deleteUser).toHaveBeenCalledWith('new-user-id')
    expect(result.error).toBeTruthy()
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
