type WeekLike = { id: string; week_number: number; household_id: string | null }
type ReleaseLike = { week_allocation_id: string; date: string; status: string }

export type OpenWeek<W extends WeekLike> = { week: W; dates: string[] }

// Released (still unclaimed) days from `today` on in other households' weeks,
// grouped by week in week order — what the household could request.
export function openReleases<W extends WeekLike>({
  weeks,
  releases,
  householdId,
  today,
}: {
  weeks: W[]
  releases: ReleaseLike[]
  householdId: string
  today: string
}): OpenWeek<W>[] {
  const datesByWeek = new Map<string, string[]>()
  for (const r of releases) {
    if (r.status !== 'released' || r.date < today) continue
    datesByWeek.set(r.week_allocation_id, [
      ...(datesByWeek.get(r.week_allocation_id) ?? []),
      r.date,
    ])
  }
  return weeks
    .filter((w) => w.household_id !== householdId && datesByWeek.has(w.id))
    .sort((a, b) => a.week_number - b.week_number)
    .map((week) => ({ week, dates: (datesByWeek.get(week.id) ?? []).sort() }))
}
