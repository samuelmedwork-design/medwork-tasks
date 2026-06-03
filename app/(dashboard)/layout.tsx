import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const adminClient = createAdminClient()
  const { data: member } = await adminClient
    .from('team_members').select('*').eq('auth_user_id', user.id).single()

  if (!member) redirect('/login?erro=nao_cadastrado')

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar — visível apenas em telas md+ */}
      <div className="hidden md:block">
        <Sidebar currentUser={member} />
      </div>

      {/* Conteúdo principal */}
      <main className="flex-1 md:ml-64 overflow-y-auto">
        {/* Padding bottom no mobile para não ficar atrás do BottomNav */}
        <div className="min-h-full px-4 pt-8 pb-24 md:p-8 md:pb-8">
          {children}
        </div>
      </main>

      {/* Bottom nav — visível apenas no mobile */}
      <BottomNav currentUser={member} />
    </div>
  )
}
