/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          base:     '#0e0b0a',   // Aurora shell — warm near-black
          surface:  '#161210',   // TopBar, panels on other screens
          elevated: '#1e1812',   // Cards, Settings rows
          hover:    '#252018',   // Hover state
        },
        text: {
          primary:   '#ffffff',
          secondary: '#aaaaaa',
          tertiary:  '#666666',
          muted:     '#444444',
        },
        // Aurora amber accent
        accent: {
          DEFAULT: '#E8B567',
          dark:    '#C9A063',
          text:    '#1a1008',    // text on accent bg
        },
        live:    '#E24B4A',
        warning: '#F4A261',
        border: {
          subtle:  'rgba(255,255,255,0.05)',
          DEFAULT: 'rgba(255,255,255,0.10)',
          focus:   '#E8B567',
        },
      },
      fontSize: {
        display: ['48px', { lineHeight: '56px', fontWeight: '300' }],
        h1:      ['32px', { lineHeight: '40px', fontWeight: '300' }],
        h2:      ['24px', { lineHeight: '32px', fontWeight: '400' }],
        body:    ['20px', { lineHeight: '28px', fontWeight: '400' }],
        small:   ['16px', { lineHeight: '22px', fontWeight: '400' }],
        tiny:    ['14px', { lineHeight: '18px', fontWeight: '400' }],
      },
      fontFamily: {
        sans:  ['"Outfit"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        serif: ['"Newsreader"', '"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      boxShadow: {
        // Aurora preview pane amber glow
        'aurora-preview': '0 30px 80px -30px rgba(232,181,103,0.25)',
        // Amber dot glow
        'amber-glow':  '0 0 8px #E8B567',
        // Left accent bar glow
        'accent-bar':  '0 0 12px #E8B567',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px) translateX(-50%)' },
          '100%': { opacity: '1', transform: 'translateY(0) translateX(-50%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
      },
    },
  },
  plugins: [],
}
