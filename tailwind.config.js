/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sky: {
          50: '#eef9ff', 100: '#d9f1ff', 200: '#b8e6ff', 300: '#86d6ff',
          400: '#4dbfff', 500: '#22a3f5', 600: '#1084d1', 700: '#0e6aab',
          800: '#125a8c', 900: '#144d74',
        },
        leaf: { 500: '#22b566', 600: '#169153' },
        sunny: { 500: '#f9a007', 600: '#dd7a04' },
        bad: { DEFAULT: '#f0473f', light: '#ffe1df' },
        avg: { DEFAULT: '#f9a007', light: '#fff3c4' },
        good: { DEFAULT: '#22b566', light: '#d5f9e2' },
      },
      fontFamily: {
        heading: ['"Baloo 2"', '"Poppins"', 'sans-serif'],
        body: ['"Poppins"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
