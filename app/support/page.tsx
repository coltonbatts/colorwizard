/**
 * Support Page
 * Help, FAQ, and support contact information
 */

import Link from 'next/link'

export const metadata = {
  title: 'Support - ColorWizard',
  description: 'Get help with ColorWizard Pro features and billing',
}

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Support Center</h1>
          <p className="text-xl text-gray-600">Get help with ColorWizard Pro</p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Billing & Upgrades */}
          <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-blue-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">💳 Billing & Upgrades</h2>
            <p className="text-gray-600 mb-6">
              Questions about your $1 lifetime Pro upgrade or billing?
            </p>
            <div className="space-y-3">
              <details className="group cursor-pointer">
                <summary className="font-semibold text-gray-900 group-open:text-blue-600 transition-colors">
                  How do I upgrade to Pro?
                </summary>
                <p className="mt-2 text-gray-600 text-sm">
                  Click the "Upgrade to Pro" button in the header, select the Pro tier, and complete the $1 checkout. You'll get lifetime access to all Pro features.
                </p>
              </details>

              <details className="group cursor-pointer">
                <summary className="font-semibold text-gray-900 group-open:text-blue-600 transition-colors">
                  Is this a subscription?
                </summary>
                <p className="mt-2 text-gray-600 text-sm">
                  No! It's a one-time $1 payment. Once you upgrade, you have Pro access forever—no recurring charges.
                </p>
              </details>

              <details className="group cursor-pointer">
                <summary className="font-semibold text-gray-900 group-open:text-blue-600 transition-colors">
                  Can I get a refund?
                </summary>
                <p className="mt-2 text-gray-600 text-sm">
                  Yes. If you're not satisfied within 7 days of purchase, we'll refund your $1. Just reach out to support.
                </p>
              </details>

              <details className="group cursor-pointer">
                <summary className="font-semibold text-gray-900 group-open:text-blue-600 transition-colors">
                  My purchase didn't sync. What do I do?
                </summary>
                <p className="mt-2 text-gray-600 text-sm">
                  Go to the pricing page and click "Restore Purchase" to manually sync your entitlement. This re-checks your purchase status with our server.
                </p>
              </details>
            </div>
          </div>

          {/* Pro Features */}
          <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-emerald-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">✨ Pro Features</h2>
            <p className="text-gray-600 mb-6">
              What's included with ColorWizard Pro?
            </p>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">⭐</span>
                <span><strong>AI Palette Suggestions</strong> - Get smart color recommendations</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">⭐</span>
                <span><strong>Team Collaboration</strong> - Share palettes and projects with others</span>
              </li>
              <li className="flex gap-3">
                <span className="text-blue-600 font-bold">⭐</span>
                <span><strong>Advanced Presets & Workflows</strong> - Save and load custom workflows</span>
              </li>
              <li className="flex gap-3">
                <span className="text-emerald-600 font-bold">✓</span>
                <span><strong>Plus everything from Free</strong> - All core tools and features</span>
              </li>
            </ul>
          </div>

          {/* Technical Help */}
          <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-purple-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🛠️ Technical Help</h2>
            <p className="text-gray-600 mb-6">
              Troubleshooting and technical questions.
            </p>
            <div className="space-y-3">
              <details className="group cursor-pointer">
                <summary className="font-semibold text-gray-900 group-open:text-blue-600 transition-colors">
                  The app is slow. How can I speed it up?
                </summary>
                <p className="mt-2 text-gray-600 text-sm">
                  Try: (1) Clear your browser cache, (2) Close other tabs, (3) Try a different browser. Contact support if the issue persists.
                </p>
              </details>

              <details className="group cursor-pointer">
                <summary className="font-semibold text-gray-900 group-open:text-blue-600 transition-colors">
                  Why is my image not loading?
                </summary>
                <p className="mt-2 text-gray-600 text-sm">
                  Make sure your image file is (1) under 50MB, (2) a supported format (JPG, PNG, WebP), and (3) uploaded fully. Try re-uploading or a different file.
                </p>
              </details>

              <details className="group cursor-pointer">
                <summary className="font-semibold text-gray-900 group-open:text-blue-600 transition-colors">
                  How do I clear my calibration?
                </summary>
                <p className="mt-2 text-gray-600 text-sm">
                  Click the calibration icon in the toolbar, then click "Reset Calibration" to return to factory defaults.
                </p>
              </details>
            </div>
          </div>

          {/* Account & Privacy */}
          <div className="bg-white rounded-xl shadow-md p-8 border-l-4 border-orange-500">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">👤 Account & Privacy</h2>
            <p className="text-gray-600 mb-6">
              Account, privacy, and data questions.
            </p>
            <div className="space-y-3">
              <details className="group cursor-pointer">
                <summary className="font-semibold text-gray-900 group-open:text-blue-600 transition-colors">
                  How do I delete my account?
                </summary>
                <p className="mt-2 text-gray-600 text-sm">
                  Contact support at support@color-wizard.app with your email. We'll delete all your data within 7 days.
                </p>
              </details>

              <details className="group cursor-pointer">
                <summary className="font-semibold text-gray-900 group-open:text-blue-600 transition-colors">
                  Is my data private?
                </summary>
                <p className="mt-2 text-gray-600 text-sm">
                  Yes. Your images and palettes are stored securely and never shared. See our privacy policy for details.
                </p>
              </details>

              <details className="group cursor-pointer">
                <summary className="font-semibold text-gray-900 group-open:text-blue-600 transition-colors">
                  Can I export my palettes?
                </summary>
                <p className="mt-2 text-gray-600 text-sm">
                  Yes! Go to Pinned Colors in the sidebar and click "Export" to download as JSON. You can re-import later.
                </p>
              </details>
            </div>
          </div>
        </div>

        {/* Contact Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">📧 Contact Support</h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Email Support */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Email Support</h3>
              <p className="text-gray-600 mb-4">
                For account issues, refunds, or general questions:
              </p>
              <a
                href="mailto:support@color-wizard.app?subject=ColorWizard%20Support%20Request"
                className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
              >
                ✉️ Email Support
              </a>
              <p className="text-sm text-gray-500 mt-3">
                Response time: 24-48 hours
              </p>
            </div>

            {/* Stripe Help */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Billing Questions</h3>
              <p className="text-gray-600 mb-4">
                For payment method, refund, or checkout issues:
              </p>
              <a
                href="https://support.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                💳 Stripe Billing Help
              </a>
              <p className="text-sm text-gray-500 mt-3">
                Our payment partner
              </p>
            </div>
          </div>
        </div>

        {/* Back to App */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
          >
            ← Back to ColorWizard
          </Link>
        </div>
      </div>
    </div>
  )
}
