import nodemailer from 'nodemailer'
import { createAdminClient } from '@/lib/supabase/admin'

export interface EmailConfig {
  id: string
  sender_name: string
  sender_email: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_password: string
  active: boolean
}

export interface NotificationTemplate {
  id: string
  type: string
  name: string
  subject: string
  body: string
  enabled: boolean
  days_before: number
  send_hour: number
}

export async function getEmailConfig(): Promise<EmailConfig | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('email_config').select('*').eq('active', true).single()
  return data
}

export async function getTemplate(type: string): Promise<NotificationTemplate | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('notification_templates').select('*').eq('type', type).eq('enabled', true).single()
  return data
}

export async function getAllTemplates(): Promise<NotificationTemplate[]> {
  const admin = createAdminClient()
  const { data } = await admin.from('notification_templates').select('*').order('type')
  return data ?? []
}

export function renderTemplate(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v ?? ''), text)
}

export async function sendEmail(to: string, subject: string, body: string) {
  const config = await getEmailConfig()
  if (!config) throw new Error('Configuração de e-mail não encontrada.')

  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    secure: config.smtp_port === 465,
    auth: { user: config.smtp_user, pass: config.smtp_password },
  })

  const htmlBody = body
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  await transporter.sendMail({
    from: `"${config.sender_name}" <${config.sender_email}>`,
    to,
    subject,
    text: body,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px">
        <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #e2e8f0">
          <div style="text-align:center;margin-bottom:24px">
            <h2 style="color:#6366f1;margin:0;font-size:20px">MedWork Tasks</h2>
          </div>
          <div style="color:#374151;font-size:15px;line-height:1.6">${htmlBody}</div>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0">
            Este e-mail foi enviado automaticamente pelo MedWork Tasks.<br>Não responda este e-mail.
          </p>
        </div>
      </div>`,
  })
}
