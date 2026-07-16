import type { Config } from 'tailwindcss'

/** ColorWizard 2027 — chromatic instrument tokens. */

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
        paper: {
          shell: 'var(--paper-shell)',
          DEFAULT: 'var(--paper)',
          elevated: 'var(--paper-elevated)',
          recessed: 'var(--paper-recessed)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          secondary: 'var(--ink-secondary)',
          muted: 'var(--ink-muted)',
          faint: 'var(--ink-faint)',
          hairline: 'var(--ink-hairline)',
        },
        signal: {
          DEFAULT: 'var(--signal)',
          hover: 'var(--signal-hover)',
          muted: 'var(--signal-muted)',
        },
        subsignal: {
          DEFAULT: 'var(--subsignal)',
          hover: 'var(--subsignal-hover)',
          muted: 'var(--subsignal-muted)',
        },
        graphite: {
          DEFAULT: 'var(--graphite)',
          muted: 'var(--graphite-muted)',
        },
        linen: {
          DEFAULT: 'var(--linen)',
          strong: 'var(--linen-strong)',
        },
        studio: {
          DEFAULT: 'var(--ink)',
          secondary: 'var(--ink-secondary)',
          muted: 'var(--ink-muted)',
          dim: 'var(--ink-faint)',
          accent: 'var(--signal)',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk Variable', 'Helvetica Neue', 'sans-serif'],
        ui: ['Space Grotesk Variable', 'Helvetica Neue', 'sans-serif'],
        display: ['Space Grotesk Variable', 'Helvetica Neue', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'Consolas', 'monospace'],
        wordmark: ['Space Grotesk Variable', 'Helvetica Neue', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],       // 12px
        'sm': ['0.875rem', { lineHeight: '1.5' }],      // 14px
        'base': ['1rem', { lineHeight: '1.55' }],       // 16px
        'lg': ['1.1875rem', { lineHeight: '1.45' }],    // 19px
        'xl': ['1.5rem', { lineHeight: '1.3' }],        // 24px
        '2xl': ['2rem', { lineHeight: '1.2' }],         // 32px
        '3xl': ['2.75rem', { lineHeight: '1.08' }],     // 44px
      },
      letterSpacing: {
        tight: '-0.04em',
        normal: '0',
        wide: '0.05em',
        caps: '0.1em',
      },
      borderRadius: {
        'sm': '2px',
        'md': '4px',
        'lg': '6px',
        'xl': '8px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '104': '26rem',
        '112': '28rem',
        '128': '32rem',
      },
      boxShadow: {
        'sm': '0 1px 0 rgba(255, 255, 255, 0.035)',
        'md': '0 18px 48px rgba(0, 0, 0, 0.32)',
        'lg': '0 26px 80px rgba(0, 0, 0, 0.48)',
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
