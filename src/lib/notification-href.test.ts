import { describe, expect, it } from 'vitest'
import { notificationHref } from './notification-href'

const weeks = new Map([['wa-10', { week_number: 10, year: 2026 }]])

describe('notificationHref', () => {
  it('links requests and swaps to their detail pages', () => {
    expect(notificationHref({ reference_type: 'request', reference_id: 'r1' }, weeks)).toBe(
      '/tilkynningar/beidni/r1',
    )
    expect(notificationHref({ reference_type: 'swap_proposal', reference_id: 's1' }, weeks)).toBe(
      '/tilkynningar/skipti/s1',
    )
  })

  it('links released days to the week they were released in', () => {
    expect(
      notificationHref({ reference_type: 'week_allocation', reference_id: 'wa-10' }, weeks),
    ).toBe('/dagatal/vika/10?ar=2026')
  })

  it('falls back to the notification list', () => {
    expect(
      notificationHref({ reference_type: 'week_allocation', reference_id: 'gone' }, weeks),
    ).toBe('/tilkynningar')
    expect(notificationHref({ reference_type: null, reference_id: null }, weeks)).toBe(
      '/tilkynningar',
    )
  })
})
