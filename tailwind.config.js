/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Undyed handspun cotton — the base the whole site sits on.
        cotton: {
          50: '#FDFBF7',
          100: '#FAF6EE',
          200: '#F2EBDD',
          300: '#E6DAC4',
          400: '#D4C3A5',
          500: '#BCA784',
        },
        // Clay/rust, drawn from the dominant red in tibeb weaving.
        clay: {
          50: '#FBF2EF',
          100: '#F4DED6',
          200: '#E5B8A8',
          300: '#D18D75',
          400: '#B96A4E',
          500: '#9C4F35',
          600: '#7E3C27',
          700: '#5E2B1B',
        },
        // Muted ochre — the gold thread, never bright yellow.
        gold: {
          100: '#F7EBCB',
          200: '#EBD59B',
          300: '#D9B85F',
          400: '#BF9A3C',
          500: '#9A7A28',
        },
        // Deep green from the darker tibeb bands.
        forest: {
          100: '#DDE6DC',
          300: '#8FA68C',
          500: '#4A6148',
          700: '#2C3B2B',
        },
        // Warm near-black for text. Pure black looks cheap against cotton.
        ink: {
          400: '#7A7268',
          500: '#5A534A',
          700: '#332F2A',
          900: '#1C1916',
        },
      },
      fontFamily: {
        // Serif for headings carries the heritage weight; sans keeps the
        // interface legible on a cheap Android screen.
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: { content: '1280px' },
      // Tailwind's default opacity scale jumps in fives; these hairline values
      // are what keep borders on a cotton background from reading as grey lines.
      opacity: {
        8: '0.08', 12: '0.12', 15: '0.15', 35: '0.35', 45: '0.45',
        55: '0.55', 65: '0.65', 85: '0.85', 92: '0.92', 97: '0.97',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(28,25,22,0.04), 0 8px 24px -12px rgba(28,25,22,0.12)',
        lift: '0 2px 4px rgba(28,25,22,0.06), 0 16px 40px -16px rgba(28,25,22,0.20)',
      },
      animation: { 'fade-up': 'fadeUp 0.5s ease-out both' },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
