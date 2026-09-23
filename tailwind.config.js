/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---------------------------------------------------------------
        // The palette shifted after seeing the real photography.
        //
        // The first pass was rustic and earthy, aimed at folk craft. These
        // garments are couture — studio-lit gowns with hand-threaded gold.
        // So the base is a cooler, cleaner bone rather than a warm oatmeal,
        // giving the photographs a gallery wall to hang on instead of
        // competing with them.
        //
        // Colour is deliberately scarce. On a page with a full-bleed
        // photograph, the palette's job is to disappear.
        // ---------------------------------------------------------------

        // Near-white grounds. Cool enough to read as a gallery, warm enough
        // not to look clinical against undyed cotton.
        bone: {
          50: '#FDFCFA',
          100: '#F9F7F3',
          200: '#F1EDE6',
          300: '#E4DDD2',
          400: '#CFC5B6',
          500: '#B0A392',
        },
        // Warm near-black for text. Pure black looks cheap against bone and
        // crushes the shadow detail in the photographs.
        ink: {
          300: '#8C8478',
          400: '#6E665B',
          500: '#524B42',
          700: '#2E2A25',
          900: '#17140F',
        },
        // Single accent, drawn from the deep red in tibeb weaving. Used for
        // actions and almost nothing else.
        clay: {
          50: '#FAF1ED',
          100: '#F0DACF',
          200: '#DDB29C',
          300: '#C4846A',
          400: '#A85E42',
          500: '#8A4530',
          600: '#6D3524',
          700: '#4F261A',
        },
        // The gold thread. Reserved for bridal and for small marks of
        // quality — never as a background.
        gold: {
          100: '#F5EAD2',
          200: '#E8D3A4',
          300: '#D4B571',
          400: '#B8954A',
          500: '#8F7234',
        },
        // Quiet green for success and confirmation states only.
        sage: {
          100: '#E3E8E0',
          300: '#9DAE97',
          500: '#5C6F57',
          700: '#37432F',
        },
      },
      fontFamily: {
        // A high-contrast serif for display sizes carries the couture
        // register; the interface stays in a neutral sans so it never
        // competes for attention.
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        // Display sizes run larger and tighter than the default ramp —
        // editorial pages need headlines that behave like headlines.
        'display-sm': ['2.25rem', { lineHeight: '1.1', letterSpacing: '-0.015em' }],
        'display-md': ['3rem', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'display-lg': ['4rem', { lineHeight: '1', letterSpacing: '-0.025em' }],
        'display-xl': ['5.5rem', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
      },
      letterSpacing: {
        eyebrow: '0.22em',
      },
      maxWidth: {
        content: '1320px',
        prose: '68ch',
      },
      boxShadow: {
        // Shadows stay almost invisible. On a gallery wall, cards do not
        // float.
        subtle: '0 1px 2px rgba(23,20,15,0.03), 0 6px 20px -14px rgba(23,20,15,0.10)',
        lift: '0 2px 6px rgba(23,20,15,0.05), 0 20px 48px -20px rgba(23,20,15,0.16)',
      },
      opacity: {
        6: '0.06', 8: '0.08', 12: '0.12', 15: '0.15', 35: '0.35',
        45: '0.45', 55: '0.55', 65: '0.65', 85: '0.85', 92: '0.92', 97: '0.97',
      },
      transitionTimingFunction: {
        editorial: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      animation: {
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fadeIn 0.5s ease-out both',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
