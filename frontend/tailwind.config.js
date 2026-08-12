/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#070B14',
          surface: '#0B1120',
          elevated: '#111827',
        },
        border: {
          subtle: '#1E2A44',
          DEFAULT: '#1E2A44',
          strong: '#2A3A5C',
        },
        brand: {
          blue: '#3B82F6',
          cyan: '#06B6D4',
          emerald: '#10B981',
          red: '#EF4444',
          amber: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0,0,0,0.37)',
        'glow-blue': '0 0 0 1px rgba(59,130,246,0.3), 0 8px 24px -8px rgba(59,130,246,0.35)',
        'glow-emerald': '0 0 0 1px rgba(16,185,129,0.3), 0 8px 24px -8px rgba(16,185,129,0.35)',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
};
