import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { vi } from 'vitest'
import type { FakeDb } from './fake-supabase'

// Point both the user and service Supabase clients at `db`.
// The calling test file must vi.mock '@/lib/supabase/server' and '@/lib/supabase/service'.
export function useDb(db: FakeDb) {
  vi.mocked(createClient).mockResolvedValue(
    db.client() as unknown as Awaited<ReturnType<typeof createClient>>,
  )
  vi.mocked(createServiceClient).mockReturnValue(
    db.client('service') as unknown as ReturnType<typeof createServiceClient>,
  )
  return db
}
