import { householdCalendar, isValidFeedToken } from '@/lib/ical'
import { rotationYear } from '@/lib/rotation-year'
import { createServiceClient } from '@/lib/supabase/service'

// Subscribable calendar for one household. Calendar apps can't log in, so access is
// by the signed token in the URL (see feedToken); data is read with the service role.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ householdId: string }> },
) {
  const { householdId } = await params
  const token = new URL(request.url).searchParams.get('token') ?? ''
  if (!isValidFeedToken(householdId, token)) return new Response('Not found', { status: 404 })

  const service = createServiceClient()
  const { data: household } = await service
    .from('household')
    .select('id, house_id')
    .eq('id', householdId)
    .single()
  if (!household) return new Response('Not found', { status: 404 })

  const thisYear = rotationYear(new Date().toISOString().slice(0, 10))
  const [{ data: households }, { data: years }] = await Promise.all([
    service.from('household').select('id, name').eq('house_id', household.house_id),
    service
      .from('year')
      .select('id')
      .eq('house_id', household.house_id)
      .in('year', [thisYear, thisYear + 1]),
  ])

  const yearIds = (years ?? []).map((y) => y.id)
  const { data: weeks } = yearIds.length
    ? await service
        .from('week_allocation')
        .select('id, week_start, type, household_id')
        .in('year_id', yearIds)
    : { data: [] }
  const weekIds = (weeks ?? []).map((w) => w.id)
  const { data: claims } = weekIds.length
    ? await service
        .from('day_release')
        .select('week_allocation_id, date, claimed_by_household_id')
        .in('week_allocation_id', weekIds)
        .eq('status', 'claimed')
    : { data: [] }

  const ics = householdCalendar({
    householdId,
    households: households ?? [],
    weeks: weeks ?? [],
    claims: claims ?? [],
  })

  return new Response(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'content-disposition': 'inline; filename="baer524.ics"',
      'cache-control': 'private, max-age=900',
    },
  })
}
