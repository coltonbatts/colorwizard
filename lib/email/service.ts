/**
 * Email Service for ColorWizard
 * Supports Resend or SendGrid
 */

import type { EmailTemplate } from './templates'

type EmailProvider = 'resend' | 'sendgrid' | 'test'

function getProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY) return 'resend'
  if (process.env.SENDGRID_API_KEY) return 'sendgrid'
  return 'test' // For development
}

interface SendEmailParams {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  from?: string
}

/**
 * Send email via Resend
 */
async function sendViaResend(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: params.from || 'noreply@color-wizard.app',
        to: params.to,
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Send email via SendGrid
 */
async function sendViaSendGrid(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: [{ email: params.to }],
            subject: params.subject,
          },
        ],
        from: {
          email: params.from || 'noreply@color-wizard.app',
        },
        content: [
          {
            type: 'text/plain',
            value: params.text,
          },
          {
            type: 'text/html',
            value: params.html,
          },
        ],
        reply_to: params.replyTo ? { email: params.replyTo } : undefined,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Test email (logs to console)
 */
async function sendViaTest(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  console.log('📧 [TEST EMAIL]')
  console.log(`To: ${params.to}`)
  console.log(`Subject: ${params.subject}`)
  console.log(`Body:\n${params.html}`)
  return { success: true }
}

/**
 * Send an email using the configured provider
 */
export async function sendEmail(
  to: string,
  template: EmailTemplate
): Promise<{ success: boolean; error?: string }> {
  const provider = getProvider()

  const params: SendEmailParams = {
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  }

  switch (provider) {
    case 'resend':
      return sendViaResend(params)
    case 'sendgrid':
      return sendViaSendGrid(params)
    case 'test':
      return sendViaTest(params)
    default:
      return { success: false, error: 'No email provider configured' }
  }
}
