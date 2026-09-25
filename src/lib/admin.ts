import 'server-only'

// The admin is identified by their verified auth email (from supabase.auth.getUser()).
// Never use profile.email for this: users can edit their own profile row.
export function isAdmin(user: { email?: string | null } | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  return !!adminEmail && !!user?.email && user.email.toLowerCase() === adminEmail.toLowerCase()
}
