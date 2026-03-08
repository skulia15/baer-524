import { markAllRead } from '@/actions/notifications'
import { formatRelativeTime } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import type { Notification } from '@/types/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const STATUS_LABELS: Record<string, string> = {
  pending_own_head: 'Bíður samþykkis eigin eiganda',
  pending_releasing_head: 'Bíður samþykkis losandi fjölskyldu',
  pending_other_head: 'Bíður samþykkis annarrar fjölskyldu',
}

function getNotifHref(n: Notification): string {
  if (n.reference_type === 'request' && n.reference_id)
    return `/tilkynningar/bidni/${n.reference_id}`
  if (n.reference_type === 'swap_proposal' && n.reference_id)
    return `/tilkynningar/skipti/${n.reference_id}`
  return '/tilkynningar'
}

export default async function TilkynningarPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profile').select('*').eq('id', user.id).single()
  const hhId = profile?.household_id

  const [{ data: notifications }, { data: myRequests }, { data: mySwaps }] = await Promise.all([
    supabase
      .from('notification')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    hhId
      ? supabase
          .from('request')
          .select(
            'id, status, allocation:target_week_allocation_id(week_number, household:household_id(name))',
          )
          .eq('requesting_household_id', hhId)
          .in('status', ['pending_own_head', 'pending_releasing_head'])
      : { data: [] },
    hhId
      ? supabase
          .from('swap_proposal')
          .select(
            'id, status, household_a:household_a_id(name), household_b:household_b_id(name), allocation_a:allocation_a_id(week_number), allocation_b:allocation_b_id(week_number)',
          )
          .or(`household_a_id.eq.${hhId},household_b_id.eq.${hhId}`)
          .in('status', ['pending_own_head', 'pending_other_head'])
      : { data: [] },
  ])

  await markAllRead()

  return (
    <div>
      <div className="border-b border-stone-100 px-4 py-3">
        <h1 className="font-semibold text-stone-900">Tilkynningar</h1>
      </div>

      {(myRequests ?? []).length > 0 && (
        <div className="border-b border-stone-100">
          <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Mínar beiðnir
          </p>
          <div className="divide-y divide-stone-100">
            {(myRequests ?? []).map((r) => {
              const alloc = r.allocation as unknown as { week_number: number; household: { name: string } | null } | null
              return (
                <Link key={r.id} href={`/tilkynningar/bidni/${r.id}`}>
                  <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-stone-50">
                    <p className="text-sm text-stone-800">
                      Vika {alloc?.week_number}
                      {alloc?.household ? ` (${alloc.household.name})` : ''}
                    </p>
                    <p className="text-xs text-stone-400">{STATUS_LABELS[r.status] ?? r.status}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {(mySwaps ?? []).length > 0 && (
        <div className="border-b border-stone-100">
          <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Mín skipti
          </p>
          <div className="divide-y divide-stone-100">
            {(mySwaps ?? []).map((s) => {
              const hhA = s.household_a as unknown as { name: string } | null
              const hhB = s.household_b as unknown as { name: string } | null
              const allocA = s.allocation_a as unknown as { week_number: number } | null
              const allocB = s.allocation_b as unknown as { week_number: number } | null
              return (
                <Link key={s.id} href={`/tilkynningar/skipti/${s.id}`}>
                  <div className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-stone-50">
                    <p className="text-sm text-stone-800">
                      V.{allocA?.week_number} ({hhA?.name}) ↔ V.{allocB?.week_number} ({hhB?.name})
                    </p>
                    <p className="text-xs text-stone-400">{STATUS_LABELS[s.status] ?? s.status}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="divide-y divide-stone-100">
        {(notifications ?? []).length === 0 && (myRequests ?? []).length === 0 && (mySwaps ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-stone-400">Engar tilkynningar</p>
        )}
        {(notifications ?? []).map((n) => (
          <Link key={n.id} href={getNotifHref(n)}>
            <div
              className={`flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-stone-50 ${n.read ? '' : 'bg-green-50'}`}
            >
              {!n.read && (
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-green-600" />
              )}
              <div className={n.read ? 'pl-5' : ''}>
                <p
                  className={`text-sm ${n.read ? 'text-stone-600' : 'font-medium text-stone-900'}`}
                >
                  {n.message}
                </p>
                <p className="mt-0.5 text-xs text-stone-400">{formatRelativeTime(n.created_at)}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
