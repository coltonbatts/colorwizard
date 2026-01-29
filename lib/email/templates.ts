/**
 * Email Templates for ColorWizard
 */

export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

/**
 * Welcome email for new signups
 */
export function getWelcomeEmail(userName: string): EmailTemplate {
  return {
    subject: 'Welcome to ColorWizard!',
    html: `
      <h1>Welcome to ColorWizard!</h1>
      <p>Hi ${userName},</p>
      <p>We're excited to have you on board. ColorWizard is your personal color palette generator and analysis tool for designers.</p>
      
      <h2>Get Started</h2>
      <ul>
        <li>Generate unlimited color palettes</li>
        <li>Export to JSON and CSV formats</li>
        <li>Analyze colors with advanced filters</li>
      </ul>
      
      <h2>Upgrade to Pro</h2>
      <p>Ready for more? Unlock Pro features like AI palette suggestions, Figma exports, and team collaboration for just $9/month.</p>
      <a href="https://color-wizard.app/pricing" style="background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        Explore Pro Features
      </a>
      
      <p>Best regards,<br/>The ColorWizard Team</p>
    `,
    text: `
Welcome to ColorWizard!

Hi ${userName},

We're excited to have you on board. ColorWizard is your personal color palette generator and analysis tool for designers.

Get Started:
- Generate unlimited color palettes
- Export to JSON and CSV formats
- Analyze colors with advanced filters

Upgrade to Pro:
Ready for more? Unlock Pro features like AI palette suggestions, Figma exports, and team collaboration for just $9/month.

Visit: https://color-wizard.app/pricing

Best regards,
The ColorWizard Team
    `.trim(),
  }
}

/**
 * Upgrade confirmation email
 */
export function getUpgradeConfirmationEmail(userName: string, planName: string): EmailTemplate {
  return {
    subject: 'Upgrade Confirmation - ColorWizard Pro',
    html: `
      <h1>🎉 Welcome to ColorWizard Pro!</h1>
      <p>Hi ${userName},</p>
      <p>Thank you for upgrading! Your subscription is now active.</p>
      
      <h2>Your Plan</h2>
      <p><strong>${planName}</strong></p>
      
      <h2>What's New</h2>
      <ul>
        <li>✓ AI palette suggestions based on color harmony</li>
        <li>✓ Advanced exports (Figma, Adobe, Framer)</li>
        <li>✓ Team collaboration & sharing</li>
        <li>✓ Advanced filters & presets</li>
        <li>✓ Priority support</li>
      </ul>
      
      <h2>Manage Your Subscription</h2>
      <p>You can manage your subscription anytime from your account settings.</p>
      <a href="https://color-wizard.app/account/subscription" style="background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        Manage Subscription
      </a>
      
      <p>If you have any questions, feel free to reach out!</p>
      <p>Best regards,<br/>The ColorWizard Team</p>
    `,
    text: `
🎉 Welcome to ColorWizard Pro!

Hi ${userName},

Thank you for upgrading! Your subscription is now active.

Your Plan: ${planName}

What's New:
✓ AI palette suggestions based on color harmony
✓ Advanced exports (Figma, Adobe, Framer)
✓ Team collaboration & sharing
✓ Advanced filters & presets
✓ Priority support

Manage Your Subscription:
You can manage your subscription anytime from your account settings.
https://color-wizard.app/account/subscription

If you have any questions, feel free to reach out!

Best regards,
The ColorWizard Team
    `.trim(),
  }
}

/**
 * Cancellation confirmation email
 */
export function getCancellationEmail(userName: string): EmailTemplate {
  return {
    subject: 'Subscription Canceled - ColorWizard',
    html: `
      <h1>We're Sorry to See You Go</h1>
      <p>Hi ${userName},</p>
      <p>Your ColorWizard Pro subscription has been canceled. You've been downgraded to the Free plan effective immediately.</p>
      
      <h2>What Happens Now</h2>
      <p>You'll still have access to all Free tier features:</p>
      <ul>
        <li>Unlimited palette generation</li>
        <li>Basic color exports (JSON, CSV)</li>
        <li>Standard filters</li>
      </ul>
      
      <h2>Come Back Anytime</h2>
      <p>If you'd like to reactivate your Pro subscription, you can do so at any time:</p>
      <a href="https://color-wizard.app/pricing" style="background-color: #2563eb; color: white; padding: 10px 20px; border-radius: 4px; text-decoration: none;">
        Upgrade Again
      </a>
      
      <p>We'd love to hear why you're leaving. Your feedback helps us improve!</p>
      <p>Best regards,<br/>The ColorWizard Team</p>
    `,
    text: `
We're Sorry to See You Go

Hi ${userName},

Your ColorWizard Pro subscription has been canceled. You've been downgraded to the Free plan effective immediately.

What Happens Now:
You'll still have access to all Free tier features:
- Unlimited palette generation
- Basic color exports (JSON, CSV)
- Standard filters

Come Back Anytime:
If you'd like to reactivate your Pro subscription, you can do so at any time:
https://color-wizard.app/pricing

We'd love to hear why you're leaving. Your feedback helps us improve!

Best regards,
The ColorWizard Team
    `.trim(),
  }
}

/**
 * Invoice/Receipt email
 */
export function getInvoiceEmail(
  userName: string,
  amount: string,
  planName: string,
  nextBillingDate: string
): EmailTemplate {
  return {
    subject: `Receipt - ColorWizard Pro (${planName})`,
    html: `
      <h1>Your ColorWizard Pro Receipt</h1>
      <p>Hi ${userName},</p>
      
      <h2>Invoice Details</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Plan</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${planName}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Amount</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${amount}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Next Billing Date</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${nextBillingDate}</td>
        </tr>
      </table>
      
      <p>Thank you for your subscription!</p>
      <p>Best regards,<br/>The ColorWizard Team</p>
    `,
    text: `
Your ColorWizard Pro Receipt

Hi ${userName},

Invoice Details:
Plan: ${planName}
Amount: ${amount}
Next Billing Date: ${nextBillingDate}

Thank you for your subscription!

Best regards,
The ColorWizard Team
    `.trim(),
  }
}
