import 'server-only'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.RESEND_API_KEY) return
  await resend.emails
    .send({
      from: process.env.EMAIL_FROM ?? 'Bær 524 <noreply@baer524.is>',
      to,
      subject,
      html,
    })
    .catch(() => {})
}
