'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { TaskWithRelations, Sector, TeamMember, Priority, TaskStatus } from '@/lib/types'

interface SubtaskInput {
  id?: string
  title: string
  responsible_id: string
  sort_order: number
}

interface TaskFormProps {
  task?: TaskWithRelations | null
  onClose: () => void
  onSaved: () => void
}

export default function TaskForm({ task, onClose, onSaved }: TaskFormProps) {
  const supabase = createClient()

  const [sectors, setSectors] = useState<Sector[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(false)

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [sectorId, setSectorId] = useState(task?.sector_id ?? '')
  const [responsibleId, setResponsibleId] = useState(task?.responsible_id ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'pending')
  const [subtasks, setSubtasks] = useState<SubtaskInput[]>(
    task?.subtasks.map((s) => ({
      id: s.id,
      title: s.title,
      responsible_id: s.responsible_id ?? '',
      sort_order: s.sort_order,
    })) ?? []
  )

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: m }] = await Promise.all([
        supabase.from('sectors').select('*').order('name'),
        supabase.from('team_members').select('*').order('name'),
      ])
      setSectors(s ?? [])
      setMembers(m ?? [])
    }
    load()
  }, [])

  function addSubtask() {
    setSubtasks((prev) => [
      ...prev,
      { title: '', responsible_id: '', sort_order: prev.length },
    ])
  }

  function removeSubtask(index: number) {
    setSubtasks((prev) => prev.filter((_, i) => i !== index))
  }

  function updateSubtask(index: number, field: keyof SubtaskInput, value: string) {
    setSubtasks((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)

    try {
      const taskPayload = {
        title: title.trim(),
        description: description.trim() || null,
        sector_id: sectorId || null,
        responsible_id: responsibleId || null,
        due_date: dueDate || null,
        priority,
        status,
        updated_at: new Date().toISOString(),
      }

      let taskId = task?.id

      if (task) {
        const { error } = await supabase
          .from('tasks')
          .update(taskPayload)
          .eq('id', task.id)
        if (error) throw error
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        let createdBy: string | null = null

        if (user) {
          const { data: member } = await supabase
            .from('team_members')
            .select('id')
            .eq('auth_user_id', user.id)
            .single()
          createdBy = member?.id ?? null
        }

        const { data, error } = await supabase
          .from('tasks')
          .insert({ ...taskPayload, created_by: createdBy })
          .select('id')
          .single()
        if (error) throw error
        taskId = data.id
      }

      if (!taskId) throw new Error('Task ID not found')

      // Handle subtasks
      if (task) {
        // Delete removed subtasks
        const existingIds = subtasks.filter((s) => s.id).map((s) => s.id!)
        const { data: currentSubtasks } = await supabase
          .from('subtasks')
          .select('id')
          .eq('task_id', taskId)

        const toDelete = (currentSubtasks ?? [])
          .filter((s) => !existingIds.includes(s.id))
          .map((s) => s.id)

        if (toDelete.length > 0) {
          await supabase.from('subtasks').delete().in('id', toDelete)
        }
      }

      // Upsert subtasks
      for (let i = 0; i < subtasks.length; i++) {
        const s = subtasks[i]
        if (!s.title.trim()) continue

        const subtaskPayload = {
          task_id: taskId,
          title: s.title.trim(),
          responsible_id: s.responsible_id || null,
          sort_order: i,
        }

        if (s.id) {
          await supabase.from('subtasks').update(subtaskPayload).eq('id', s.id)
        } else {
          await supabase.from('subtasks').insert(subtaskPayload)
        }
      }

      // Notificar responsável se foi atribuído (tarefa nova ou responsável mudou)
      if (taskId && responsibleId && responsibleId !== task?.responsible_id) {
        fetch('/api/email/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'task_assigned', taskId }),
        }).catch(() => {})
      }

      toast.success(task ? 'Tarefa atualizada com sucesso!' : 'Tarefa criada com sucesso!')
      onSaved()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar tarefa. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const priorities: { value: Priority; label: string }[] = [
    { value: 'low', label: 'Baixa' },
    { value: 'medium', label: 'Média' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' },
  ]

  const statuses: { value: TaskStatus; label: string }[] = [
    { value: 'pending', label: 'Pendente' },
    { value: 'in_progress', label: 'Em Andamento' },
    { value: 'completed', label: 'Concluída' },
    { value: 'cancelled', label: 'Cancelada' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <h2 className="text-lg font-semibold text-white">
            {task ? 'Editar Tarefa' : 'Nova Tarefa'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Título <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da tarefa"
              required
              className="w-full bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a tarefa..."
              rows={3}
              className="w-full bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Grid: Sector + Responsible */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Setor</label>
              <select
                value={sectorId}
                onChange={(e) => setSectorId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Selecionar setor</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.icon} {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Responsável</label>
              <select
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Selecionar responsável</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid: Due date + Priority + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Data prevista</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-slate-900 border border-slate-600 text-slate-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subtasks */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">Subtarefas</label>
              <button
                type="button"
                onClick={addSubtask}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar subtarefa
              </button>
            </div>

            {subtasks.length === 0 ? (
              <p className="text-sm text-slate-600 italic py-2">Nenhuma subtarefa.</p>
            ) : (
              <div className="space-y-2">
                {subtasks.map((sub, i) => (
                  <div key={i} className="flex items-start gap-2 bg-slate-900/50 rounded-lg p-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={sub.title}
                        onChange={(e) => updateSubtask(i, 'title', e.target.value)}
                        placeholder="Título da subtarefa"
                        className="w-full bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <select
                        value={sub.responsible_id}
                        onChange={(e) => updateSubtask(i, 'responsible_id', e.target.value)}
                        className="w-full bg-slate-800 border border-slate-600 text-slate-300 rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="">Responsável (opcional)</option>
                        {members.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSubtask(i)}
                      className="p-1.5 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {task ? 'Salvar Alterações' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
