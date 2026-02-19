/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#e8ecf3',
          100: '#c5cfe0',
          200: '#9eafca',
          300: '#778fb4',
          400: '#5977a4',
          500: '#3b5f94',
          600: '#2f4e7c',
          700: '#1B365D',
          800: '#152a4a',
          900: '#0f1e37',
        },
        burnt: {
          50: '#fef3ec',
          100: '#fce0cc',
          200: '#f9c199',
          300: '#f5a266',
          400: '#d9742b',
          500: '#BF5700',
          600: '#a64b00',
          700: '#8c3f00',
          800: '#733300',
          900: '#592800',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
