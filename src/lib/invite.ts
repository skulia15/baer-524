import { SignJWT, jwtVerify } from 'jose'

export const INVITE_TTL_DAYS = 7

function getSecret(): Uint8Array {
  const secret = process.env.INVITE_SECRET
  if (!secret) throw new Error('INVITE_SECRET not set')
  return new TextEncoder().encode(secret)
}

// `inviteId` (the JWT id) points at an `invite` row, which makes the link single-use
export async function signInviteToken(householdId: string, inviteId: string): Promise<string> {
  return new SignJWT({ householdId })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(inviteId)
    .setExpirationTime(`${INVITE_TTL_DAYS}d`)
    .setIssuedAt()
    .sign(getSecret())
}

export async function verifyInviteToken(
  token: string,
): Promise<{ householdId: string; inviteId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    if (!payload.jti) return null
    return { householdId: payload.householdId as string, inviteId: payload.jti }
  } catch {
    return null
  }
}
