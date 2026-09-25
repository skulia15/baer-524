import { weekHref } from '@/lib/rotation-year'
import type { Notification } from '@/types/db'

export type WeekRef = { week_number: number; year: number }

// Where tapping a notification goes. `weeks` resolves week_allocation references.
export function notificationHref(
  n: Pick<Notification, 'reference_type' | 'reference_id'>,
  weeks: Map<string, WeekRef>,
): string {
  if (!n.reference_id) return '/tilkynningar'
  if (n.reference_type === 'request') return `/tilkynningar/beidni/${n.reference_id}`
  if (n.reference_type === 'swap_proposal') return `/tilkynningar/skipti/${n.reference_id}`
  if (n.reference_type === 'week_allocation') {
    const week = weeks.get(n.reference_id)
    if (week) return weekHref(week.year, week.week_number)
  }
  return '/tilkynningar'
}
