/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#111827', // Deep slate / almost black
          light: '#1F2937',
        },
        secondary: {
          DEFAULT: '#C5A880', // Premium gold/bronze
          light: '#D4B895',
          dark: '#A3875E',
        },
        surface: {
          DEFAULT: '#F9FAFB', // Off-white
          alt: '#F3F4F6',
          dark: '#E5E7EB',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
      boxShadow: {
        'premium': '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
        'premium-hover': '0 20px 40px -10px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
};