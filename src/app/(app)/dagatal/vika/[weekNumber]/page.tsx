import { WeekDetailView } from '@/components/week/week-detail-view'
import { WeekSwipeWrapper } from '@/components/week/week-swipe-wrapper'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'

export default async function WeekPage({
  params,
}: {
  params: Promise<{ weekNumber: string }>
}) {
  const { weekNumber: wn } = await params
  const weekNumber = Number.parseInt(wn)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profile').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const currentYear = new Date().getFullYear()
  const { data: yearRecord } = await supabase
    .from('year')
    .select('id')
    .eq('year', currentYear)
    .single()

  const { data: allocation } = await supabase
    .from('week_allocation')
    .select('*')
    .eq('year_id', yearRecord?.id ?? '')
    .eq('week_number', weekNumber)
    .single()

  if (!allocation) notFound()

  const { data: household } = allocation.household_id
    ? await supabase.from('household').select('*').eq('id', allocation.household_id).single()
    : { data: null }

  const { data: releases } = await supabase
    .from('day_release')
    .select('*')
    .eq('week_allocation_id', allocation.id)

  const { data: plans } = await supabase
    .from('day_plan')
    .select('*')
    .eq('week_allocation_id', allocation.id)

  const { data: allWeeks } = await supabase
    .from('week_allocation')
    .select('week_number')
    .eq('year_id', yearRecord?.id ?? '')
    .order('week_number')

  const weekNums = (allWeeks ?? []).map((w) => w.week_number)
  const currentIdx = weekNums.indexOf(weekNumber)
  const prevWeek = currentIdx > 0 ? weekNums[currentIdx - 1] : null
  const nextWeek = currentIdx < weekNums.length - 1 ? weekNums[currentIdx + 1] : null

  return (
    <WeekSwipeWrapper prevWeek={prevWeek} nextWeek={nextWeek}>
      <WeekDetailView
        allocation={allocation}
        household={household ?? null}
        releases={releases ?? []}
        plans={plans ?? []}
        profile={profile}
        prevWeek={prevWeek}
        nextWeek={nextWeek}
      />
    </WeekSwipeWrapper>
  )
}
