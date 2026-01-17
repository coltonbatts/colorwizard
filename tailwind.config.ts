import type { Config } from 'tailwindcss'

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
        studio: {
          DEFAULT: '#1d1d1f',
          secondary: 'rgba(29, 29, 31, 0.7)',
          muted: 'rgba(29, 29, 31, 0.5)',
          dim: 'rgba(29, 29, 31, 1)', // Increased opacity for better contrast
          accent: '#0071e3',
        }
      }
    },
  },
  plugins: [],
}
export default config
