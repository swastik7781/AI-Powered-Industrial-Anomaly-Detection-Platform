/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        industrial: {
          900: '#0F1115',
          800: '#16191E',
          700: '#23272F',
          600: '#343B45',
        },
        accent: {
          500: '#3B82F6',
          400: '#60A5FA',
        },
        danger: {
          500: '#EF4444',
          900: '#7F1D1D'
        },
        success: {
          500: '#10B981',
          900: '#064E3B'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
