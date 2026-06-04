import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('participants')
    .select('*')
    .order('arr_date', { ascending: true })
    .order('arr_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()

  // Upsert par nom (insensible à la casse)
  const { data: existing } = await supabase
    .from('participants')
    .select('id')
    .ilike('nom', body.nom)
    .single()

  let result
  if (existing) {
    result = await supabase
      .from('participants')
      .update(body)
      .eq('id', existing.id)
      .select()
      .single()
  } else {
    result = await supabase
      .from('participants')
      .insert(body)
      .select()
      .single()
  }

  if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
  return NextResponse.json(result.data)
}
