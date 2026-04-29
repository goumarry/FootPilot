/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        // Surfaces
        surface: {
          DEFAULT: 'rgba(30,41,59,0.6)',   // slate-800/60
          raised: 'rgba(51,65,85,0.5)',     // slate-700/50
          overlay: 'rgba(15,23,42,0.85)',   // slate-950/85
        },
        // Accent violet
        accent: {
          DEFAULT: '#7C3AED',
          light: '#8B5CF6',
          dim: 'rgba(124,58,237,0.25)',
          glow: 'rgba(139,92,246,0.35)',
        },
        // Status
        success: { DEFAULT: '#10B981', dim: 'rgba(16,185,129,0.15)' },
        danger:  { DEFAULT: '#EF4444', dim: 'rgba(239,68,68,0.15)'  },
        warning: { DEFAULT: '#F59E0B', dim: 'rgba(245,158,11,0.15)' },
        info:    { DEFAULT: '#3B82F6', dim: 'rgba(59,130,246,0.15)' },
      },
      borderColor: {
        subtle: 'rgba(148,163,184,0.1)',
        DEFAULT: 'rgba(148,163,184,0.15)',
        strong: 'rgba(148,163,184,0.25)',
      },
      boxShadow: {
        card:   '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-lg': '0 4px 24px rgba(0,0,0,0.5)',
        glow:   '0 0 24px rgba(139,92,246,0.3)',
        'glow-sm': '0 0 12px rgba(139,92,246,0.2)',
      },
      backdropBlur: {
        xs: '4px',
      },
    },
  },
  plugins: [],
};
