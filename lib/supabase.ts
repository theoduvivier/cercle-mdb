import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Participant = {
  id?: number
  nom: string
  arr_date: string
  arr_time: string
  arr_flight: string
  dep_date: string
  dep_time: string
  dep_flight: string
  arr_transport: string
  arr_transport_detail: string
  dep_transport: string
  dep_transport_detail: string
  created_at?: string
}
