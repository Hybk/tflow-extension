/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#3A86FF",
        secondary: "#F0F7FF",
        danger: "#e74c3c",
      },
      textColor: {
        primary: "#F0F7FF",
        secondary: "#FFFFFF",
        danger: "#e74c3c",
      },
      borderColor: {
        primary: "#3A86FF",
      },
      fontFamily: {
        sans: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};
