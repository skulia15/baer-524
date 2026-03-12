import { ApproveDeclineForm } from '@/components/forms/approve-decline-form'
import { CancelForm } from '@/components/forms/cancel-form'
import { formatDay } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

const STATUS_LABELS: Record<string, string> = {
  pending_own_head: 'Bíður samþykkis eigin eiganda',
  pending_releasing_head: 'Bíður samþykkis losandi fjölskyldu',
  approved: 'Samþykkt',
  declined: 'Hafnað',
  cancelled: 'Afturkallað',
}

export default async function BidniDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profile').select('*').eq('id', user.id).single()
  const { data: request } = await supabase
    .from('request')
    .select(
      '*, requesting_household:requesting_household_id(*), allocation:target_week_allocation_id(*, household:household_id(*))',
    )
    .eq('id', requestId)
    .single()

  if (!request) redirect('/tilkynningar')

  const allocation = request.allocation as {
    week_number: number
    household_id: string
    household: { name: string } | null
  }
  const requestingHousehold = request.requesting_household as { name: string }

  const canApprove =
    profile?.role === 'head' &&
    ((request.status === 'pending_own_head' &&
      profile.household_id === request.requesting_household_id) ||
      (request.status === 'pending_releasing_head' &&
        profile.household_id === allocation.household_id))

  const canCancel =
    profile?.household_id === request.requesting_household_id &&
    (request.status === 'pending_own_head' || request.status === 'pending_releasing_head')

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/tilkynningar"
          className="rounded-lg p-1 text-stone-500 transition-colors hover:bg-stone-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <h1 className="font-semibold text-stone-900">Beiðni</h1>
      </div>

      <div className="mb-4 rounded-xl border border-stone-200 p-4">
        <p className="mb-2 text-sm font-medium text-stone-800">
          {requestingHousehold.name} óskar eftir dögum í viku {allocation.week_number}
          {allocation.household && ` (${allocation.household.name})`}:
        </p>
        <ul className="mb-3 space-y-1">
          {request.requested_days.map((d: string) => (
            <li key={d} className="text-sm text-stone-700">
              {formatDay(new Date(d))}
            </li>
          ))}
        </ul>
        {request.sender_message && (
          <p className="mb-3 rounded-lg bg-stone-50 px-3 py-2 text-sm italic text-stone-600">
            "{request.sender_message}"
          </p>
        )}
        <p className="text-xs text-stone-400">
          Staða: {STATUS_LABELS[request.status] ?? request.status}
        </p>
        {request.decline_reason && (
          <p className="mt-1 text-xs text-red-600">Ástæða: {request.decline_reason}</p>
        )}
        {request.status === 'cancelled' && !request.decline_reason && (
          <p className="mt-1 text-xs text-stone-500">
            Beiðni var sjálfkrafa afturkölluð þar sem önnur beiðni fékk samþykki á þessum dögum.
          </p>
        )}
      </div>

      {canApprove && <ApproveDeclineForm type="request" id={requestId} />}
      {canCancel && <CancelForm type="request" id={requestId} />}
    </div>
  )
}
