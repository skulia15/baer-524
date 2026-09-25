import { describe, expect, it } from 'vitest'
import { rotationYear, yearFromParam } from './rotation-year'

describe('rotationYear', () => {
  it('days before the first Thursday of January belong to the previous year', () => {
    // 2027's first Thursday is 7 Jan; 1–6 Jan are the tail of 2026's last week
    expect(rotationYear('2027-01-01')).toBe(2026)
    expect(rotationYear('2027-01-06')).toBe(2026)
    expect(rotationYear('2027-01-07')).toBe(2027)
  })
})

describe('yearFromParam', () => {
  it('uses a valid ?ar= value, otherwise the rotation year of today', () => {
    expect(yearFromParam('2027', '2026-09-25')).toBe(2027)
    expect(yearFromParam(undefined, '2027-01-02')).toBe(2026)
    expect(yearFromParam('abc', '2026-09-25')).toBe(2026)
  })
})
