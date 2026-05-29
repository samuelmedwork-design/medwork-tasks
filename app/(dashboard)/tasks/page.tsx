'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Search, Filter, Loader2, Archive } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import TaskCard from '@/components/tasks/TaskCard'
import TaskForm from '@/components/tasks/TaskForm'
import type { TaskWithRelations, Sector, TeamMember, Priority } from '@/lib/types'

export default function TasksPage() {
  const supabase = useMemo(() => createClient(), [])

  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [filterSector, setFilterSector] = useState('')
  const [filterResponsible, setFilterResponsible] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const query = supabase
      .from('tasks')
      .select(`
        *,
        sector:sectors(*),
        responsible:team_members!tasks_responsible_id_fkey(*),
        subtasks(
          *,
          responsible:team_members!subtasks_responsible_id_fkey(*)
        )
      `)
      .eq('archived', showArchived)
      .order('created_at', { ascending: false })

    const { data } = await query
    setTasks((data as TaskWithRelations[]) ?? [])
    setLoading(false)
  }, [supabase, showArchived])

  useEffect(() => {
    fetchTasks()
    supabase.from('sectors').select('*').order('name').then(({ data }) => setSectors(data ?? []))
    supabase.from('team_members').select('*').order('name').then(({ data }) => setMembers(data ?? []))
  }, [fetchTasks])

  async function handleToggleSubtask(subtaskId: string, currentStatus: 'pending' | 'completed') {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    const { error } = await supabase
      .from('subtasks')
      .update({ status: newStatus })
      .eq('id', subtaskId)

    if (error) {
      toast.error('Erro ao atualizar subtarefa.')
      return
    }

    // Update task updated_at
    const task = tasks.find((t) => t.subtasks.some((s) => s.id === subtaskId))
    if (task) {
      await supabase
        .from('tasks')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', task.id)
    }

    fetchTasks()
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Deseja realmente excluir esta tarefa?')) return

    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) {
      toast.error('Erro ao excluir tarefa.')
      return
    }
    toast.success('Tarefa excluída.')
    fetchTasks()
  }

  async function handleArchive(taskId: string, archive: boolean) {
    const { error } = await supabase
      .from('tasks')
      .update({ archived: archive })
      .eq('id', taskId)
    if (error) {
      toast.error('Erro ao arquivar tarefa.')
      return
    }
    toast.success(archive ? 'Tarefa arquivada.' : 'Tarefa restaurada.')
    fetchTasks()
  }

  function handleEdit(task: TaskWithRelations) {
    setEditingTask(task)
    setShowForm(true)
  }

  function handleCloseForm() {
    setShowForm(false)
    setEditingTask(null)
  }

  // Filter + sort
  const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
  const filtered = tasks
    .filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
      if (filterSector && t.sector_id !== filterSector) return false
      if (filterResponsible && t.responsible_id !== filterResponsible) return false
      if (filterStatus && t.status !== filterStatus) return false
      if (filterPriority && t.priority !== filterPriority) return false
      return true
    })
    .sort((a, b) => {
      const diff = priorityOrder[a.priority] - priorityOrder[b.priority]
      if (diff !== 0) return diff
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })

  const selectClass = "bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {showArchived ? 'Tarefas Arquivadas' : 'Tarefas'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} tarefa{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 font-semibold rounded-lg text-sm transition-colors border ${
              showArchived
                ? 'bg-amber-600/20 border-amber-600/40 text-amber-400 hover:bg-amber-600/30'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600'
            }`}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Ver ativas' : 'Arquivadas'}
          </button>
          {!showArchived && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 placeholder-slate-500 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select value={filterSector} onChange={(e) => setFilterSector(e.target.value)} className={selectClass}>
            <option value="">Todos os setores</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
            ))}
          </select>

          <select value={filterResponsible} onChange={(e) => setFilterResponsible(e.target.value)} className={selectClass}>
            <option value="">Todos os responsáveis</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={selectClass}>
              <option value="">Status</option>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
            </select>

            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className={selectClass}>
              <option value="">Prioridade</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-800 border border-slate-700 rounded-xl">
          <p className="text-slate-400 text-lg font-medium">Nenhuma tarefa encontrada</p>
          <p className="text-slate-600 text-sm mt-1">Tente ajustar os filtros ou crie uma nova tarefa.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleSubtask={handleToggleSubtask}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onArchive={handleArchive}
            />
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <TaskForm
          task={editingTask}
          onClose={handleCloseForm}
          onSaved={fetchTasks}
        />
      )}
    </div>
  )
}
