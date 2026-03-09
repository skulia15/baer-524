# Bær 524 — MVP Product Spec

**Útgáfa:** 1.0 (MVP)
**Dagsetning:** Mars 2026
**Stack:** Next.js + React (TypeScript)
**Tungumál:** Íslenska eingöngu

---

## 1. Yfirlit

Vefapp fyrir 4–6 fjölskyldur sem deila einu sumarhúsi, Bæ 524. Öll 52 vikur ársins eru skipt á milli fjölskyldna í endurteknu snúningskerfi, nema tvær sameiginlegar vikur. Appið leysir af hólmi Google Calendar sem fjölskyldurnar nota nú — með betri yfirsýn á síma, skipulegri skiptum og samþykkisflæði.

**MVP scope:** Calendar + release/request + swaps + in-app notifications.

---

## 2. All Decisions

### Product

| Decision | Choice |
|----------|--------|
| App name | Bær 524 |
| Language | Icelandic only |
| Properties | Single house |
| Device priority | **Phone-first** |
| Light/dark mode | Light mode only |
| Week boundaries | **Thursday to Wednesday** (Thu noon changeover is convention) |
| Day granularity | Full days only |
| Allocation model | **Rotating sequence, 1 week each, drag to reorder** |
| Shared weeks | 2 per year (verslunarmannahelgi + spring) — skipped in rotation |
| Allocation process | Decided offline, one head enters rotation order |
| Households | **Permanent, seeded by developer** — never added or removed |
| Household heads | **Set by developer at deployment** |
| Admin model | All household heads equal |
| Auth | Email + password |
| Members | Heads invite via email link; members get view + initiate (head approves) |
| Visibility | Full transparency — everyone sees everything |
| Past weeks | Greyed out, read-only |
| Approved actions | Final — cannot be undone |
| Time scope | Current year only |
| Open requests | Unlimited per household |
| Releases | Full week or specific days |
| Swaps | Full week or partial days |
| Decline reason | Optional text field |

### UI & Interaction

| Decision | Choice |
|----------|--------|
| Visual style | Functional/utilitarian — dense info, no frills |
| Calendar density | Compact — single colored bar per week |
| Week row display | Color bar with household name text on the bar |
| Date display | Date range with month names (e.g., "fim 4. júní – mið 10. júní") |
| Household colors | Distinguishable, auto-assigned (no specific palette preference) |
| Own weeks indicator | Subtle left border or highlight |
| Released days indicator | Faded color + "Losað" text tag on bar |
| Shared weeks | Neutral grey, distinct from household colors |
| Month navigation | Dates with month names shown on each week row |
| Calendar default scroll | Current month |
| Week detail navigation | Tap bar → separate screen; swipe left/right between weeks + back button |
| Day picker (release/request) | Checkboxes next to each day |
| Color legend | At top of calendar, always visible |
| Home screen | Calendar with notification/action bar at top |
| Navigation | 3-tab bottom bar: Dagatal, Tilkynningar, Stillingar |
| Review flow | Tap notification → separate detail screen → approve/decline |
| Confirmation dialogs | None — approval flow is the safety net |
| Action feedback | Banner at top, auto-dismisses |
| Notification badge | Dot + count number on Tilkynningar tab |

---

## 3. User Model

### Roles

| Role | Permissions |
|------|------------|
| **Household Head** (Yfirmaður) | Set rotation order, designate spring shared week, approve/decline requests and swaps, invite members, release days immediately |
| **Household Member** (Meðlimur) | View calendar, initiate release/request/swap (head must approve) |

### Setup

Households and heads are **permanent** — configured once by the developer at deployment:

- All households created in seed script with names and colors.
- Head accounts pre-created with email.
- **No household creation, deletion, or head assignment UI.**
- Only in-app user management: heads invite members via email link.

### Auth

- Email + password.
- Heads: pre-created accounts, set password on first login.
- Members: sign up via invite link → auto-assigned to household.

---

## 4. Core Concepts

