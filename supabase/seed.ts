// Load .env.local regardless of how the script is invoked
process.loadEnvFile('.env.local')

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const HOUSEHOLDS = [
  { name: 'Arnar', color: '#00966e' }, // jade
  { name: 'Maggi', color: '#2060c8' }, // cobalt blue
  { name: 'Ketill', color: '#e8900a' }, // saffron
  { name: 'Óli', color: '#7030c0' }, // violet
  { name: 'Sigurjón', color: '#d82828' }, // scarlet
]

// Replace these with real emails before running
const HEAD_EMAILS = [
  'arnar@example.com',
  'maggi@example.com',
  'ketill@example.com',
  'oli@example.com',
  'sigurjon@example.com',
]

async function seed() {
  console.log('Seeding...')

  // Create house
  const { data: house, error: houseErr } = await supabase
    .from('house')
    .insert({ name: 'Bær 524' })
    .select()
    .single()
  if (houseErr) throw houseErr
  console.log('House created:', house.id)

  // Create households
  const householdRows: { id: string; house_id: string; name: string; color: string }[] = []
  for (const h of HOUSEHOLDS) {
    const { data, error } = await supabase
      .from('household')
      .insert({ house_id: house.id, name: h.name, color: h.color })
      .select()
      .single()
    if (error) throw error
    householdRows.push(data)
    console.log(`Household ${h.name}:`, data.id)
  }

  // Create head users
  for (let i = 0; i < HOUSEHOLDS.length; i++) {
    const email = HEAD_EMAILS[i]
    const household = householdRows[i]

    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { needs_password_reset: true },
    })
    if (authErr) throw authErr

    const { error: profileErr } = await supabase.from('profile').insert({
      id: authUser.user.id,
      email,
      name: HOUSEHOLDS[i].name,
      household_id: household.id,
      role: 'head',
    })
    if (profileErr) {
      await supabase.auth.admin.deleteUser(authUser.user.id)
      throw profileErr
    }

    // Generate a one-time recovery link so the head can set their password on first login
    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: `${appUrl}/auth/callback` },
    })
    if (linkErr) {
      console.warn(`  Warning: could not generate link for ${email}:`, linkErr.message)
    } else {
      console.log(`  First-login link (send to ${HOUSEHOLDS[i].name}):`)
      console.log(`  ${linkData.properties.action_link}`)
    }
  }

  // Create year record for current year
  const currentYear = new Date().getFullYear()
  const { data: yearRecord, error: yearErr } = await supabase
    .from('year')
    .insert({
      house_id: house.id,
      year: currentYear,
      // Rotation: Ketill owns current week (week 10, 2026); index 9 % 5 = 4 → Ketill at position 4
      rotation_order: ['Maggi', 'Sigurjón', 'Arnar', 'Óli', 'Ketill'].map((name) => {
        const row = householdRows.find((h) => h.name === name)
        if (!row) throw new Error(`Household not found: ${name}`)
        return row.id
      }),
    })
    .select()
    .single()
  if (yearErr) throw yearErr
  console.log(`Year ${currentYear}:`, yearRecord.id)

  console.log('Seed complete!')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
