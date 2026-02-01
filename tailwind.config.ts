import type { Config } from 'tailwindcss'

/**
 * ColorWizard — Editorial Modernism for Tools
 * Tailwind Configuration
 *
 * Color System:
 * - paper: Warm, print-like backgrounds
 * - ink: Typography and lines
 * - signal: Primary actions (red, used sparingly)
 * - subsignal: Utility/informational (blue-gray)
 */

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Paper tones — Warm, print-like backgrounds
        paper: {
          DEFAULT: '#F2F0E9',
          elevated: '#FAFAF7',
          recessed: '#E8E6DF',
        },
        // Ink tones — Typography and rules
        ink: {
          DEFAULT: '#1A1A1A',
          secondary: 'rgba(26, 26, 26, 0.7)',
          muted: 'rgba(26, 26, 26, 0.5)',
          faint: 'rgba(26, 26, 26, 0.25)',
          hairline: 'rgba(26, 26, 26, 0.1)',
        },
        // Signal — Primary action color (used sparingly)
        signal: {
          DEFAULT: '#C82319',
          hover: '#A81D15',
          muted: 'rgba(200, 35, 25, 0.15)',
        },
        // Subsignal — Utility/informational
        subsignal: {
          DEFAULT: '#566D7B',
          hover: '#455A66',
          muted: 'rgba(86, 109, 123, 0.15)',
        },
        // Legacy studio colors (mapped to new system for backwards compatibility)
        studio: {
          DEFAULT: '#1A1A1A',
          secondary: 'rgba(26, 26, 26, 0.7)',
          muted: 'rgba(26, 26, 26, 0.5)',
          dim: 'rgba(26, 26, 26, 0.25)',
          accent: '#C82319',
        },
      },
      fontFamily: {
        ui: ['Helvetica Neue', 'Helvetica', '-apple-system', 'Arial', 'sans-serif'],
        display: ['EB Garamond', 'Georgia', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
        wordmark: ['EB Garamond', 'Georgia', 'Times New Roman', 'serif'],
      },
      fontSize: {
        'xs': ['0.6875rem', { lineHeight: '1.5' }],    // 11px
        'sm': ['0.8125rem', { lineHeight: '1.5' }],    // 13px
        'base': ['0.9375rem', { lineHeight: '1.5' }],  // 15px
        'lg': ['1.125rem', { lineHeight: '1.4' }],     // 18px
        'xl': ['1.375rem', { lineHeight: '1.3' }],     // 22px
        '2xl': ['1.75rem', { lineHeight: '1.25' }],    // 28px
        '3xl': ['2.25rem', { lineHeight: '1.2' }],     // 36px
      },
      letterSpacing: {
        tight: '-0.02em',
        normal: '0',
        wide: '0.05em',
        caps: '0.1em',
      },
      borderRadius: {
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '104': '26rem',
        '112': '28rem',
        '128': '32rem',
      },
      boxShadow: {
        'sm': '0 1px 3px rgba(26, 26, 26, 0.04)',
        'md': '0 4px 12px rgba(26, 26, 26, 0.06)',
        'lg': '0 8px 24px rgba(26, 26, 26, 0.08)',
      },
      transitionDuration: {
        'fast': '120ms',
        'normal': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'indeterminate-progress': 'indeterminate-progress 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'indeterminate-progress': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
        'fadeIn': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
