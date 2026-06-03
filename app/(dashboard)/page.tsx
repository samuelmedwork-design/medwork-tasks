import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import StatsCards from '@/components/dashboard/StatsCards'
import SectorProgressList from '@/components/dashboard/SectorProgress'
import WeeklySummaryCard from '@/components/dashboard/WeeklySummary'
import MemberWorkloadList from '@/components/dashboard/MemberWorkload'
import DueSoon from '@/components/dashboard/DueSoon'
import StaleTasks from '@/components/dashboard/StaleTasks'
import MonthlyRate from '@/components/dashboard/MonthlyRate'
import DashboardRealtime from '@/components/dashboard/DashboardRealtime'
import ScopeToggle from '@/components/dashboard/ScopeToggle'
import { formatDate, getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel, isOverdue, getDueDateStatus } from '@/lib/utils'
import { AlertCircle, Calendar, TrendingUp, Users, UserX, Clock, BarChart3 } from 'lucide-react'
import { parseISO } from 'date-fns'
import type { DashboardStats, SectorProgress, TaskWithRelations, MemberWorkload, WeeklySummary, MonthlyStats } from '@/lib/types'

// Sempre buscar dados frescos do servidor (sem cache de rota)
export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Quem está logado (para o filtro "Minhas")
  const { data: { user } } = await supabase.auth.getUser()
  const { data: me } = user
    ? await admin.from('team_members').select('id, role').eq('auth_user_id', user.id).single()
    : { data: null }

  // Escopo: admin abre em "Geral", membro abre em "Minhas". O ?view= sobrescreve.
  const { view } = await searchParams
  const scope: 'mine' | 'all' =
    view === 'all' || view === 'mine' ? view : (me?.role === 'admin' ? 'all' : 'mine')
  const isMine = scope === 'mine'

  // Busca TODAS as tarefas (incluindo arquivadas) para preservar o histórico.
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, sector:sectors(*), responsible:team_members!tasks_responsible_id_fkey(*), subtasks(*)')
    .order('created_at', { ascending: false })

  const rawTasks = (tasks ?? []) as TaskWithRelations[]
  // No modo "Minhas": tarefas onde sou responsável ou tenho subtarefa atribuída.
  const allTasks = isMine
    ? rawTasks.filter(t => t.responsible_id === me?.id || t.subtasks?.some(s => s.responsible_id === me?.id))
    : rawTasks
  // Visão operacional: tarefas que ainda estão "em jogo" (não arquivadas).
  const activeTasks = allTasks.filter(t => !t.archived)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Stats cards ──────────────────────────────────────────────
  // Concluídas e total contam o histórico completo; em andamento/atrasadas são operacionais.
  const stats: DashboardStats = {
    total: allTasks.length,
    pending: activeTasks.filter(t => t.status === 'pending').length,
    in_progress: activeTasks.filter(t => t.status === 'in_progress').length,
    completed: allTasks.filter(t => t.status === 'completed').length,
    cancelled: allTasks.filter(t => t.status === 'cancelled').length,
    overdue: activeTasks.filter(t => isOverdue(t.due_date, t.status)).length,
  }

  // ── Weekly summary (histórico — inclui arquivadas) ────────────
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))

  const weekly: WeeklySummary = {
    completedThisWeek: allTasks.filter(t =>
      t.status === 'completed' && parseISO(t.updated_at) >= monday
    ).length,
    createdThisWeek: allTasks.filter(t => parseISO(t.created_at) >= monday).length,
    overdue: stats.overdue,
  }

  // ── Sector progress (histórico — inclui arquivadas) ───────────
  const { data: sectors } = await supabase.from('sectors').select('*')
  const sectorProgressData: SectorProgress[] = (sectors ?? []).map(sector => {
    const st = allTasks.filter(t => t.sector_id === sector.id)
    const completed = st.filter(t => t.status === 'completed').length
    return { sector, total: st.length, completed, percentage: st.length > 0 ? Math.round((completed / st.length) * 100) : 0 }
  }).filter(s => s.total > 0)

  // ── Member workload (operacional — só tarefas abertas) ────────
  const { data: membersRaw } = await admin.from('team_members').select('*').order('name')
  const memberWorkload: MemberWorkload[] = (membersRaw ?? []).map(member => ({
    member,
    open: activeTasks.filter(t => t.responsible_id === member.id && ['pending', 'in_progress'].includes(t.status)).length,
    overdue: activeTasks.filter(t => t.responsible_id === member.id && isOverdue(t.due_date, t.status)).length,
    completed: allTasks.filter(t => t.responsible_id === member.id && t.status === 'completed').length,
  })).filter(m => m.open > 0).sort((a, b) => b.open - a.open)

  // ── Due this week (operacional) ───────────────────────────────
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  const dueSoon = activeTasks.filter(t => {
    if (!t.due_date || ['completed', 'cancelled'].includes(t.status)) return false
    const due = parseISO(t.due_date)
    return due >= today && due <= nextWeek
  }).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())

  // ── Stale tasks (operacional) ─────────────────────────────────
  const staleTasks = activeTasks.filter(t => {
    if (t.status !== 'in_progress') return false
    const days = Math.floor((Date.now() - new Date(t.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    return days >= 7
  }).sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())

  // ── Tasks without responsible (operacional) ───────────────────
  const noResponsible = activeTasks.filter(t =>
    !t.responsible_id && !['completed', 'cancelled'].includes(t.status)
  )

  // ── Monthly delivery rate (histórico) ─────────────────────────
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const createdThisMonth = allTasks.filter(t => parseISO(t.created_at) >= startOfMonth).length
  const completedThisMonth = allTasks.filter(t =>
    t.status === 'completed' && parseISO(t.updated_at) >= startOfMonth
  ).length
  const monthly: MonthlyStats = {
    created: createdThisMonth,
    completed: completedThisMonth,
    rate: createdThisMonth > 0 ? Math.round((completedThisMonth / createdThisMonth) * 100) : 0,
  }

  // ── Priority tasks (operacional) ──────────────────────────────
  const urgentTasks = activeTasks
    .filter(t => !['completed', 'cancelled'].includes(t.status))
    .sort((a, b) => {
      const p = { urgent: 0, high: 1, medium: 2, low: 3 }
      const diff = p[a.priority] - p[b.priority]
      if (diff !== 0) return diff
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <DashboardRealtime />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {isMine ? 'Suas tarefas e demandas' : 'Visão geral das tarefas da equipe MedWork'}
          </p>
        </div>
        <ScopeToggle current={scope} />
      </div>

      {/* Row 1: Weekly summary + Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-1">
          <WeeklySummaryCard data={weekly} />
        </div>
        <div className="xl:col-span-3">
          <StatsCards stats={stats} />
        </div>
      </div>

      {/* Row 2: Member workload (só no Geral) + Sector progress */}
      <div className={`grid grid-cols-1 gap-6 ${isMine ? '' : 'xl:grid-cols-2'}`}>
        {!isMine && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Users className="w-4 h-4 text-indigo-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Carga por Responsável</h2>
            </div>
            <MemberWorkloadList members={memberWorkload} />
          </div>
        )}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Progresso por Setor</h2>
          </div>
          <SectorProgressList sectors={sectorProgressData} />
        </div>
      </div>

      {/* Row 3: Due soon + Stale tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Vence nos Próximos 7 Dias</h2>
            </div>
            <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
              {dueSoon.length}
            </span>
          </div>
          <DueSoon tasks={dueSoon} />
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Tarefas Paradas</h2>
              <span className="text-xs text-slate-400">&gt; 7 dias sem atualização</span>
            </div>
            {staleTasks.length > 0 && (
              <span className="text-xs font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                {staleTasks.length}
              </span>
            )}
          </div>
          <StaleTasks tasks={staleTasks} />
        </div>
      </div>

      {/* Row 4: Monthly rate + No responsible (só no Geral) + Priority tasks */}
      <div className={`grid grid-cols-1 gap-6 ${isMine ? 'xl:grid-cols-2' : 'xl:grid-cols-3'}`}>
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Taxa de Entrega</h2>
            <span className="text-xs text-slate-400">este mês</span>
          </div>
          <MonthlyRate stats={monthly} />
        </div>

        {!isMine && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <UserX className="w-4 h-4 text-red-400" />
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">Sem Responsável</h2>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${noResponsible.length > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                {noResponsible.length}
              </span>
            </div>
            {noResponsible.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-sm">Todas as tarefas têm responsável.</div>
            ) : (
              <div className="space-y-2">
                {noResponsible.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-lg">
                    {task.sector && (
                      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: task.sector.color }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{task.title}</p>
                      {task.sector && <p className="text-xs text-slate-400">{task.sector.icon} {task.sector.name}</p>}
                    </div>
                  </div>
                ))}
                {noResponsible.length > 5 && (
                  <p className="text-xs text-slate-400 text-center pt-1">+{noResponsible.length - 5} mais</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Tarefas Prioritárias</h2>
          </div>
          {urgentTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">Nenhuma tarefa pendente.</div>
          ) : (
            <div className="space-y-2">
              {urgentTasks.map(task => {
                const overdue = isOverdue(task.due_date, task.status)
                return (
                  <div key={task.id} className="flex items-start gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    {task.sector && <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: task.sector.color }} />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{task.title}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          {getPriorityLabel(task.priority)}
                        </span>
                        {task.due_date && (
                          <span className={`flex items-center gap-1 text-xs font-medium ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
                            <Calendar className="w-3 h-3" />
                            {overdue ? 'ATRASADA' : formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
