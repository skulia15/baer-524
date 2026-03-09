export interface House {
  id: string
  name: string
  created_at: string
}

export interface Household {
  id: string
  house_id: string
  name: string
  color: string
}

export interface Profile {
  id: string
  email: string
  name: string
  phone: string | null
  household_id: string
  role: 'head' | 'member'
}

export interface Year {
  id: string
  house_id: string
  year: number
  rotation_order: string[]
  spring_shared_week_number: number | null
}

export type WeekAllocationType = 'household' | 'shared_verslunarmannahelgi' | 'shared_spring'

export interface WeekAllocation {
  id: string
  year_id: string
  week_number: number
  week_start: string // ISO date string (Thursday)
  week_end: string // ISO date string (Wednesday)
  type: WeekAllocationType
  household_id: string | null
}

export interface DayRelease {
  id: string
  week_allocation_id: string
  date: string
  status: 'released' | 'claimed'
  claimed_by_household_id: string | null
}

export type RequestStatus =
  | 'pending_own_head'
  | 'pending_releasing_head'
  | 'approved'
  | 'declined'
  | 'cancelled'

export interface Request {
  id: string
  year_id: string
  requesting_household_id: string
  target_week_allocation_id: string
  requested_days: string[]
  status: RequestStatus
  decline_reason: string | null
  created_by: string
  created_at: string
  resolved_at: string | null
}

export type SwapStatus =
  | 'pending_own_head'
  | 'pending_other_head'
  | 'approved'
  | 'declined'
  | 'cancelled'

export interface SwapProposal {
  id: string
  year_id: string
  household_a_id: string
  allocation_a_id: string
  days_a: string[]
  household_b_id: string
  allocation_b_id: string
  days_b: string[]
  status: SwapStatus
  decline_reason: string | null
  created_by: string
  created_at: string
  resolved_at: string | null
}

export interface AllocationChange {
  id: string
  year_id: string
  changed_by: string
  change_type: 'rotation_order' | 'spring_week'
  old_value: unknown
  new_value: unknown
  created_at: string
}

export type NotificationType =
  | 'release'
  | 'request_received'
  | 'request_resolved'
  | 'swap_received'
  | 'swap_resolved'
  | 'allocation_changed'
  | 'member_action_pending'
  | 'auto_cancelled'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  reference_id: string | null
  reference_type: string | null
  message: string
  read: boolean
  created_at: string
}

export interface DayPlan {
  id: string
  week_allocation_id: string
  date: string
  household_id: string
  created_at: string
}

export interface ShoppingItem {
  id: string
  house_id: string
  name: string
  reported_by_household_id: string | null
  created_by: string
  created_at: string
  bought_at: string | null
  bought_by_household_id: string | null
}

// Joined types
export interface WeekAllocationWithHousehold extends WeekAllocation {
  household: Household | null
}

export interface RequestWithDetails extends Request {
  requesting_household: Household
  target_week_allocation: WeekAllocationWithHousehold
}

export interface SwapProposalWithDetails extends SwapProposal {
  household_a: Household
  household_b: Household
  allocation_a: WeekAllocationWithHousehold
  allocation_b: WeekAllocationWithHousehold
}
