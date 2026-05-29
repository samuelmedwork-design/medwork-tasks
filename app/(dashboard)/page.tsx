import { createClient } from '@/lib/supabase/server'
import StatsCards from '@/components/dashboard/StatsCards'
import SectorProgressList from '@/components/dashboard/SectorProgress'
import { formatDate, getPriorityColor, getPriorityLabel, getStatusColor, getStatusLabel, isOverdue } from '@/lib/utils'
import { AlertCircle, Calendar, TrendingUp } from 'lucide-react'
import type { DashboardStats, SectorProgress, TaskWithRelations } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*, sector:sectors(*), responsible:team_members!tasks_responsible_id_fkey(*), subtasks(*)')
    .eq('archived', false)
    .order('created_at', { ascending: false })

  const allTasks = (tasks ?? []) as TaskWithRelations[]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const stats: DashboardStats = {
    total: allTasks.length,
    pending: allTasks.filter(t => t.status === 'pending').length,
    in_progress: allTasks.filter(t => t.status === 'in_progress').length,
    completed: allTasks.filter(t => t.status === 'completed').length,
    cancelled: allTasks.filter(t => t.status === 'cancelled').length,
    overdue: allTasks.filter(t => isOverdue(t.due_date, t.status)).length,
  }

  const { data: sectors } = await supabase.from('sectors').select('*')
  const sectorProgressData: SectorProgress[] = (sectors ?? []).map(sector => {
    const sectorTasks = allTasks.filter(t => t.sector_id === sector.id)
    const completed = sectorTasks.filter(t => t.status === 'completed').length
    const total = sectorTasks.length
    return { sector, total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }).filter(s => s.total > 0)

  const urgentTasks = allTasks
    .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
    .sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
      const diff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (diff !== 0) return diff
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
    .slice(0, 5)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Visão geral das tarefas da equipe MedWork</p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-slate-800">Progresso por Setor</h2>
          </div>
          <SectorProgressList sectors={sectorProgressData} />
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-slate-800">Tarefas Prioritárias</h2>
          </div>

          {urgentTasks.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              Nenhuma tarefa pendente no momento.
            </div>
          ) : (
            <div className="space-y-2">
              {urgentTasks.map(task => {
                const overdue = isOverdue(task.due_date, task.status)
                return (
                  <div key={task.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    {task.sector && (
                      <div className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[20px]" style={{ backgroundColor: task.sector.color }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)} ${task.priority === 'urgent' ? 'animate-pulse-urgent' : ''}`}>
                          {getPriorityLabel(task.priority)}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                          {getStatusLabel(task.status)}
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
