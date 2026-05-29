'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Sector } from '@/lib/types'

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#3b82f6', '#64748b',
]

interface SectorFormData {
  name: string
  color: string
  icon: string
}

export default function SectorsPage() {
  const supabase = createClient()
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingSector, setEditingSector] = useState<Sector | null>(null)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<SectorFormData>({ name: '', color: '#6366f1', icon: '🏢' })

  async function fetchSectors() {
    setLoading(true)
    const { data } = await supabase.from('sectors').select('*').order('name')
    setSectors(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchSectors() }, [])

  function openCreate() {
    setEditingSector(null)
    setForm({ name: '', color: '#6366f1', icon: '🏢' })
    setShowForm(true)
  }

  function openEdit(sector: Sector) {
    setEditingSector(sector)
    setForm({ name: sector.name, color: sector.color, icon: sector.icon })
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este setor? Tarefas vinculadas ficarão sem setor.')) return
    const { error } = await supabase.from('sectors').delete().eq('id', id)
    if (error) { toast.error('Erro ao excluir setor.'); return }
    toast.success('Setor excluído.')
    fetchSectors()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)

    try {
      if (editingSector) {
        const { error } = await supabase
          .from('sectors')
          .update({ name: form.name.trim(), color: form.color, icon: form.icon })
          .eq('id', editingSector.id)
        if (error) throw error
        toast.success('Setor atualizado!')
      } else {
        const { error } = await supabase
          .from('sectors')
          .insert({ name: form.name.trim(), color: form.color, icon: form.icon })
        if (error) throw error
        toast.success('Setor criado!')
      }
      setShowForm(false)
      fetchSectors()
    } catch {
      toast.error('Erro ao salvar setor.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Setores</h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie os setores da equipe</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Setor
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : sectors.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Nenhum setor cadastrado.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Cor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ícone</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Nome</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((sector) => (
                <tr key={sector.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div
                      className="w-5 h-5 rounded-full"
                      style={{ backgroundColor: sector.color }}
                    />
                  </td>
                  <td className="px-5 py-3.5 text-xl">{sector.icon}</td>
                  <td className="px-5 py-3.5 text-sm font-medium text-slate-200">{sector.name}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => openEdit(sector)}
                        className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sector.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">
                {editingSector ? 'Editar Setor' : 'Novo Setor'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nome <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome do setor"
                  required
                  className="w-full bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Ícone (emoji)</label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  placeholder="🏢"
                  className="w-full bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Cor</label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      className="w-8 h-8 rounded-full transition-transform hover:scale-110 ring-offset-slate-800"
                      style={{
                        backgroundColor: color,
                        outline: form.color === color ? `3px solid ${color}` : 'none',
                        outlineOffset: '2px',
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: form.color }} />
                  <input
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="#6366f1"
                    className="flex-1 bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingSector ? 'Salvar' : 'Criar Setor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
