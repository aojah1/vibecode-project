/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        oracle: {
          red:    '#C74634',
          redDark:'#A8372A',
          navy:   '#1A1F3C',
          navyLight: '#2D3461',
          gray:   '#F4F4F4',
          text:   '#333333',
          muted:  '#666666',
          border: '#DDDDDD',
        },
      },
      fontFamily: {
        oracle: ['"Oracle Sans"', 'Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
