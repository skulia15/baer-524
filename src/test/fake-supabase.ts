// In-memory stand-in for the subset of the supabase-js query builder used by
// server actions. Lets tests assert on resulting table state instead of on
// which chain methods were called. No RLS — permission checks in actions only.

type Row = Record<string, unknown>
type Tables = Record<string, Row[]>

// FK column → referenced table, used to resolve embedded selects like
// `allocation:target_week_allocation_id(household_id, week_number)`
const FK_TABLE: Record<string, string> = {
  year_id: 'year',
  house_id: 'house',
  household_id: 'household',
  household_a_id: 'household',
  household_b_id: 'household',
  requesting_household_id: 'household',
  claimed_by_household_id: 'household',
  week_allocation_id: 'week_allocation',
  target_week_allocation_id: 'week_allocation',
  allocation_a_id: 'week_allocation',
  allocation_b_id: 'week_allocation',
}

let idCounter = 0
const newId = () => `gen-${++idCounter}`

// Split on commas that are not inside parentheses
function splitTopLevel(s: string): string[] {
  const parts: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

function project(tables: Tables, row: Row, select: string): Row {
  const out: Row = {}
  for (const part of splitTopLevel(select)) {
    const embed = part.match(/^(\w+):(\w+)\((.*)\)$/)
    if (embed) {
      const [, alias, fkCol, inner] = embed
      const target = (tables[FK_TABLE[fkCol]] ?? []).find((r) => r.id === row[fkCol])
      out[alias] = target ? project(tables, target, inner) : null
    } else if (part === '*') {
      Object.assign(out, row)
    } else {
      out[part] = row[part]
    }
  }
  return out
}

const sameValue = (a: unknown, b: unknown) => String(a) === String(b)

type Filter = (r: Row) => boolean
type Op = 'select' | 'insert' | 'update' | 'delete' | 'upsert'

class Query implements PromiseLike<{ data: unknown; error: unknown; count?: number }> {
  private filters: Filter[] = []
  private op: Op = 'select'
  private payload: Row[] = []
  private patch: Row = {}
  private selectStr: string | null = null
  private headCount = false
  private singleMode: 'single' | 'maybe' | null = null
  private orderBy: { col: string; asc: boolean } | null = null
  private limitN: number | null = null
  private onConflict: string[] = []

  constructor(
    private db: FakeDb,
    private table: string,
    private readOnly = false,
  ) {}

  select(cols = '*', opts?: { count?: string; head?: boolean }) {
    this.selectStr = cols
    if (opts?.head) this.headCount = true
    return this
  }
  insert(rows: Row | Row[]) {
    this.op = 'insert'
    this.payload = Array.isArray(rows) ? rows : [rows]
    return this
  }
  upsert(rows: Row | Row[], opts?: { onConflict?: string }) {
    this.op = 'upsert'
    this.payload = Array.isArray(rows) ? rows : [rows]
    this.onConflict = (opts?.onConflict ?? 'id').split(',').map((s) => s.trim())
    return this
  }
  update(patch: Row) {
    this.op = 'update'
    this.patch = patch
    return this
  }
  delete() {
    this.op = 'delete'
    return this
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => sameValue(r[col], v))
    return this
  }
  neq(col: string, v: unknown) {
    this.filters.push((r) => !sameValue(r[col], v))
    return this
  }
  in(col: string, vs: unknown[]) {
    this.filters.push((r) => vs.some((v) => sameValue(r[col], v)))
    return this
  }
  gt(col: string, v: unknown) {
    this.filters.push((r) => String(r[col]) > String(v))
    return this
  }
  is(col: string, v: unknown) {
    this.filters.push((r) => (r[col] ?? null) === v)
    return this
  }
  overlaps(col: string, vs: unknown[]) {
    this.filters.push((r) => ((r[col] as unknown[]) ?? []).some((x) => vs.includes(x)))
    return this
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, asc: opts?.ascending ?? true }
    return this
  }
  limit(n: number) {
    this.limitN = n
    return this
  }
  single() {
    this.singleMode = 'single'
    return this
  }
  maybeSingle() {
    this.singleMode = 'maybe'
    return this
  }

  private rows() {
    return (this.db.tables[this.table] ??= [])
  }

  private run(): { data: unknown; error: unknown; count?: number } {
    const failure = this.db.failures[`${this.table}.${this.op}`]
    if (failure) return { data: null, error: { message: failure } }

    // Mimic RLS without a write policy: inserts are rejected, updates/deletes match nothing
    if (this.readOnly && this.op !== 'select') {
      if (this.op === 'insert' || this.op === 'upsert') {
        return { data: null, error: { message: 'new row violates row-level security policy' } }
      }
      this.filters.push(() => false)
    }

    let affected: Row[]
    const all = this.rows()
    const matches = () => all.filter((r) => this.filters.every((f) => f(r)))

    switch (this.op) {
      case 'insert':
        affected = this.payload.map((p) => ({ id: newId(), ...p }))
        all.push(...affected)
        break
      case 'upsert':
        affected = this.payload.map((p) => {
          const existing = all.find((r) => this.onConflict.every((c) => sameValue(r[c], p[c])))
          if (existing) return Object.assign(existing, p)
          const row = { id: newId(), ...p }
          all.push(row)
          return row
        })
        break
      case 'update':
        affected = matches()
        for (const r of affected) Object.assign(r, this.patch)
        break
      case 'delete':
        affected = matches()
        this.db.tables[this.table] = all.filter((r) => !affected.includes(r))
        break
      default:
        affected = matches()
    }

    if (this.op !== 'select' && this.selectStr === null) return { data: null, error: null }
    if (this.headCount) return { data: null, error: null, count: affected.length }

    let result = affected.map((r) => project(this.db.tables, r, this.selectStr ?? '*'))
    if (this.orderBy) {
      const { col, asc } = this.orderBy
      result = [...result].sort((a, b) =>
        String(a[col]) < String(b[col])
          ? asc
            ? -1
            : 1
          : String(a[col]) > String(b[col])
            ? asc
              ? 1
              : -1
            : 0,
      )
    }
    if (this.limitN !== null) result = result.slice(0, this.limitN)

    if (this.singleMode) {
      if (result.length === 1) return { data: result[0], error: null }
      if (result.length === 0 && this.singleMode === 'maybe') return { data: null, error: null }
      return { data: null, error: { message: `expected 1 row, got ${result.length}` } }
    }
    return { data: result, error: null }
  }

  then<T1 = { data: unknown; error: unknown }, T2 = never>(
    onFulfilled?:
      | ((v: { data: unknown; error: unknown; count?: number }) => T1 | PromiseLike<T1>)
      | null,
    onRejected?: ((e: unknown) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve()
      .then(() => this.run())
      .then(onFulfilled, onRejected)
  }
}

