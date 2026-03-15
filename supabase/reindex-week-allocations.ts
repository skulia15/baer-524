// One-time script: reindex household_id on all week_allocation rows using current
// rotation logic (sacrifice semantics for shared weeks).
// Run: npx tsx supabase/reindex-week-allocations.ts
process.loadEnvFile('.env.local')

import { createClient } from '@supabase/supabase-js'
import { generateAllocations } from '../src/lib/weeks'
import type { Household, Year } from '../src/types/db'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function main() {
  const { data: years } = await supabase.from('year').select('*')
  if (!years?.length) { console.error('No years found'); process.exit(1) }

  for (const yearRecord of years) {
    const { data: households } = await supabase
      .from('household')
      .select('*')
      .eq('house_id', yearRecord.house_id)
    if (!households?.length) { console.warn(`No households for year ${yearRecord.year}`); continue }

    const allocations = generateAllocations(yearRecord as Year, households as Household[])

    const { data: existing } = await supabase
      .from('week_allocation')
      .select('id, week_number')
      .eq('year_id', yearRecord.id)
    if (!existing) { console.warn(`No rows for year ${yearRecord.year}`); continue }

    const byWeek = new Map(existing.map((r) => [r.week_number, r.id]))

    let updated = 0
    for (const alloc of allocations) {
      const id = byWeek.get(alloc.week_number)
      if (!id) continue
      const { error } = await supabase
        .from('week_allocation')
        .update({ household_id: alloc.household_id })
        .eq('id', id)
      if (error) { console.error(`Week ${alloc.week_number}:`, error.message); process.exit(1) }
      updated++
    }

    console.log(`Year ${yearRecord.year}: updated ${updated} rows`)
  }

  console.log('Done')
}

main()
