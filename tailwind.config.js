/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}


module.exports = {
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0f1117',
        'dark-card': '#1a1d29',
        'green-primary': '#10b981'
      }
    }
  }
}
