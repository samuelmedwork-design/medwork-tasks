'use client'

import { useState, useEffect } from 'react'
import { Loader2, Save, Send, Mail, Bell, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { EmailConfig, NotificationTemplate } from '@/lib/email'

const inputClass = "w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"

const VARIABLES: Record<string, { vars: string[]; desc: string }> = {
  task_assigned: {
    desc: 'Enviado imediatamente quando uma tarefa é atribuída.',
    vars: ['nome_responsavel', 'titulo_tarefa', 'setor', 'prioridade', 'data_prevista', 'descricao', 'link_sistema'],
  },
  task_due_soon: {
    desc: 'Enviado X dias antes do vencimento (configurável).',
    vars: ['nome_responsavel', 'titulo_tarefa', 'setor', 'data_prevista', 'link_sistema'],
  },
  task_overdue: {
    desc: 'Enviado diariamente para tarefas atrasadas.',
    vars: ['nome_responsavel', 'titulo_tarefa', 'setor', 'data_prevista', 'link_sistema'],
  },
  comment_mention: {
    desc: 'Enviado quando alguém é mencionado com @nome em comentário.',
    vars: ['nome_mencionado', 'autor', 'titulo_tarefa', 'comentario', 'link_sistema'],
  },
}

function TemplateEditor({
  tpl,
  onSave,
  onToggle,
}: {
  tpl: NotificationTemplate
  onSave: (t: NotificationTemplate) => void
  onToggle: (id: string, enabled: boolean) => void
}) {
  const [local, setLocal] = useState(tpl)
  const [editing, setEditing] = useState(false)
  const meta = VARIABLES[tpl.type]

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${local.enabled ? 'bg-green-500' : 'bg-slate-300'}`} />
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-white">{local.name}</p>
            <p className="text-xs text-slate-400">{meta?.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { onToggle(tpl.id, !local.enabled); setLocal(p => ({ ...p, enabled: !p.enabled })) }}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
              local.enabled ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            {local.enabled ? '✓ Ativo' : 'Inativo'}
          </button>
          <button
            onClick={() => setEditing(v => !v)}
            className="text-xs px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 font-medium transition-colors"
          >
            {editing ? 'Cancelar' : 'Editar'}
          </button>
        </div>
      </div>

      {editing && (
        <div className="px-5 py-4 space-y-4">
          {tpl.type === 'task_due_soon' && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg">
              <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">Avisar</span>
              <input
                type="number" min={1} max={30} value={local.days_before}
                onChange={e => setLocal(p => ({ ...p, days_before: Number(e.target.value) }))}
                className="w-16 text-center bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-md px-2 py-1 text-sm"
              />
              <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">dia(s) antes do vencimento, às</span>
              <input
                type="number" min={0} max={23} value={local.send_hour}
                onChange={e => setLocal(p => ({ ...p, send_hour: Number(e.target.value) }))}
                className="w-16 text-center bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-md px-2 py-1 text-sm"
              />
              <span className="text-sm text-amber-700 dark:text-amber-400 font-medium">h (Brasília)</span>
            </div>
          )}

          <div>
            <label className={labelClass}>Assunto</label>
            <input value={local.subject} onChange={e => setLocal(p => ({ ...p, subject: e.target.value }))} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Corpo do e-mail</label>
            <textarea
              value={local.body}
              onChange={e => setLocal(p => ({ ...p, body: e.target.value }))}
              rows={8}
              className={`${inputClass} resize-none font-mono text-xs`}
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Variáveis disponíveis:</p>
            <div className="flex flex-wrap gap-1.5">
              {meta?.vars.map(v => (
                <code key={v} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded font-mono">
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => { onSave(local); setEditing(false) }}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Salvar template
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const supabase = createClient()
  const [config, setConfig] = useState<EmailConfig>({
    id: '', sender_name: 'MedWork Tasks', sender_email: '', smtp_host: 'smtp.gmail.com',
    smtp_port: 587, smtp_user: '', smtp_password: '', active: true,
  })
  const [templates, setTemplates] = useState<NotificationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'email' | 'templates'>('email')

  useEffect(() => {
    async function load() {
      const [{ data: cfg }, { data: tpls }] = await Promise.all([
        supabase.from('email_config').select('*').eq('active', true).maybeSingle(),
        supabase.from('notification_templates').select('*').order('type'),
      ])
      if (cfg) setConfig(cfg as EmailConfig)
      setTemplates((tpls as NotificationTemplate[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function saveConfig() {
    setSavingConfig(true)
    if (config.id) {
      await supabase.from('email_config').update(config).eq('id', config.id)
    } else {
      const { data } = await supabase.from('email_config').insert(config).select().single()
      if (data) setConfig(data as EmailConfig)
    }
    setSavingConfig(false)
    toast.success('Configurações salvas!')
  }

  async function testEmail() {
    setTestingEmail(true)
    const res = await fetch('/api/email/test', { method: 'POST' })
    const data = await res.json()
    if (res.ok) toast.success('E-mail de teste enviado! Verifique a caixa de entrada.')
    else toast.error(`Erro: ${data.error}`)
    setTestingEmail(false)
  }

  async function saveTemplate(tpl: NotificationTemplate) {
    await supabase.from('notification_templates').update({
      subject: tpl.subject, body: tpl.body, enabled: tpl.enabled,
      days_before: tpl.days_before, send_hour: tpl.send_hour,
    }).eq('id', tpl.id)
    setTemplates(prev => prev.map(t => t.id === tpl.id ? tpl : t))
    toast.success('Template salvo!')
  }

  async function toggleTemplate(id: string, enabled: boolean) {
    await supabase.from('notification_templates').update({ enabled }).eq('id', id)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-indigo-500 animate-spin" /></div>

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">E-mail e notificações automáticas do sistema</p>
      </div>

      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
        {[{ key: 'email', label: 'E-mail', icon: Mail }, { key: 'templates', label: 'Notificações', icon: Bell }].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as 'email' | 'templates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {activeTab === 'email' && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm space-y-5">
          <h2 className="font-semibold text-slate-800 dark:text-white">Configuração SMTP</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Nome do remetente</label>
              <input value={config.sender_name} onChange={e => setConfig(p => ({ ...p, sender_name: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>E-mail do remetente</label>
              <input type="email" value={config.sender_email} onChange={e => setConfig(p => ({ ...p, sender_email: e.target.value }))} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Servidor SMTP</label>
              <input value={config.smtp_host} onChange={e => setConfig(p => ({ ...p, smtp_host: e.target.value }))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Porta</label>
              <input type="number" value={config.smtp_port} onChange={e => setConfig(p => ({ ...p, smtp_port: Number(e.target.value) }))} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>Usuário SMTP</label>
            <input value={config.smtp_user} onChange={e => setConfig(p => ({ ...p, smtp_user: e.target.value }))} className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Senha de App</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={config.smtp_password}
                onChange={e => setConfig(p => ({ ...p, smtp_password: e.target.value }))}
                className={`${inputClass} pr-10`}
                placeholder="Senha de app do Gmail (16 caracteres)"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1">Para Gmail: acesse <strong>myaccount.google.com/apppasswords</strong> e gere uma senha de app.</p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={testEmail}
              disabled={testingEmail}
              className="flex items-center gap-2 px-4 py-2 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {testingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar e-mail de teste
            </button>
            <button
              onClick={saveConfig}
              disabled={savingConfig}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-sm transition-colors disabled:opacity-60 shadow-sm"
            >
              {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar configurações
            </button>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="space-y-4">
          {templates.map(tpl => (
            <TemplateEditor key={tpl.id} tpl={tpl} onSave={saveTemplate} onToggle={toggleTemplate} />
          ))}
        </div>
      )}
    </div>
  )
}
