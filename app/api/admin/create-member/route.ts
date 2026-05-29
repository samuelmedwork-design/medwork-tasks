import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  // Verify requester is admin
  const supabaseServer = await createServerClient()
  const { data: { user } } = await supabaseServer.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { data: requester } = await supabaseServer
    .from('team_members')
    .select('role')
    .eq('auth_user_id', user.id)
    .single()

  if (!requester || requester.role !== 'admin') {
    return NextResponse.json({ error: 'Permissão negada.' }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, password, sector_id, role } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 })
  }

  // Use service role client to create auth user
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const { error: memberError } = await supabaseAdmin.from('team_members').insert({
    name,
    email,
    sector_id: sector_id || null,
    role: role ?? 'member',
    auth_user_id: authData.user.id,
  })

  if (memberError) {
    // Rollback: delete auth user
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: memberError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
