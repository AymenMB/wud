/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,html}",
    "./src/pages/**/*.{html,js}",
    "./src/components/**/*.{html,js}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      },
      colors: {
        'wud-primary': '#4A3B31',     // Brun foncé (noyer)
        'wud-secondary': '#A07C5B',   // Brun moyen (chêne clair)
        'wud-accent': '#D4A373',      // Brun doré clair (érable, pin)
        'wud-light': '#F0EFEB',       // Fond très clair, presque blanc cassé (lin)
        'wud-dark': '#2C231E',        // Brun très foncé, presque noir (ébène)
        'wud-gray': {
          DEFAULT: '#CBD5E1', // text-wud-gray (slate-300)
          light: '#E2E8F0',   // bg-wud-gray-light (slate-200)
          dark: '#475569',    // text-wud-gray-dark (slate-600)
        }
      },
    },
  },
  plugins: [],
}