### Rotation Model

A year's allocation = rotation order + shared weeks. The app auto-fills all ~52 Thu–Wed weeks.

**Rotation order:** Ordered list of households (e.g., B, C, D, A), set via drag-and-drop. Repeats: B, C, D, A, B, C, D, A, ...

**Shared weeks** are skipped in the rotation. The next household picks up after.

```
Week 1  (fim 2. jan – mið 8. jan):    B
Week 2  (fim 9. jan – mið 15. jan):   C
Week 3  (fim 16. jan – mið 22. jan):  D
Week 4  (fim 23. jan – mið 29. jan):  A
Week 5  (fim 30. jan – mið 5. feb):   B
...
Week 18 (fim 30. apr – mið 6. maí):   SAMEIGINLEG (vor)  ← D was next
Week 19 (fim 7. maí – mið 13. maí):   D  ← picks up
...
Week 31 (fim 30. júl – mið 5. ágú):   SAMEIGINLEG (versl.)  ← C was next
Week 32 (fim 6. ágú – mið 12. ágú):   C  ← picks up
...
```

### Shared Weeks (Sameiginlegar vikur)

Unassigned. Anyone can go, not reserved. Coordination outside the app.

1. **Verslunarmannahelgi:** Auto-detected (Thu–Wed block containing first Monday of August).
2. **Spring:** Manually designated by head. Varies yearly.

### Release (Losa)

Mark days available. Full week or specific days. Retractable if unclaimed.

### Request (Beiðni)

Claim released days. Member → own head → releasing head (2 max). Head → releasing head (1). Conflicts: releasing head sees all, chooses one, others auto-declined.

### Swap (Skipti)

Trade days between households. Full weeks or partial. Member → own head → other head (2 max). Head → other head (1).

**Max approvals: 2. Approved = final.**

---

## 5. Data Model

```
House
  id, name ("Bær 524"), created_at

Household
  id, house_id, name, color
  -- Seeded. Permanent.

User
  id, email, password_hash, name
  household_id, role: head | member
  -- Heads seeded. Members via invite.

Year
  id, house_id, year (int)
  rotation_order: [household_id, ...]
  spring_shared_week_number (int, nullable)

WeekAllocation
  id, year_id
  week_number (int, 1–53)
  week_start (date, Thursday)
  week_end (date, Wednesday)
  type: household | shared_verslunarmannahelgi | shared_spring
  household_id (nullable)

DayRelease
  id, week_allocation_id
  date
  status: released | claimed
  claimed_by_household_id (nullable)

Request
  id, year_id
  requesting_household_id
  target_week_allocation_id
  requested_days: [dates]
  status: pending_own_head | pending_releasing_head | approved | declined | cancelled
  decline_reason (text, nullable)
  created_by (user_id)
  created_at, resolved_at

SwapProposal
  id, year_id
  household_a_id, allocation_a_id, days_a: [dates]
  household_b_id, allocation_b_id, days_b: [dates]
  status: pending_own_head | pending_other_head | approved | declined | cancelled
  decline_reason (text, nullable)
  created_by (user_id)
  created_at, resolved_at

AllocationChange
  id, year_id, changed_by (user_id)
  change_type: rotation_order | spring_week
  old_value, new_value (JSON)
  created_at

Notification
  id, user_id
  type: release | request_received | request_resolved | swap_received | swap_resolved |
        allocation_changed | member_action_pending | auto_cancelled
  reference_id, reference_type
  message (text, Icelandic)
  read (boolean)
  created_at
```

### Key model notes:
- **Year.rotation_order** is the source of truth. WeekAllocations are derived.
- **SwapProposal** includes day arrays for partial swaps.
- Rotation changes → regenerate WeekAllocations → auto-cancel affected pending items with notification.

---

## 6. Allocation Generation Logic

