import { createClient } from "@supabase/supabase-js"

// For client-side usage (with anon key)
export const createClientComponentClient = () => {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
}

// For server-side usage (with service role key)
export const createServerComponentClient = () => {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
