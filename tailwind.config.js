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
      }
    },
  },
  plugins: [],
}
