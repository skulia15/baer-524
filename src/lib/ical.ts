import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { weekDates } from '@/lib/dates'

// ── Feed token ────────────────────────────────────────────────────────────────
// Calendar apps can't log in, so the feed URL carries an HMAC of the household id.
// Derived from INVITE_SECRET with its own label, so no extra secret is needed.

function secret(): string {
  const s = process.env.INVITE_SECRET
  if (!s) throw new Error('INVITE_SECRET not set')
  return s
}

export function feedToken(householdId: string): string {
  return createHmac('sha256', secret()).update(`ical:${householdId}`).digest('base64url')
}

export function isValidFeedToken(householdId: string, token: string): boolean {
  const expected = Buffer.from(feedToken(householdId))
  const given = Buffer.from(token)
  return expected.length === given.length && timingSafeEqual(expected, given)
}

// ── Calendar ──────────────────────────────────────────────────────────────────

type Week = { id: string; week_start: string; type: string; household_id: string | null }
type Claim = { week_allocation_id: string; date: string; claimed_by_household_id: string | null }

const SHARED_LABEL: Record<string, string> = {
  shared_verslunarmannahelgi: 'Versló',
  shared_spring: 'Vinnuvika',
}

const escapeText = (s: string) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const icsDate = (iso: string) => iso.replaceAll('-', '')
const nextDay = (iso: string) => weekDates(iso)[1]

/**
 * iCalendar feed of the days `householdId` has at the house: its own weeks minus days
 * given away, days received from other households (requests, partial swaps), and the
 * shared weeks everyone may use. Consecutive days become one all-day event.
 */
export function householdCalendar({
  householdId,
  households,
  weeks,
  claims,
  now = new Date(),
}: {
  householdId: string
  households: { id: string; name: string }[]
  weeks: Week[]
  claims: Claim[]
  now?: Date
}): string {
  const nameOf = (id: string | null) => households.find((h) => h.id === id)?.name ?? ''
  const claimedBy = new Map(
    claims.map((c) => [`${c.week_allocation_id}:${c.date}`, c.claimed_by_household_id]),
  )

  // date → [uid slug, summary]
  const days = new Map<string, [string, string]>()
  for (const week of weeks) {
    for (const date of weekDates(week.week_start)) {
      const claimant = claimedBy.get(`${week.id}:${date}`)
      if (week.type !== 'household') {
        days.set(date, ['shared', `Bær 524 – sameiginleg vika (${SHARED_LABEL[week.type] ?? ''})`])
      } else if (week.household_id === householdId && (!claimant || claimant === householdId)) {
        days.set(date, ['own', 'Bær 524'])
      } else if (week.household_id !== householdId && claimant === householdId) {
        days.set(date, [`from-${week.household_id}`, `Bær 524 (frá ${nameOf(week.household_id)})`])
      }
    }
  }

  // Merge consecutive days with the same summary into events
  const runs: { start: string; end: string; slug: string; summary: string }[] = []
  for (const date of [...days.keys()].sort()) {
    const [slug, summary] = days.get(date) as [string, string]
    const last = runs.at(-1)
    if (last && last.end === date && last.summary === summary) last.end = nextDay(date)
    else runs.push({ start: date, end: nextDay(date), slug, summary })
  }

  const stamp = `${now.toISOString().slice(0, 19).replace(/[-:]/g, '')}Z`
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Baer 524//Dagatal//IS',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(`Bær 524 – ${nameOf(householdId)}`)}`,
    ...runs.flatMap((r) => [
      'BEGIN:VEVENT',
      `UID:${householdId}-${icsDate(r.start)}-${r.slug}@baer524`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(r.start)}`,
      `DTEND;VALUE=DATE:${icsDate(r.end)}`,
      `SUMMARY:${escapeText(r.summary)}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    ]),
    'END:VCALENDAR',
  ]
  return `${lines.join('\r\n')}\r\n`
}
