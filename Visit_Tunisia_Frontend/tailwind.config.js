/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        background: '#FAF3E8',
        foreground: '#2C2C2C',
        card: '#ffffff',
        'card-foreground': '#2C2C2C',
        primary: {
          DEFAULT: '#1B6FA8',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#7EC8E3',
          foreground: '#1B6FA8',
        },
        muted: {
          DEFAULT: '#EDE5D6',
          foreground: '#6B6B6B',
        },
        accent: {
          DEFAULT: '#E0A458',
          foreground: '#2C2C2C',
        },
        border: '#e5e7eb',
        destructive: {
          DEFAULT: '#d4183d',
          foreground: '#ffffff',
        },
        terracotta: '#D97D45',
        olive: '#6B8E4E',
        purple: '#8B6FB5',
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
