import { createClient } from '@supabase/supabase-js'
// Once src/types/database.ts is generated and valid, make this typed:
//   import type { Database } from '../types/database'
//   createClient<Database>(...)

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local')
}

export const supabase = createClient(url, key)
