/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B1220',
        card: '#111827',
        card2: '#161f31',
        line: '#1E293B',
        primary: '#A3E635',
        ink: '#F8FAFC',
        sub: '#94A3B8',
        danger: '#EF4444',
        warn: '#F59E0B',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'] },
      boxShadow: {
        card: '0 1px 0 0 rgba(148,163,184,0.06), 0 8px 24px -12px rgba(0,0,0,0.55)',
        glow: '0 0 24px -6px rgba(163,230,53,0.35)',
      },
      keyframes: {
        pulseDot: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
        floatY: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        spinSlow: { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        pulseDot: 'pulseDot 1.6s ease-in-out infinite',
        floatY: 'floatY 5s ease-in-out infinite',
        shimmer: 'shimmer 1.4s linear infinite',
        fadeUp: 'fadeUp .45s ease both',
        spinSlow: 'spinSlow 8s linear infinite',
      },
    },
  },
  plugins: [],
};