export class FakeDb {
  tables: Tables
  /** `${table}.${op}` → error message, to simulate failures */
  failures: Record<string, string> = {}
  userId: string | null = null
  /** auth.users emails by user id — independent of profile.email */
  authEmails: Record<string, string> = {}
  /** Tables RLS makes read-only for the user client; the service client bypasses RLS */
  clientReadOnly = new Set<string>()

  constructor(seed: Tables = {}) {
    this.tables = structuredClone(seed)
  }

  client(role: 'user' | 'service' = 'user') {
    return {
      auth: {
        getUser: async () => ({
          data: {
            user: this.userId ? { id: this.userId, email: this.authEmails[this.userId] } : null,
          },
          error: null,
        }),
        admin: {
          createUser: async ({ email }: { email: string }) => {
            if (Object.values(this.authEmails).includes(email)) {
              return { data: { user: null }, error: { message: 'User already registered' } }
            }
            const id = newId()
            this.authEmails[id] = email
            return { data: { user: { id, email } }, error: null }
          },
          deleteUser: async (id: string) => {
            delete this.authEmails[id]
            return { error: null }
          },
        },
      },
      from: (table: string) =>
        new Query(this, table, role === 'user' && this.clientReadOnly.has(table)),
    }
  }

  rows(table: string) {
    return this.tables[table] ?? []
  }
}
