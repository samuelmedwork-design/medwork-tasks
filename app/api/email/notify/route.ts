import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTemplate, renderTemplate, sendEmail } from '@/lib/email'
import { sendPushToMember } from '@/lib/push'

const SYSTEM_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://medwork-tasks.vercel.app'

export async function POST(request: Request) {
  const { type, taskId, mentionedMemberId, commentContent, authorName } = await request.json()
  const admin = createAdminClient()

  if (type === 'task_assigned') {
    const { data: task } = await admin
      .from('tasks')
      .select('*, responsible:team_members!tasks_responsible_id_fkey(*), sector:sectors(*)')
      .eq('id', taskId).single()

    if (!task?.responsible) return NextResponse.json({ ok: true })

    const tpl = await getTemplate('task_assigned')
    if (!tpl) return NextResponse.json({ ok: true })

    const priorityMap: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente' }
    const vars = {
      nome_responsavel: task.responsible.name,
      titulo_tarefa: task.title,
      setor: task.sector?.name ?? '—',
      prioridade: priorityMap[task.priority] ?? task.priority,
      data_prevista: task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Não definida',
      descricao: task.description ?? '',
      link_sistema: SYSTEM_URL,
    }

    // E-mail + Push em paralelo
    await Promise.allSettled([
      task.responsible.email
        ? sendEmail(task.responsible.email, renderTemplate(tpl.subject, vars), renderTemplate(tpl.body, vars))
        : Promise.resolve(),
      sendPushToMember(task.responsible.id, {
        title: '📋 Nova tarefa atribuída',
        body: task.title,
        url: `${SYSTEM_URL}/tasks`,
        tag: `task-${taskId}`,
      }),
    ])
  }

  if (type === 'comment_mention' && mentionedMemberId) {
    const { data: mentioned } = await admin
      .from('team_members').select('id,name,email').eq('id', mentionedMemberId).single()
    if (!mentioned) return NextResponse.json({ ok: true })

    const { data: task } = await admin.from('tasks').select('title,id').eq('id', taskId).single()
    const tpl = await getTemplate('comment_mention')
    if (!tpl) return NextResponse.json({ ok: true })

    const vars = {
      nome_mencionado: mentioned.name,
      autor: authorName,
      titulo_tarefa: task?.title ?? '',
      comentario: commentContent ?? '',
      link_sistema: SYSTEM_URL,
    }

    await Promise.allSettled([
      mentioned.email
        ? sendEmail(mentioned.email, renderTemplate(tpl.subject, vars), renderTemplate(tpl.body, vars))
        : Promise.resolve(),
      sendPushToMember(mentioned.id, {
        title: `💬 ${authorName} mencionou você`,
        body: commentContent ?? '',
        url: `${SYSTEM_URL}/tasks`,
        tag: `mention-${taskId}`,
      }),
    ])
  }

  return NextResponse.json({ ok: true })
}
