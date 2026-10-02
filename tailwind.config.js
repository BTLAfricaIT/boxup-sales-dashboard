/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f3f9e8',
          100: '#e3f1c6',
          200: '#cbe494',
          300: '#aed65d',
          400: '#97c93a',
          500: '#84b526',
          600: '#6b931d',
          700: '#53711a',
          800: '#455a19',
          900: '#3a4b19',
        },
      },
    },
  },
  plugins: [],
}
