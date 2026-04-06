/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core palette
        deep: {
          900: '#021024',
          800: '#031B35',
          700: '#052659',
        },
        steel: {
          500: '#5483B3',
          400: '#7DA0CA',
          300: '#C1E8FF',
        },
        // Glass surface colors
        glass: {
          dark: 'rgba(2, 16, 36, 0.5)',
          mid: 'rgba(5, 38, 89, 0.3)',
          light: 'rgba(84, 131, 179, 0.1)',
          accent: 'rgba(125, 160, 202, 0.15)',
        },
        // Semantic accent colors (kept for scan results & alerts)
        neon: {
          cyan: '#C1E8FF',
          blue: '#7DA0CA',
          purple: '#5483B3',
          pink: '#FF6B8A',
        }
      },
      backdropBlur: {
        xs: '2px',
        glass: '16px',
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(2, 16, 36, 0.5)',
        'glass-sm': '0 4px 16px 0 rgba(2, 16, 36, 0.3)',
        'glass-lg': '0 16px 64px 0 rgba(2, 16, 36, 0.6)',
        'glow': '0 0 25px rgba(84, 131, 179, 0.2)',
        'glow-lg': '0 0 50px rgba(84, 131, 179, 0.3)',
      },
      borderColor: {
        glass: 'rgba(84, 131, 179, 0.2)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(135deg, rgba(5, 38, 89, 0.4) 0%, rgba(2, 16, 36, 0.6) 100%)',
        'accent-gradient': 'linear-gradient(135deg, #C1E8FF 0%, #7DA0CA 50%, #5483B3 100%)',
      }
    },
  },
  plugins: [],
}