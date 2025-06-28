/** @type {import('tailwindcss').Config} */
export const content = [
  "./index.html",
  "./src/**/*.{js,ts,jsx,tsx}",
];
export const theme = {
  extend: {
    darkMode: 'selector',
    colors: {
      boton: "#636363",
      secondary: "#6b7280",
      customBlue: "#445868",
      customRed: "#6b4946",
      customGreen: "#0f766e",
      customYellow: "#7c775f",
      customPurple: "#0f766e",
      customPink: "#059669",
      textWhite: "white",
      footer: "#49465a",
      dash:"#f6d02c",
      gray: {
        750: '#374151',
        850: '#1f2937',
      }
    },
    zIndex: {
      '60': '60',
      '70': '70',
    },
    animation: {
      'blink-soft': 'blink-soft 1.5s linear infinite',
    },
    keyframes: {
      'blink-soft': {
        '0%, 100%': { opacity: 1 },
        '50%': { opacity: 0.3 },
      }
    },
    fontFamily: {
      varela: ['"Varela Round"', 'sans-serif'],  
      Montserrat: ['Montserrat', 'sans-serif'],
      nunito: [ 'Nunito Sans', 'sans-serif'] // Definir la fuente Nunito
      },
  },
};
export const plugins = [];