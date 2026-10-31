import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 가 없습니다. .env.example 을 복사해 .env.local 을 만드세요.')
}

export const supabase = createClient<Database>(url, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})
