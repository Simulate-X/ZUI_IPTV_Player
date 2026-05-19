/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0e0e12',
          surface: '#16161c',
          elevated: '#1c1c24',
          hover: '#22222c',
        },
        text: {
          primary: '#ffffff',
          secondary: '#aaaaaa',
          tertiary: '#666666',
          muted: '#444444',
        },
        accent: {
          DEFAULT: '#3DDC97',
          dark: '#2BA876',
          text: '#032618',
        },
        live: '#E24B4A',
        warning: '#F4A261',
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          DEFAULT: 'rgba(255,255,255,0.12)',
          focus: '#3DDC97',
        },
      },
      fontSize: {
        display: ['48px', { lineHeight: '56px', fontWeight: '500' }],
        h1: ['32px', { lineHeight: '40px', fontWeight: '500' }],
        h2: ['24px', { lineHeight: '32px', fontWeight: '500' }],
        body: ['20px', { lineHeight: '28px', fontWeight: '400' }],
        small: ['16px', { lineHeight: '22px', fontWeight: '400' }],
        tiny: ['14px', { lineHeight: '18px', fontWeight: '400' }],
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
