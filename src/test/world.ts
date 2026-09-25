import { FakeDb } from './fake-supabase'

// A small house: households A, B, C, each with a head; A also has a member.
// Weeks (Thu–Wed, 2026): 10 → A, 11 → B, 12 → C
export const HH = { A: 'hh-a', B: 'hh-b', C: 'hh-c' } as const
export const USER = {
  headA: 'u-head-a',
  memberA: 'u-member-a',
  headB: 'u-head-b',
  headC: 'u-head-c',
} as const
export const WEEK = { a10: 'wa-10', b11: 'wa-11', c12: 'wa-12' } as const
export const YEAR_ID = 'yr-2026'

// Thu 5 Mar 2026 → Wed 11 Mar 2026
export const WEEK10_DAYS = [
  '2026-03-05',
  '2026-03-06',
  '2026-03-07',
  '2026-03-08',
  '2026-03-09',
  '2026-03-10',
  '2026-03-11',
]
export const WEEK11_DAYS = [
  '2026-03-12',
  '2026-03-13',
  '2026-03-14',
  '2026-03-15',
  '2026-03-16',
  '2026-03-17',
  '2026-03-18',
]

export function world(asUser: string | null = USER.headA) {
  const db = new FakeDb({
    house: [{ id: 'house-1', name: 'Bær' }],
    household: [
      { id: HH.A, house_id: 'house-1', name: 'A', color: '#000001' },
      { id: HH.B, house_id: 'house-1', name: 'B', color: '#000002' },
      { id: HH.C, house_id: 'house-1', name: 'C', color: '#000003' },
    ],
    profile: [
      { id: USER.headA, email: 'a@x.is', name: 'Head A', household_id: HH.A, role: 'head' },
      { id: USER.memberA, email: 'm@x.is', name: 'Member A', household_id: HH.A, role: 'member' },
      { id: USER.headB, email: 'b@x.is', name: 'Head B', household_id: HH.B, role: 'head' },
      { id: USER.headC, email: 'c@x.is', name: 'Head C', household_id: HH.C, role: 'head' },
    ],
    year: [
      {
        id: YEAR_ID,
        house_id: 'house-1',
        year: 2026,
        rotation_order: [HH.A, HH.B, HH.C],
        spring_shared_week_number: null,
      },
    ],
    week_allocation: [
      {
        id: WEEK.a10,
        year_id: YEAR_ID,
        week_number: 10,
        week_start: '2026-03-05',
        week_end: '2026-03-11',
        type: 'household',
        household_id: HH.A,
      },
      {
        id: WEEK.b11,
        year_id: YEAR_ID,
        week_number: 11,
        week_start: '2026-03-12',
        week_end: '2026-03-18',
        type: 'household',
        household_id: HH.B,
      },
      {
        id: WEEK.c12,
        year_id: YEAR_ID,
        week_number: 12,
        week_start: '2026-03-19',
        week_end: '2026-03-25',
        type: 'household',
        household_id: HH.C,
      },
    ],
    day_release: [],
    day_plan: [],
    request: [],
    swap_proposal: [],
    notification: [],
  })
  db.userId = asUser
  return db
}
