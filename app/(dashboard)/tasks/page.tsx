'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Search, Filter, Loader2, Archive, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { addDays, addMonths, format, parseISO } from 'date-fns'
import TaskCard from '@/components/tasks/TaskCard'
import TaskForm from '@/components/tasks/TaskForm'
import type { TaskWithRelations, Sector, TeamMember, Priority, TaskStatus, SubtaskStatus } from '@/lib/types'

function calcTaskStatus(subtasks: { status: string }[]): TaskStatus {
  if (subtasks.length === 0) return 'pending'
  const completed = subtasks.filter(s => s.status === 'completed').length
  if (completed === 0) return 'pending'
  if (completed === subtasks.length) return 'completed'
  return 'in_progress'
}

export default function TasksPage() {
  const supabase = useMemo(() => createClient(), [])

  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskWithRelations | null>(null)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null)
  const [showMyTasks, setShowMyTasks] = useState(false)
  const [search, setSearch] = useState('')
  const [filterSector, setFilterSector] = useState('')
  const [filterResponsible, setFilterResponsible] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showArchived, setShowArchived] = useState(false)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('tasks')
      .select(`*, sector:sectors(*), responsible:team_members!tasks_responsible_id_fkey(*), subtasks(*, responsible:team_members!subtasks_responsible_id_fkey(*))`)
      .eq('archived', showArchived)
      .order('created_at', { ascending: false })
    setTasks((data as TaskWithRelations[]) ?? [])
    setLoading(false)
  }, [supabase, showArchived])

  useEffect(() => {
    fetchTasks()
    supabase.from('sectors').select('*').order('name').then(({ data }) => setSectors(data ?? []))
    supabase.from('team_members').select('*').order('name').then(({ data }) => setMembers(data ?? []))
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('team_members').select('id').eq('auth_user_id', user.id).single()
        .then(({ data }) => setCurrentMemberId(data?.id ?? null))
    })
  }, [fetchTasks])

  async function handleToggleSubtask(subtaskId: string, currentStatus: 'pending' | 'completed') {
    const newStatus: SubtaskStatus = currentStatus === 'completed' ? 'pending' : 'completed'
    const { error } = await supabase.from('subtasks').update({ status: newStatus }).eq('id', subtaskId)
    if (error) { toast.error('Erro ao atualizar subtarefa.'); return }

    // Atualização otimista — sem refetch, sem recolher
    let completedRecurringTask: TaskWithRelations | null = null
    setTasks(prev => prev.map(task => {
      if (!task.subtasks.some(s => s.id === subtaskId)) return task
      const updatedSubtasks = task.subtasks.map(s =>
        s.id === subtaskId ? { ...s, status: newStatus } : s
      ) as TaskWithRelations['subtasks']
      const newTaskStatus = calcTaskStatus(updatedSubtasks)
      supabase.from('tasks').update({ status: newTaskStatus }).eq('id', task.id)
      // Detecta se tarefa recorrente foi concluída agora
      if (newTaskStatus === 'completed' && task.status !== 'completed' && task.recurrence_type !== 'none') {
        completedRecurringTask = { ...task, subtasks: updatedSubtasks, status: newTaskStatus }
      }
      return { ...task, subtasks: updatedSubtasks, status: newTaskStatus }
    }))
    // Fora do setTasks para não bloquear a UI
    if (completedRecurringTask) createNextOccurrence(completedRecurringTask)
  }

  async function handleAddSubtask(taskId: string, title: string, responsibleId: string) {
    const { data, error } = await supabase
      .from('subtasks')
      .insert({ task_id: taskId, title, responsible_id: responsibleId || null, sort_order: 999 })
      .select('*, responsible:team_members!subtasks_responsible_id_fkey(*)')
      .single()
    if (error) { toast.error('Erro ao adicionar subtarefa.'); return }

    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task
      const updatedSubtasks = [...task.subtasks, data] as TaskWithRelations['subtasks']
      const newTaskStatus = calcTaskStatus(updatedSubtasks)
      supabase.from('tasks').update({ status: newTaskStatus }).eq('id', taskId)
      return { ...task, subtasks: updatedSubtasks, status: newTaskStatus }
    }))
  }

  async function handleEditSubtask(subtaskId: string, title: string, responsibleId: string) {
    const { data, error } = await supabase
      .from('subtasks')
      .update({ title, responsible_id: responsibleId || null })
      .eq('id', subtaskId)
      .select('*, responsible:team_members!subtasks_responsible_id_fkey(*)')
      .single()
    if (error) { toast.error('Erro ao editar subtarefa.'); return }

    setTasks(prev => prev.map(task => {
      if (!task.subtasks.some(s => s.id === subtaskId)) return task
      return {
        ...task,
        subtasks: task.subtasks.map(s => s.id === subtaskId ? { ...s, ...data } : s) as TaskWithRelations['subtasks']
      }
    }))
  }

  async function handleReorderSubtasks(taskId: string, orderedIds: string[]) {
    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task
      const reordered = orderedIds.map((id, i) => {
        const s = task.subtasks.find(s => s.id === id)!
        return { ...s, sort_order: i }
      }) as TaskWithRelations['subtasks']
      return { ...task, subtasks: reordered }
    }))
    // Persist order to DB
    await Promise.all(
      orderedIds.map((id, i) => supabase.from('subtasks').update({ sort_order: i }).eq('id', id))
    )
  }

  async function handleDeleteSubtask(subtaskId: string, taskId: string) {
    if (!confirm('Deseja realmente excluir esta subtarefa?')) return
    const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId)
    if (error) { toast.error('Erro ao excluir subtarefa.'); return }

    setTasks(prev => prev.map(task => {
      if (task.id !== taskId) return task
      const updatedSubtasks = task.subtasks.filter(s => s.id !== subtaskId)
      const newTaskStatus = calcTaskStatus(updatedSubtasks)
      supabase.from('tasks').update({ status: newTaskStatus }).eq('id', taskId)
      return { ...task, subtasks: updatedSubtasks, status: newTaskStatus }
    }))
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Deseja realmente excluir esta tarefa?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', taskId)
    if (error) { toast.error('Erro ao excluir tarefa.'); return }
    toast.success('Tarefa excluída.')
    setTasks(prev => prev.filter(t => t.id !== taskId))
    if (expandedTaskId === taskId) setExpandedTaskId(null)
  }

  async function handleArchive(taskId: string, archive: boolean) {
    const { error } = await supabase.from('tasks').update({ archived: archive }).eq('id', taskId)
    if (error) { toast.error('Erro ao arquivar tarefa.'); return }
    toast.success(archive ? 'Tarefa arquivada.' : 'Tarefa restaurada.')
    setTasks(prev => prev.filter(t => t.id !== taskId))
  }

  async function createNextOccurrence(task: TaskWithRelations) {
    const { recurrence_type, recurrence_end_date, due_date } = task
    if (!recurrence_type || recurrence_type === 'none') return

    const base = due_date ? parseISO(due_date) : new Date()
    const next = recurrence_type === 'monthly' ? addMonths(base, 1)
      : recurrence_type === 'biweekly' ? addDays(base, 14)
      : addDays(base, 7)

    if (recurrence_end_date && next > parseISO(recurrence_end_date)) return

    const { data: newTask } = await supabase.from('tasks').insert({
      title: task.title,
      description: task.description,
      sector_id: task.sector_id,
      responsible_id: task.responsible_id,
      due_date: format(next, 'yyyy-MM-dd'),
      priority: task.priority,
      status: 'pending',
      recurrence_type,
      recurrence_end_date: recurrence_end_date ?? null,
    }).select('id').single()

    if (newTask && task.subtasks.length > 0) {
      await supabase.from('subtasks').insert(
        task.subtasks.map(s => ({
          task_id: newTask.id,
          title: s.title,
          responsible_id: s.responsible_id,
          sort_order: s.sort_order,
          status: 'pending',
        }))
      )
    }

    toast.success('🔁 Próxima ocorrência criada automaticamente.')
    fetchTasks()
  }

  function handleEdit(task: TaskWithRelations) { setEditingTask(task); setShowForm(true) }
  function handleCloseForm() { setShowForm(false); setEditingTask(null) }
  function handleToggleExpand(taskId: string) {
    setExpandedTaskId(prev => prev === taskId ? null : taskId)
  }

  const priorityOrder: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
  const filtered = tasks
    .filter(t => {
      if (showMyTasks && currentMemberId) {
        const isMine = t.responsible_id === currentMemberId ||
          t.subtasks.some(s => s.responsible_id === currentMemberId)
        if (!isMine) return false
      }
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

  const selectClass = "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"

  return (
    <div className="space-y-4">
      {/* Header — empilha no mobile */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
            {showArchived ? 'Tarefas Arquivadas' : 'Tarefas'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {filtered.length} tarefa{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Botões: ícone+texto no desktop, só ícone no mobile */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentMemberId && (
            <button
              onClick={() => setShowMyTasks(v => !v)}
              title="Minhas Tarefas"
              className={`flex items-center gap-2 px-3 py-2 font-semibold rounded-lg text-sm transition-colors border ${
                showMyTasks
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 shadow-sm'
              }`}
            >
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Minhas Tarefas</span>
            </button>
          )}
          <button
            onClick={() => setShowArchived(v => !v)}
            title={showArchived ? 'Ver ativas' : 'Arquivadas'}
            className={`flex items-center gap-2 px-3 py-2 font-semibold rounded-lg text-sm transition-colors border ${
              showArchived
                ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 shadow-sm'
            }`}
          >
            <Archive className="w-4 h-4 flex-shrink-0" />
            <span className="hidden sm:inline">{showArchived ? 'Ver ativas' : 'Arquivadas'}</span>
          </button>
          {!showArchived && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Nova Tarefa</span>
              <span className="sm:hidden">Nova</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-600">Filtros</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por título..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select value={filterSector} onChange={e => setFilterSector(e.target.value)} className={selectClass}>
            <option value="">Todos os setores</option>
            {sectors.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
          </select>
          <select value={filterResponsible} onChange={e => setFilterResponsible(e.target.value)} className={selectClass}>
            <option value="">Todos os responsáveis</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectClass}>
              <option value="">Status</option>
              <option value="pending">Pendente</option>
              <option value="in_progress">Em Andamento</option>
              <option value="completed">Concluída</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={selectClass}>
              <option value="">Prioridade</option>
              <option value="urgent">Urgente</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
          <p className="text-slate-500 text-lg font-medium">Nenhuma tarefa encontrada</p>
          <p className="text-slate-400 text-sm mt-1">Tente ajustar os filtros ou crie uma nova tarefa.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              isExpanded={expandedTaskId === task.id}
              onToggleExpand={handleToggleExpand}
              onToggleSubtask={handleToggleSubtask}
              onAddSubtask={handleAddSubtask}
              onEditSubtask={handleEditSubtask}
              onReorderSubtasks={handleReorderSubtasks}
              onDeleteSubtask={handleDeleteSubtask}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onArchive={handleArchive}
              members={members}
              currentMemberId={currentMemberId}
            />
          ))}
        </div>
      )}

      {showForm && (
        <TaskForm task={editingTask} onClose={handleCloseForm} onSaved={fetchTasks} />
      )}
    </div>
  )
}