```typescript
function generateAllocations(year: Year): WeekAllocation[] {
  const weeks = generateThursdayWeeks(year.year)
  const verslunarWeekNum = findVerslunarmannahelgiWeek(weeks)
  const springWeekNum = year.spring_shared_week_number
  const rotation = year.rotation_order

  let rotationIndex = 0

  return weeks.map(week => {
    if (week.week_number === verslunarWeekNum) {
      return { ...week, type: 'shared_verslunarmannahelgi', household_id: null }
    }
    if (week.week_number === springWeekNum) {
      return { ...week, type: 'shared_spring', household_id: null }
    }

    const household_id = rotation[rotationIndex % rotation.length]
    rotationIndex++
    return { ...week, type: 'household', household_id }
  })
}
```

---

## 7. UI Design Spec

### Design Principles

- **Functional/utilitarian.** Dense information, no decorative elements.
- **Phone-first.** Designed for one-handed mobile use, works on desktop.
- **Light mode only.** White/light grey background, dark text.
- **Color = information.** Household colors are the primary visual system.

### Color System

- **Household colors:** 4–6 highly distinguishable colors, auto-assigned at seeding. Should be accessible (pass contrast checks for white text on color, or dark text depending on brightness).
- **Own weeks:** Household color bar + subtle left border accent (e.g., 3px darker/contrasting left edge) to distinguish from other households at a glance.
- **Released days:** Faded version of household color + "Losað" text tag on the week bar.
- **Shared weeks:** Neutral grey bar with "Sameiginleg" label.
- **Past weeks:** Greyed out (reduced opacity), read-only.
- **Current week:** Subtle highlight or outline to mark "this week."

### Navigation

**Bottom tab bar (3 tabs):**

| Tab | Label | Icon | Badge |
|-----|-------|------|-------|
| 1 | Dagatal | Calendar icon | — |
| 2 | Tilkynningar | Bell icon | Dot + count (e.g., 🔴 3) |
| 3 | Stillingar | Gear icon | — |

### Calendar Screen (Dagatal) — Home

```
┌──────────────────────────────────┐
│ Bær 524                   🔔 (3) │
├──────────────────────────────────┤
│ ⚠️ 2 beiðnir bíða samþykkis     │ ← Action bar (heads, if pending)
├──────────────────────────────────┤
│ 🟢 Jónsson  🔵 Sigurðsson       │ ← Legend (always visible,
│ 🟠 Haraldsson  🟣 Björnsson     │    scrolls with calendar)
├──────────────────────────────────┤
│           ◀ 2026 ▶               │
├──────────────────────────────────┤
│ ┃█████████████████████████████│ │
│ ┃ V.23 fim 4. jún – mið 10. jún │ ← Own week: left border accent
│ ┃ Jónsson                        │
│                                  │
│ █████████████████████████████████│
│  V.24 fim 11. jún – mið 17. jún │ ← Other household: no accent
│  Sigurðsson                      │
│                                  │
│ ░░░░░░░░░░░░░░░░░░░░░░░░ Losað │
│  V.25 fim 18. jún – mið 24. jún │ ← Fully released: faded + tag
│  Haraldsson                      │
│                                  │
│ ████████░░░░░░░░░░░░░░░░░ Losað │
│  V.26 fim 25. jún – mið 1. júl  │ ← Partially released
│  Björnsson                       │
│                                  │
│ ▓▓▓▓▓▓▓ SAMEIGINLEG (versl.) ▓▓▓│ ← Shared week: grey
│  V.31 fim 30. júl – mið 5. ágú  │
│                                  │
├──────────────────────────────────┤
│  Dagatal  │  🔔 3  │  ⚙️        │ ← Bottom tabs
└──────────────────────────────────┘
```

**Behavior:**
- Scrolls to current month on load.
- Vertical scroll through all 52 weeks.
- Year selector (◀ 2026 ▶) at top.
- Past weeks greyed out, still tappable (read-only detail).
- Action bar only shown for heads with pending items.
- Tap any week → navigate to week detail screen.

### Week Detail Screen

