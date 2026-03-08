import { ApproveDeclineForm } from '@/components/forms/approve-decline-form'
import { CancelForm } from '@/components/forms/cancel-form'
import { formatDay } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeftRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const STATUS_LABELS: Record<string, string> = {
  pending_own_head: 'Bíður samþykkis eigin eiganda',
  pending_other_head: 'Bíður samþykkis annarrar fjölskyldu',
  approved: 'Samþykkt',
  declined: 'Hafnað',
  cancelled: 'Afturkallað',
}

export default async function SkiptiDetailPage({
  params,
}: {
  params: Promise<{ swapId: string }>
}) {
  const { swapId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profile').select('*').eq('id', user.id).single()
  const { data: swap } = await supabase
    .from('swap_proposal')
    .select(
      '*, household_a:household_a_id(*), household_b:household_b_id(*), allocation_a:allocation_a_id(*), allocation_b:allocation_b_id(*)',
    )
    .eq('id', swapId)
    .single()

  if (!swap) redirect('/tilkynningar')

  const hhAId = (swap.household_a as { id: string }).id
  const hhBId = (swap.household_b as { id: string }).id
  const canApprove =
    profile?.role === 'head' &&
    ((swap.status === 'pending_own_head' && profile.household_id === hhAId) ||
      (swap.status === 'pending_other_head' && profile.household_id === hhBId))

  const canCancel =
    profile?.household_id === hhAId &&
    (swap.status === 'pending_own_head' || swap.status === 'pending_other_head')

  const hhA = swap.household_a as { name: string }
  const hhB = swap.household_b as { name: string }
  const allocA = swap.allocation_a as { week_number: number }
  const allocB = swap.allocation_b as { week_number: number }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/tilkynningar"
          className="rounded-lg p-1 text-stone-500 transition-colors hover:bg-stone-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-semibold text-stone-900">Skiptatillaga</h1>
      </div>

      <div className="mb-4 rounded-xl border border-stone-200 p-4">
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-stone-800">
          {hhA.name}
          <ArrowLeftRight className="h-3.5 w-3.5 text-stone-400" />
          {hhB.name}
        </p>
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
            {hhA.name} gefur (V.{allocA.week_number}):
          </p>
          {swap.days_a.map((d: string) => (
            <p key={d} className="text-sm text-stone-700">
              {formatDay(new Date(d))}
            </p>
          ))}
        </div>
        <div className="mb-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-400">
            {hhB.name} gefur (V.{allocB.week_number}):
          </p>
          {swap.days_b.map((d: string) => (
            <p key={d} className="text-sm text-stone-700">
              {formatDay(new Date(d))}
            </p>
          ))}
        </div>
        <p className="text-xs text-stone-400">Staða: {STATUS_LABELS[swap.status] ?? swap.status}</p>
        {swap.decline_reason && (
          <p className="mt-1 text-xs text-red-600">Ástæða: {swap.decline_reason}</p>
        )}
      </div>

      {canApprove && <ApproveDeclineForm type="swap" id={swapId} />}
      {canCancel && <CancelForm type="swap" id={swapId} />}
    </div>
  )
}
