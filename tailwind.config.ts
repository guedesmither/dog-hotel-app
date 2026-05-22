import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal:      '#7FC8CC',
          tealLight: '#D4F0F2',
          tealDark:  '#4AA8AE',
          purple:    '#4D2075',
          purpleLight:'#7B4FA6',
          pink:      '#E87FA8',
          orange:    '#F07050',
          green:     '#7CC040',
        },
        amber: {
          '50':  '#EAF7F8',
          '100': '#C8ECF0',
          '200': '#A0D8DE',
          '300': '#7FC8CC',
          '400': '#5BB8BE',
          '500': '#4AA8AE',
          '600': '#3D9298',
          '700': '#4D2075',
          '800': '#3B1758',
          '900': '#2A0F40',
          '950': '#1A0828',
        },
      },
      keyframes: {
        'paw-float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(-10deg)', opacity: '0.15' },
          '50%':      { transform: 'translateY(-8px) rotate(5deg)',  opacity: '0.25' },
        },
        'bone-spin': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pop-in': {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        'slide-down': {
          '0%':   { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'paw-float':  'paw-float 4s ease-in-out infinite',
        'paw-float2': 'paw-float 6s ease-in-out infinite 1.5s',
        'paw-float3': 'paw-float 5s ease-in-out infinite 3s',
        'pop-in':     'pop-in 0.3s ease-out',
        'slide-down': 'slide-down 0.2s ease-out',
        shimmer:      'shimmer 2.5s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
