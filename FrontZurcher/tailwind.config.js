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
      footer: "#49465a"
    },
    fontFamily: {
        Montserrat: ['Montserrat', 'sans-serif'], // Definir la fuente Nunito
      },
  },
};
export const plugins = [];