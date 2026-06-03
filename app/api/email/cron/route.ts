import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTemplate, renderTemplate, sendEmail } from '@/lib/email'
import { sendPushToMember } from '@/lib/push'
import { parseISO, differenceInDays } from 'date-fns'

const SYSTEM_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://medwork-tasks.vercel.app'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: tasks } = await admin
    .from('tasks')
    .select('*, responsible:team_members!tasks_responsible_id_fkey(*), sector:sectors(*)')
    .in('status', ['pending', 'in_progress'])
    .eq('archived', false)
    .not('responsible_id', 'is', null)
    .not('due_date', 'is', null)

  const results: string[] = []

  for (const task of tasks ?? []) {
    const responsible = task.responsible
    if (!responsible?.email) continue

    const due = parseISO(task.due_date)
    const daysUntil = differenceInDays(due, today)

    // Due soon notification
    if (daysUntil >= 0 && daysUntil <= 2) {
      const tpl = await getTemplate('task_due_soon')
      if (tpl && daysUntil === tpl.days_before) {
        const vars = {
          nome_responsavel: responsible.name,
          titulo_tarefa: task.title,
          setor: task.sector?.name ?? '—',
          data_prevista: due.toLocaleDateString('pt-BR'),
          link_sistema: SYSTEM_URL,
        }
        await Promise.allSettled([
          sendEmail(responsible.email, renderTemplate(tpl.subject, vars), renderTemplate(tpl.body, vars)),
          sendPushToMember(task.responsible_id, { title: '⚠️ Tarefa vence em breve', body: task.title, url: SYSTEM_URL + '/tasks', tag: `due-${task.id}` }),
        ])
        results.push(`due_soon → ${responsible.email}`)
      }
    }

    // Overdue notification
    if (daysUntil < 0) {
      const tpl = await getTemplate('task_overdue')
      if (tpl) {
        const vars = {
          nome_responsavel: responsible.name,
          titulo_tarefa: task.title,
          setor: task.sector?.name ?? '—',
          data_prevista: due.toLocaleDateString('pt-BR'),
          link_sistema: SYSTEM_URL,
        }
        await Promise.allSettled([
          sendEmail(responsible.email, renderTemplate(tpl.subject, vars), renderTemplate(tpl.body, vars)),
          sendPushToMember(task.responsible_id, { title: '🔴 Tarefa atrasada', body: task.title, url: SYSTEM_URL + '/tasks', tag: `overdue-${task.id}` }),
        ])
        results.push(`overdue → ${responsible.email}`)
      }
    }
  }

  return NextResponse.json({ ok: true, sent: results })
}
