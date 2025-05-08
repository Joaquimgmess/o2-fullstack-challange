/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Garante que arquivos dentro de src sejam escaneados
  ],
  theme: {
    extend: {
      // Você pode adicionar suas personalizações de tema aqui depois
    },
  },
  plugins: [],
};
