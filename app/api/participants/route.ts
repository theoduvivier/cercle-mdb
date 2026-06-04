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

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const nom = searchParams.get('nom')
  if (!nom?.trim()) return NextResponse.json({ error: 'nom requis' }, { status: 400 })

  // La suppression nécessite la clé service role (contourne la RLS), côté serveur uniquement
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Suppression non configurée : ajoute SUPABASE_SERVICE_ROLE_KEY dans les variables d'environnement." },
      { status: 501 }
    )
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey)
  const { error, count } = await admin
    .from('participants')
    .delete({ count: 'exact' })
    .ilike('nom', nom)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: count ?? 0 })
}
