import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: member } = await admin
    .from('team_members').select('id').eq('auth_user_id', user.id).single()
  if (!member) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 })

  const { endpoint, keys, userAgent } = await request.json()
  await admin.from('push_subscriptions').upsert({
    member_id: member.id,
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: userAgent,
  }, { onConflict: 'member_id,endpoint' })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { endpoint } = await request.json()
  await admin.from('push_subscriptions').delete().eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}
