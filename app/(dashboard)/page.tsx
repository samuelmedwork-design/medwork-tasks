import { createClient } from '@/lib/supabase/server'
import StatsCards from '@/components/dashboard/StatsCards'
import SectorProgressList from '@/components/dashboard/SectorProgress'
import { formatDate, getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel, isOverdue } from '@/lib/utils'
import { AlertCircle, Calendar, TrendingUp } from 'lucide-react'
import type { DashboardStats, SectorProgress, TaskWithRelations } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Fetch all tasks with relations
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      sector:sectors(*),
      responsible:team_members!tasks_responsible_id_fkey(*),
      subtasks(*)
    `)
    .order('created_at', { ascending: false })

  const allTasks = (tasks ?? []) as TaskWithRelations[]

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Build stats
  const stats: DashboardStats = {
    total: allTasks.length,
    pending: allTasks.filter((t) => t.status === 'pending').length,
    in_progress: allTasks.filter((t) => t.status === 'in_progress').length,
    completed: allTasks.filter((t) => t.status === 'completed').length,
    cancelled: allTasks.filter((t) => t.status === 'cancelled').length,
    overdue: allTasks.filter((t) => isOverdue(t.due_date, t.status)).length,
  }

  // Sector progress
  const { data: sectors } = await supabase.from('sectors').select('*')
  const sectorProgressData: SectorProgress[] = (sectors ?? []).map((sector) => {
    const sectorTasks = allTasks.filter((t) => t.sector_id === sector.id)
    const completed = sectorTasks.filter((t) => t.status === 'completed').length
    const total = sectorTasks.length
    return {
      sector,
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }).filter((s) => s.total > 0)

  // Urgent tasks (top 5): urgente primeiro, depois por due_date
  const urgentTasks = allTasks
    .filter((t) => t.status !== 'completed' && t.status !== 'cancelled')
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      const pa = priorityOrder[a.priority]
      const pb = priorityOrder[b.priority]
      if (pa !== pb) return pa - pb
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
    .slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Visão geral das tarefas da equipe MedWork</p>
      </div>

      {/* Stats cards */}
      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sector progress */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h2 className="font-semibold text-white">Progresso por Setor</h2>
          </div>
          <SectorProgressList sectors={sectorProgressData} />
        </div>

        {/* Urgent tasks */}
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-5">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-white">Tarefas Prioritárias</h2>
          </div>

          {urgentTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Nenhuma tarefa pendente no momento.
            </div>
          ) : (
            <div className="space-y-3">
              {urgentTasks.map((task) => {
                const overdue = isOverdue(task.due_date, task.status)
                return (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50"
                  >
                    {task.sector && (
                      <div
                        className="w-1 self-stretch rounded-full flex-shrink-0"
                        style={{ backgroundColor: task.sector.color }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)} ${task.priority === 'urgent' ? 'animate-pulse-urgent' : ''}`}
                        >
                          {getPriorityLabel(task.priority)}
                        </span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}
                        >
                          {getStatusLabel(task.status)}
                        </span>
                        {task.due_date && (
                          <span
                            className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-400' : 'text-slate-500'}`}
                          >
                            <Calendar className="w-3 h-3" />
                            {formatDate(task.due_date)}
                            {overdue && ' (atrasada)'}
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
