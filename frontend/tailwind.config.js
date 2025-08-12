/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'blue-gradient-start': '#6366F1',
        'blue-gradient-end': '#4F46E5',
        'primary': '#6366F1',
        'primary-dark': '#4F46E5',
        'accent': '#8B5CF6',
        'soft-blue': '#E0E7FF',
        'soft-indigo': '#EEF2FF',
      },
      backgroundImage: {
        'blue-gradient': 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
        'soft-gradient': 'linear-gradient(135deg, #F8FAFC 0%, #E0E7FF 50%, #EEF2FF 100%)',
      },
    },
  },
  plugins: [],
}