import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const admin = createAdminClient()
  const { data: member } = await admin.from('team_members').select('role,email').eq('auth_user_id', user.id).single()
  if (member?.role !== 'admin') return NextResponse.json({ error: 'Apenas administradores.' }, { status: 403 })

  try {
    await sendEmail(
      member.email,
      '[MedWork Tasks] Teste de configuração de e-mail',
      'Olá!\n\nEste é um e-mail de teste do MedWork Tasks.\n\nSe você está recebendo esta mensagem, a configuração de e-mail está funcionando corretamente! ✅\n\nAtenciosamente,\nMedWork Tasks'
    )
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
