/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0f1117',
        'dark-card': '#1a1d29',
        'green-primary': '#10b981'
      },
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
      container: {
        center: true,
        padding: {
          DEFAULT: '1rem',
          sm: '2rem',
          lg: '4rem',
          xl: '5rem',
          '2xl': '6rem',
        },
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
        'full': '100%',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
      },
    }
  },
  plugins: [],
}
