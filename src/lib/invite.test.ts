import { beforeAll, describe, expect, it } from 'vitest'
import { signInviteToken, verifyInviteToken } from './invite'

beforeAll(() => {
  process.env.INVITE_SECRET = 'test-secret-that-is-at-least-32-characters-long'
})

describe('signInviteToken', () => {
  it('returns a JWT string', async () => {
    const token = await signInviteToken('household-123', 'inv-1')
    // JWTs are 3 base64 segments separated by dots
    expect(token.split('.').length).toBe(3)
  })

  it('embeds the householdId in the payload', async () => {
    const token = await signInviteToken('household-abc', 'inv-1')
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'))
    expect(payload.householdId).toBe('household-abc')
  })
})

describe('verifyInviteToken', () => {
  it('returns householdId for a valid token', async () => {
    const token = await signInviteToken('hh-xyz', 'inv-1')
    const result = await verifyInviteToken(token)
    expect(result).not.toBeNull()
    expect(result!.householdId).toBe('hh-xyz')
  })

  it('returns null for an invalid token', async () => {
    const result = await verifyInviteToken('not.a.valid.token')
    expect(result).toBeNull()
  })

  it('returns null for a tampered token', async () => {
    const token = await signInviteToken('hh-1', 'inv-1')
    const [header, payload, sig] = token.split('.')
    const tampered = `${header}.${payload}.invalidsignature`
    const result = await verifyInviteToken(tampered)
    expect(result).toBeNull()
  })

  it('returns null for an empty string', async () => {
    const result = await verifyInviteToken('')
    expect(result).toBeNull()
  })

  it('roundtrip: sign then verify returns same householdId', async () => {
    const householdId = 'test-household-id-123'
    const token = await signInviteToken(householdId, 'inv-1')
    const result = await verifyInviteToken(token)
    expect(result?.householdId).toBe(householdId)
  })
})