```
┌──────────────────────────────────┐
│ ← Vika 25                  ← → │ ← Swipe or arrows for prev/next
│   Haraldsson                     │
│   fim 18. júní – mið 24. júní   │
├──────────────────────────────────┤
│ ☐ Fim 18. jún   █ Úthlutað     │
│ ☐ Fös 19. jún   ░ Losað        │
│ ☐ Lau 20. jún   ░ Losað        │
│ ☐ Sun 21. jún   █ Úthlutað     │
│ ☐ Mán 22. jún   █ Úthlutað     │
│ ☐ Þri 23. jún   █ Úthlutað     │
│ ☐ Mið 24. jún   █ Úthlutað     │
├──────────────────────────────────┤
│ [ Óska eftir völdum dögum ]     │ ← If released days exist (other hh)
│ [ Losa daga ]                   │ ← If your household's week
│ [ Leggja til skipti ]           │ ← If your household's week
└──────────────────────────────────┘
```

**Behavior:**
- Swipe left/right to navigate between weeks.
- Back button returns to calendar (scrolled to same position).
- Checkboxes for day selection when initiating release/request.
- Action buttons shown contextually:
  - Your week: "Losa daga" + "Leggja til skipti"
  - Others' week with released days: "Óska eftir"
  - Shared week: no actions
  - Past week: no actions (read-only)
- For shared weeks: neutral display with "Sameiginleg vika" label, no day-level actions.

### Release Flow

```
┌──────────────────────────────────┐
│ ← Losa daga — Vika 25           │
│                                  │
│ Veldu daga til að losa:          │
│                                  │
│ ☑ Fim 18. jún                   │
│ ☑ Fös 19. jún                   │
│ ☐ Lau 20. jún                   │
│ ☐ Sun 21. jún                   │
│ ☐ Mán 22. jún                   │
│ ☐ Þri 23. jún                   │
│ ☐ Mið 24. jún                   │
│                                  │
│ [ Velja alla ]                   │
│                                  │
│ [ Losa valda daga ]             │ ← Primary action button
└──────────────────────────────────┘
```

- "Velja alla" toggles all checkboxes.
- No confirmation dialog — action fires immediately (heads) or sends to head for approval (members).
- Success: auto-dismiss banner "Dagar losaðir" at top.

### Request Flow

Same layout as release, but only released days are shown as selectable checkboxes. Non-released days shown greyed out / disabled.

### Swap Proposal Flow

```
┌──────────────────────────────────┐
│ ← Leggja til skipti             │
│                                  │
│ Þín vika:  V.25 Haraldsson      │
│ Veldu daga til að bjóða:         │
│ ☑ Fim 18. jún                   │
│ ☑ Fös 19. jún                   │
│ ☐ Lau 20. jún                   │
│ ...                              │
│                                  │
│ Skipti við:                      │
│ [ Veldu viku ▼ ]                │ ← Dropdown of other hh weeks
│                                  │
│ (After selecting target week:)   │
│ Veldu daga sem þú vilt:         │
│ ☐ Fim 2. júl                    │
│ ☐ Fös 3. júl                    │
│ ...                              │
│                                  │
│ [ Senda tillögu ]               │
└──────────────────────────────────┘
```

### Notification List (Tilkynningar)

```
┌──────────────────────────────────┐
│ Tilkynningar                     │
├──────────────────────────────────┤
│ ● Fjölskylda Sigurðsson óskar   │ ← Unread: bold, dot
│   eftir fim–fös í viku 25       │
│   Fyrir 2 klst.                  │
│                                  │
│   Fjölskylda Björnsson losaði   │ ← Read: normal weight
│   viku 30 (alla daga)            │
│   Í gær                         │
│                                  │
│   Snúningsröð 2026 uppfærð     │
│   Fyrir 3 dögum                  │
├──────────────────────────────────┤
│  Dagatal  │  🔔 1  │  ⚙️        │
└──────────────────────────────────┘
```

Tap a notification → navigate to action detail screen.

