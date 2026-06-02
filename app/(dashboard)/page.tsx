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
import { formatDate, getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel, isOverdue, getDueDateStatus } from '@/lib/utils'
import { AlertCircle, Calendar, TrendingUp, Users, UserX, Clock, BarChart3 } from 'lucide-react'
import { parseISO } from 'date-fns'
import type { DashboardStats, SectorProgress, TaskWithRelations, MemberWorkload, WeeklySummary, MonthlyStats } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, sector:sectors(*), responsible:team_members!tasks_responsible_id_fkey(*), subtasks(*)')
    .eq('archived', false)
    .order('created_at', { ascending: false })

  const allTasks = (tasks ?? []) as TaskWithRelations[]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Stats cards ──────────────────────────────────────────────
  const stats: DashboardStats = {
    total: allTasks.length,
    pending: allTasks.filter(t => t.status === 'pending').length,
    in_progress: allTasks.filter(t => t.status === 'in_progress').length,
    completed: allTasks.filter(t => t.status === 'completed').length,
    cancelled: allTasks.filter(t => t.status === 'cancelled').length,
    overdue: allTasks.filter(t => isOverdue(t.due_date, t.status)).length,
  }

  // ── Weekly summary ────────────────────────────────────────────
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))

  const weekly: WeeklySummary = {
    completedThisWeek: allTasks.filter(t =>
      t.status === 'completed' && parseISO(t.updated_at) >= monday
    ).length,
    createdThisWeek: allTasks.filter(t => parseISO(t.created_at) >= monday).length,
    overdue: stats.overdue,
  }

  // ── Sector progress ───────────────────────────────────────────
  const { data: sectors } = await supabase.from('sectors').select('*')
  const sectorProgressData: SectorProgress[] = (sectors ?? []).map(sector => {
    const st = allTasks.filter(t => t.sector_id === sector.id)
    const completed = st.filter(t => t.status === 'completed').length
    return { sector, total: st.length, completed, percentage: st.length > 0 ? Math.round((completed / st.length) * 100) : 0 }
  }).filter(s => s.total > 0)

  // ── Member workload ───────────────────────────────────────────
  const { data: membersRaw } = await admin.from('team_members').select('*').order('name')
  const memberWorkload: MemberWorkload[] = (membersRaw ?? []).map(member => ({
    member,
    open: allTasks.filter(t => t.responsible_id === member.id && ['pending', 'in_progress'].includes(t.status)).length,
    overdue: allTasks.filter(t => t.responsible_id === member.id && isOverdue(t.due_date, t.status)).length,
    completed: allTasks.filter(t => t.responsible_id === member.id && t.status === 'completed').length,
  })).filter(m => m.open > 0).sort((a, b) => b.open - a.open)

  // ── Due this week ─────────────────────────────────────────────
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 7)
  const dueSoon = allTasks.filter(t => {
    if (!t.due_date || ['completed', 'cancelled'].includes(t.status)) return false
    const due = parseISO(t.due_date)
    return due >= today && due <= nextWeek
  }).sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())

  // ── Stale tasks (in_progress > 7 days unchanged) ──────────────
  const staleTasks = allTasks.filter(t => {
    if (t.status !== 'in_progress') return false
    const days = Math.floor((Date.now() - new Date(t.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    return days >= 7
  }).sort((a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())

  // ── Tasks without responsible ─────────────────────────────────
  const noResponsible = allTasks.filter(t =>
    !t.responsible_id && !['completed', 'cancelled'].includes(t.status)
  )

  // ── Monthly delivery rate ─────────────────────────────────────
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

  // ── Priority tasks ────────────────────────────────────────────
  const urgentTasks = allTasks
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

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Visão geral das tarefas da equipe MedWork</p>
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

      {/* Row 2: Member workload + Sector progress */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Carga por Responsável</h2>
          </div>
          <MemberWorkloadList members={memberWorkload} />
        </div>
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

      {/* Row 4: Monthly rate + No responsible + Priority tasks */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Taxa de Entrega</h2>
            <span className="text-xs text-slate-400">este mês</span>
          </div>
          <MonthlyRate stats={monthly} />
        </div>

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
