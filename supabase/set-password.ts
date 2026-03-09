process.loadEnvFile('.env.local')

import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
const password = process.argv[3]

if (!email || !password) {
  console.error('Usage: npx tsx supabase/set-password.ts <email> <password>')
  process.exit(1)
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function run() {
  const { data: profile, error: profileErr } = await supabase
    .from('profile')
    .select('id')
    .eq('email', email)
    .single()

  if (profileErr || !profile) {
    console.error('User not found:', profileErr?.message)
    process.exit(1)
  }

  const { error } = await supabase.auth.admin.updateUserById(profile.id, { password })
  if (error) {
    console.error('Failed:', error.message)
    process.exit(1)
  }

  console.log(`Password set for ${email}`)
}

run().catch((err) => { console.error(err); process.exit(1) })