### Action Detail Screen (Heads)

```
┌──────────────────────────────────┐
│ ← Beiðni                        │
├──────────────────────────────────┤
│ Fjölskylda Sigurðsson óskar     │
│ eftir dögum í viku 25:          │
│                                  │
│   Fös 19. júní                   │
│   Lau 20. júní                   │
│                                  │
│ Vika 25 er hjá: Haraldsson      │
│ Þessir dagar eru losaðir.       │
│                                  │
│ ┌────────────┐ ┌────────────┐   │
│ │ Samþykkja  │ │   Hafna    │   │
│ └────────────┘ └────────────┘   │
│                                  │
│ (If Hafna tapped:)               │
│ ┌────────────────────────────┐  │
│ │ Ástæða (valfrjálst)...     │  │
│ └────────────────────────────┘  │
│ [ Staðfesta höfnun ]           │
└──────────────────────────────────┘
```

### Year Setup (Stillingar → Year)

```
┌──────────────────────────────────┐
│ ← Setja upp 2026                │
├──────────────────────────────────┤
│ Snúningsröð:                     │
│                                  │
│ ☰ 1. 🟢 Jónsson                │ ← Drag handles to reorder
│ ☰ 2. 🔵 Sigurðsson             │
│ ☰ 3. 🟠 Haraldsson             │
│ ☰ 4. 🟣 Björnsson              │
│                                  │
│ Sameiginleg vika (vor):          │
│ [ Veldu viku ▼ ]                │
│                                  │
│ Sameiginleg vika (versl.):       │
│ V.31 fim 30. júl – mið 5. ágú  │
│ (sjálfvirkt)                     │
│                                  │
│ ──── Forskoðun ────              │
│ V.1  fim 2. jan   🟢 Jónsson   │
│ V.2  fim 9. jan   🔵 Sigurðsson│
│ V.3  fim 16. jan  🟠 Haraldsson│
│ V.4  fim 23. jan  🟣 Björnsson │
│ V.5  fim 30. jan  🟢 Jónsson   │
│ ...                              │
│                                  │
│ [ Vista ]                       │
└──────────────────────────────────┘
```

Live preview updates as you drag.

### Feedback & Banners

All action completions show a top banner that auto-dismisses after ~3 seconds:

- "Dagar losaðir" (days released)
- "Beiðni send" (request sent)
- "Tillaga send" (swap proposal sent)
- "Beiðni samþykkt" (request approved)
- "Beiðni hafnað" (request declined)
- "Skipti samþykkt" (swap approved)
- "Snúningsröð vistuð" (rotation saved)

---

## 8. Screens Inventory

| Screen | Access | Tab |
|--------|--------|-----|
| **Login** | Public | — |
| **Set Password** | First login (heads) | — |
| **Sign Up via Invite** | Invite link | — |
| **Calendar** | All | Dagatal |
| **Week Detail** | All (swipeable) | Dagatal |
| **Release Days** | Own week | Dagatal |
| **Request Days** | Released days | Dagatal |
| **Propose Swap** | Own week | Dagatal |
| **Notifications** | All | Tilkynningar |
| **Action Detail** | Heads | Tilkynningar |
| **Year Setup** | Heads | Stillingar |
| **Invite Members** | Heads | Stillingar |
| **Account** | All | Stillingar |

**13 screens total.**

---

## 9. Notification System

### Triggers

| Event | Who gets notified |
|-------|-------------------|
| Days released | All other households |
| Request received | Releasing household head |
| Request approved | Requesting user |
| Request declined (+ optional reason) | Requesting user |
| Swap proposed | Target household head |
| Swap approved | Proposing user |
| Swap declined (+ optional reason) | Proposing user |
| Rotation order changed | All users |
| Member action pending approval | Household head |
| Pending items auto-cancelled | Affected users |

### Display

- **Tab badge:** Dot + unread count.
- **List:** Newest first, unread bolded with dot indicator.
- **Action bar on calendar:** Only for heads with pending approvals. Shows count + tappable link to notifications.
- **In-app only for MVP.** Email notifications deferred to v2.

