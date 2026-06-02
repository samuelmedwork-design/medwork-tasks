'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Loader2, X, Pencil, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import Avatar from '@/components/ui/Avatar'
import type { TeamMemberWithSector, Sector, MemberRole } from '@/lib/types'

interface MemberFormData {
  name: string
  email: string
  password: string
  sector_id: string
  role: MemberRole
}

const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"

export default function MembersPage() {
  const supabase = createClient()
  const [members, setMembers] = useState<TeamMemberWithSector[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMemberWithSector | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [editingAvatarUrl, setEditingAvatarUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<MemberFormData>({ name: '', email: '', password: '', sector_id: '', role: 'member' })

  async function fetchMembers() {
    setLoading(true)
    const { data } = await supabase.from('team_members').select('*, sector:sectors(*)').order('name')
    setMembers((data as TeamMemberWithSector[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMembers()
    supabase.from('sectors').select('*').order('name').then(({ data }) => setSectors(data ?? []))
  }, [])

  function openCreate() {
    setEditingMember(null)
    setForm({ name: '', email: '', password: '', sector_id: '', role: 'member' })
    setShowForm(true)
  }

  function openEdit(member: TeamMemberWithSector) {
    setEditingMember(member)
    setEditingAvatarUrl(member.avatar_url)
    setForm({ name: member.name, email: member.email, password: '', sector_id: member.sector_id ?? '', role: member.role })
    setShowForm(true)
  }

  async function handlePhotoUpload(file: File, memberId: string) {
    setUploadingPhoto(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${memberId}.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (error) { toast.error('Erro ao enviar foto.'); return }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('team_members').update({ avatar_url: data.publicUrl }).eq('id', memberId)
      setEditingAvatarUrl(data.publicUrl)
      toast.success('Foto atualizada.')
      fetchMembers()
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)

    try {
      if (editingMember) {
        // Edit existing member
        const updates: Partial<MemberFormData> = {
          name: form.name.trim(),
          sector_id: form.sector_id || '',
          role: form.role,
        }
        const { error } = await supabase
          .from('team_members')
          .update({ name: updates.name, sector_id: updates.sector_id || null, role: updates.role })
          .eq('id', editingMember.id)
        if (error) throw new Error(error.message)
        toast.success('Membro atualizado.')
      } else {
        // Create new member via API route (needs service role for auth creation)
        if (!form.password) { toast.error('Senha obrigatória para novo membro.'); setSaving(false); return }
        const res = await fetch('/api/admin/create-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.name.trim(), email: form.email.trim(), password: form.password, sector_id: form.sector_id || null, role: form.role }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error ?? 'Erro ao criar membro.')
        toast.success('Membro criado.')
      }
      setShowForm(false)
      fetchMembers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar membro.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Membros</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Gerencie os membros da equipe</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Novo Membro
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 text-slate-400">Nenhum membro cadastrado.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Membro</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Setor</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Perfil</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={member.name} avatarUrl={member.avatar_url} size="md" />
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-500 dark:text-slate-400">{member.email}</td>
                  <td className="px-5 py-3.5">
                    {member.sector ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${member.sector.color}18`, color: member.sector.color, border: `1px solid ${member.sector.color}40` }}>
                        {member.sector.icon} {member.sector.name}
                      </span>
                    ) : <span className="text-slate-300 text-sm">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${member.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                      {member.role === 'admin' ? 'Administrador' : 'Membro'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button onClick={() => openEdit(member)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                      <Pencil className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {editingMember ? 'Editar Membro' : 'Novo Membro'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {editingMember && (
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Avatar name={editingMember.name} avatarUrl={editingAvatarUrl} size="lg" />
                    {uploadingPhoto && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Alterar foto
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file && editingMember) handlePhotoUpload(file, editingMember.id)
                        e.target.value = ''
                      }}
                    />
                    <p className="text-xs text-slate-400 mt-1">PNG, JPG ou WebP</p>
                  </div>
                </div>
              )}
              <div>
                <label className={labelClass}>Nome <span className="text-red-500">*</span></label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" required className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" required disabled={!!editingMember} className={`${inputClass} ${editingMember ? 'opacity-50 cursor-not-allowed' : ''}`} />
                {editingMember && <p className="text-xs text-slate-400 mt-1">O email não pode ser alterado.</p>}
              </div>

              {!editingMember && (
                <div>
                  <label className={labelClass}>Senha <span className="text-red-500">*</span></label>
                  <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" required minLength={6} className={inputClass} />
                </div>
              )}

              <div>
                <label className={labelClass}>Setor</label>
                <select value={form.sector_id} onChange={e => setForm({ ...form, sector_id: e.target.value })} className={inputClass}>
                  <option value="">Selecionar setor</option>
                  {sectors.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Perfil</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as MemberRole })} className={inputClass}>
                  <option value="member">Membro</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingMember ? 'Salvar' : 'Criar Membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
