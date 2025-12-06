/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'agrimart-dark': '#014421',
        'agrimart-green': '#28a745',
        'agrimart-light': '#f3f3f3',
      },
      fontFamily: {
        sans: ['\'Segoe UI\'', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

