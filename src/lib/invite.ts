import { SignJWT, jwtVerify } from 'jose'

function getSecret(): Uint8Array {
  const secret = process.env.INVITE_SECRET
  if (!secret) throw new Error('INVITE_SECRET not set')
  return new TextEncoder().encode(secret)
}

export async function signInviteToken(householdId: string): Promise<string> {
  return new SignJWT({ householdId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setIssuedAt()
    .sign(getSecret())
}

export async function verifyInviteToken(
  token: string,
): Promise<{ householdId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return { householdId: payload.householdId as string }
  } catch {
    return null
  }
}
