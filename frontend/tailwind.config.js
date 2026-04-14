/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2E86C1',
          light: '#5BA3D0',
          dark: '#1A5276',
        },
        accent: {
          DEFAULT: '#27AE60',
          light: '#52BE80',
          dark: '#1E8449',
        },
        dark: {
          DEFAULT: '#1A1A1A',
          secondary: '#2D2D2D',
        },
        light: {
          DEFAULT: '#F8F9FA',
          secondary: '#E9ECEF',
        },
        gray: {
          DEFAULT: '#6C757D',
          light: '#ADADAD',
        },
        error: '#E74C3C',
        warning: '#F39C12',
        success: '#27AE60',
        info: '#3498DB',
      },
      fontFamily: {
        primary: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'Fira Sans',
          'Droid Sans',
          'Helvetica Neue',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}
