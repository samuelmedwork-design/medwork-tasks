'use client'

import { useState, useEffect } from 'react'
import { Plus, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { getInitials } from '@/lib/utils'
import type { TeamMemberWithSector, Sector, MemberRole } from '@/lib/types'

interface MemberFormData {
  name: string
  email: string
  password: string
  sector_id: string
  role: MemberRole
}

export default function MembersPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<TeamMemberWithSector[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<MemberFormData>({
    name: '',
    email: '',
    password: '',
    sector_id: '',
    role: 'member',
  })

  async function fetchMembers() {
    setLoading(true)
    const { data } = await supabase
      .from('team_members')
      .select('*, sector:sectors(*)')
      .order('name')
    setMembers((data as TeamMemberWithSector[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMembers()
    supabase.from('sectors').select('*').order('name').then(({ data }) => setSectors(data ?? []))
  }, [])

  function openCreate() {
    setForm({ name: '', email: '', password: '', sector_id: '', role: 'member' })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password) return
    setSaving(true)

    try {
      // Use service role via API route to create user
      const res = await fetch('/api/admin/create-member', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          sector_id: form.sector_id || null,
          role: form.role,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Erro ao criar membro.')

      toast.success('Membro criado com sucesso!')
      setShowForm(false)
      fetchMembers()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao criar membro.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  // Avatar color based on name
  const avatarColors = [
    'bg-indigo-700', 'bg-purple-700', 'bg-pink-700',
    'bg-blue-700', 'bg-teal-700', 'bg-emerald-700',
  ]
  function getAvatarColor(name: string) {
    const index = name.charCodeAt(0) % avatarColors.length
    return avatarColors[index]
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Membros</h1>
          <p className="text-slate-400 text-sm mt-1">Gerencie os membros da equipe</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Membro
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 text-slate-500">Nenhum membro cadastrado.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-900/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Membro</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Setor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Perfil</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full ${getAvatarColor(member.name)} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                        {getInitials(member.name)}
                      </div>
                      <span className="text-sm font-medium text-slate-200">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-400">{member.email}</td>
                  <td className="px-5 py-3.5">
                    {member.sector ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${member.sector.color}20`,
                          color: member.sector.color,
                          border: `1px solid ${member.sector.color}40`,
                        }}
                      >
                        <span>{member.sector.icon}</span>
                        {member.sector.name}
                      </span>
                    ) : (
                      <span className="text-slate-600 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                        member.role === 'admin'
                          ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-600/30'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {member.role === 'admin' ? 'Administrador' : 'Membro'}
                    </span>
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
              <h2 className="text-lg font-semibold text-white">Novo Membro</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Nome <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nome completo"
                  required
                  className="w-full bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  required
                  className="w-full bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Senha <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Setor</label>
                <select
                  value={form.sector_id}
                  onChange={(e) => setForm({ ...form, sector_id: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecionar setor</option>
                  {sectors.map((s) => (
                    <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Perfil</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as MemberRole })}
                  className="w-full bg-slate-900 border border-slate-600 text-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="member">Membro</option>
                  <option value="admin">Administrador</option>
                </select>
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
                  Criar Membro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
