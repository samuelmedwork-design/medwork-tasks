import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: member } = await supabase
    .from('team_members')
    .select('*')
    .eq('auth_user_id', user.id)
    .single()

  if (!member) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar currentUser={member} />
      <main className="flex-1 ml-64 overflow-y-auto">
        <div className="min-h-full p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
