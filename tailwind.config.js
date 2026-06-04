/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Palette officielle Le Cercle MDB
        navy: {
          DEFAULT: '#0C1023',
          mid: '#111530',
          surface: '#161B41',
        },
        gold: {
          DEFAULT: '#B8923E',
          light: '#C9A24E',
          bright: '#D4AF5A',
        },
        cream: {
          DEFAULT: '#F5F0E8',
          dark: '#EBE4D6',
        },
        ink: {
          DEFAULT: '#1a1a2e',
          muted: '#5a5a72',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-montserrat)', 'var(--font-inter)', 'sans-serif'],
      },
      backgroundImage: {
        'cream-gradient': 'radial-gradient(1200px 600px at 50% -10%, #FBF8F2 0%, #F5F0E8 45%, #EFE7D8 100%)',
        'gold-gradient': 'linear-gradient(135deg, #D4AF5A 0%, #B8923E 55%, #A07A2E 100%)',
        'navy-gradient': 'linear-gradient(135deg, #0C1023 0%, #111530 55%, #161B41 100%)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(12,16,35,.04), 0 8px 24px -12px rgba(12,16,35,.12)',
        'card-hover': '0 2px 4px rgba(12,16,35,.06), 0 18px 40px -16px rgba(184,146,62,.35)',
        gold: '0 8px 24px -10px rgba(184,146,62,.55)',
        header: '0 24px 60px -24px rgba(12,16,35,.55)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s cubic-bezier(.16,1,.3,1) both',
        'fade-in': 'fade-in .6s ease both',
      },
    },
  },
  plugins: [],
}
