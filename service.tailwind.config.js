/** Tailwind scan scope for service landing pages only */
export default {
  content: [
    './src/pages/ServicePage.tsx',
    './src/components/services/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#111827',
          light: '#1F2937',
        },
        secondary: {
          DEFAULT: '#C5A880',
          light: '#D4B895',
          dark: '#A3875E',
          readable: '#6B5535',
        },
        surface: {
          DEFAULT: '#F9FAFB',
          alt: '#F3F4F6',
          dark: '#E5E7EB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
      },
      boxShadow: {
        premium: '0 10px 30px -10px rgba(0, 0, 0, 0.05)',
        'premium-hover': '0 20px 40px -10px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};