---

## 10. Approval Matrix

| Action | By Member | By Head |
|--------|-----------|---------|
| Release days | Own head → released | Immediate |
| Request released days | Own head → releasing head | Releasing head |
| Propose swap | Own head → other head | Other head |
| Set/change rotation | Not allowed | Immediate (logged) |
| Set spring shared week | Not allowed | Immediate (logged) |
| Invite member | Not allowed | Immediate |

**Max approvals: 2. Approved = final. No confirmation dialogs.**

---

## 11. Technical Notes

### Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes or Server Actions
- **Database:** PostgreSQL (Supabase or self-hosted)
- **Auth:** NextAuth.js or Supabase Auth
- **Hosting:** Vercel

### Seed Script

Runs once at deployment. Creates:
- House ("Bær 524")
- All households (names + colors)
- Head user accounts (email + initial password or first-login flow)

No UI for these operations.

### Key Technical Decisions

- **Phone-first.** Bottom tab nav, large tap targets, vertical scroll.
- **Light mode only.**
- **Week = Thu–Wed.** Custom week system.
- **Rotation order = source of truth.** WeekAllocations derived.
- **UTC dates.** No time component.
- **Household colors:** Seeded, high-contrast, distinguishable. Auto-assigned.
- **Optimistic UI.** Immediate updates, rollback on error.
- **Polling.** 30s on calendar. WebSockets deferred.
- **Current year scope.**

### Database Indexes

- `WeekAllocation(year_id, week_number)`
- `WeekAllocation(year_id, household_id)`
- `WeekAllocation(year_id, type)`
- `DayRelease(week_allocation_id, status)`
- `Request(status, target_week_allocation_id)`
- `SwapProposal(status, household_b_id)`
- `Notification(user_id, read, created_at)`

---

## 12. Out of Scope (v2 Candidates)

1. **Message board** — Posts with email notifications
2. **Email notifications** — All types
3. **House info page** — Rules, WiFi, contacts, arrival/departure
4. **Handover checklist** — Departure confirmation
5. **Maintenance/issue log**
6. **Cost sharing**
7. **Guest access**
8. **Google Calendar sync** — iCal feed
9. **Shared week coordination** — In-app signup
10. **Head role transfer**
11. **Household add/remove UI**
12. **Multi-year view**
13. **Dark mode**
14. **Push notifications**

---

## 13. MVP Milestone Plan

| Milestone | Scope | Est. Effort |
|-----------|-------|-------------|
| **M1: Foundation** | Seed script, auth (login + first-login + invite signup), account screen | 2–3 evenings |
| **M2: Year & Calendar** | Rotation drag-and-drop, week generation, shared week detection, calendar view (compact bars, legend, month display, own-week indicator), year setup with live preview | 4–5 evenings |
| **M3: Release & Request** | Release screen (checkboxes + select all), request screen, approval flow, action detail screen, conflict handling, day-level status on week detail | 3–4 evenings |
| **M4: Swap** | Swap proposal screen (partial day support), target week picker, dual-approval flow | 2–3 evenings |
| **M5: Notifications & Polish** | Notification list, badge system, action bar on calendar, success banners, past-week greying, swipe between weeks, Icelandic copy, responsive polish | 3–4 evenings |

**Total estimate:** ~14–19 focused evening sessions.

*Note: M5 slightly increased to account for swipe navigation and banner system.*

---

## 14. Open Questions

- [ ] Year boundary: if the last Thu–Wed block of 2026 extends into January 2027, which year does it belong to?
- [ ] Action bar: show pending items inline or just a count linking to Tilkynningar?
- [ ] Activity log (Aðgerðaskrá): separate view, part of calendar, or folded into notifications?
- [ ] Week numbering: sequential (1–52) or family convention?
- [ ] "Þessi vika" quick-jump button on calendar after scrolling away?
