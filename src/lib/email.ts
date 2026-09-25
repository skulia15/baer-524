import 'server-only'
import { Resend } from 'resend'

// Constructed lazily: `new Resend()` throws without an API key, which would
// break every module importing this one in environments without email.
let resend: Resend | null = null

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://baer524.vercel.app'
  return `${base.replace(/\/$/, '')}${path}`
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])

// Body for notification emails, linking to `path` in the app.
// `message` and `senderMessage` may contain user input (decline reasons, notes).
export function notificationEmailHtml(
  message: string,
  path: string,
  senderMessage?: string | null,
) {
  const note = senderMessage ? `<p><em>"${escapeHtml(senderMessage)}"</em></p>` : ''
  return `<p>Bær 524: ${escapeHtml(message)}</p>${note}<p><a href="${escapeHtml(appUrl(path))}">Opna í appi</a></p>`
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return
  resend ??= new Resend(process.env.RESEND_API_KEY)
  await resend.emails
    .send({
      from: process.env.EMAIL_FROM ?? 'Bær 524 <noreply@baer524.is>',
      to,
      subject,
      html,
    })
    .catch((err) => console.error('[email] send failed:', err))
}
