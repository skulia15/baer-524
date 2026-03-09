import { createClient } from '@/lib/supabase/server'
import { ShoppingCart } from 'lucide-react'
import { redirect } from 'next/navigation'
import { ShoppingListClient } from './shopping-list-client'

export default async function InnkaupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profile')
    .select('household_id, household:household_id(house_id)')
    .eq('id', user.id)
    .single()
  if (!profile) {
    await supabase.auth.signOut()
    redirect('/login')
  }

  const household = profile.household as unknown as { house_id: string } | null
  if (!household) redirect('/login')

  const [{ data: items }, { data: log }] = await Promise.all([
    supabase
      .from('shopping_item')
      .select(
        '*, reported_by_household:reported_by_household_id(name), bought_by_household:bought_by_household_id(name)',
      )
      .eq('house_id', household.house_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('shopping_item_log')
      .select('*, household:household_id(name)')
      .eq('house_id', household.house_id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const typedItems = (items ?? []) as unknown as {
    id: string
    name: string
    created_by: string
    bought_at: string | null
    reported_by_household: { name: string } | null
    bought_by_household: { name: string } | null
  }[]

  const typedLog = (log ?? []) as unknown as {
    id: string
    action: 'added' | 'bought' | 'deleted'
    item_name: string
    created_at: string
    household: { name: string } | null
  }[]

  const pendingCount = typedItems.filter((i) => !i.bought_at).length

  return (
    <div>
      <div className="border-b border-stone-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-stone-500" />
          <h1 className="font-semibold text-stone-900">Innkaupslisti</h1>
          {pendingCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green-700 px-1.5 text-xs font-bold text-white">
              {pendingCount}
            </span>
          )}
        </div>
      </div>
      <ShoppingListClient items={typedItems} log={typedLog} />
    </div>
  )
}
