import 'server-only'
import { Resend } from 'resend'

// Constructed lazily: `new Resend()` throws without an API key, which would
// break every module importing this one in environments without email.
let resend: Resend | null = null

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://baer524.vercel.app'
  return `${base.replace(/\/$/, '')}${path}`
}

// Body for notification emails, linking to `path` in the app
export function notificationEmailHtml(
  message: string,
  path: string,
  senderMessage?: string | null,
) {
  return `<p>Bær 524: ${message}</p>${senderMessage ? `<p><em>"${senderMessage}"</em></p>` : ''}<p><a href="${appUrl(path)}">Opna í appi</a></p>`
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
