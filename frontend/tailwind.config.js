/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#F7F9FC',
          surface: '#FFFFFF',
          elevated: '#FFFFFF',
        },
        border: {
          subtle: '#E2E8F0',
          DEFAULT: '#E2E8F0',
          strong: '#CBD5E1',
        },
        brand: {
          blue: '#2563EB',
          cyan: '#0891B2',
          emerald: '#059669',
          red: '#DC2626',
          amber: '#D97706',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glass: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.05)',
        'glow-blue': '0 1px 2px rgba(37, 99, 235, 0.18), 0 8px 20px -10px rgba(37, 99, 235, 0.35)',
        'glow-emerald': '0 1px 2px rgba(5, 150, 105, 0.18), 0 8px 20px -10px rgba(5, 150, 105, 0.3)',
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
