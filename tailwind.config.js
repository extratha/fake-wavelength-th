/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx}", 
    "./pages/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {
      colors: {
        darkBrown: '#4b352a',
        mediumBrown: '#ca7842',
        darkBlue: '#2cd9cf',
        lightYellow: '#f0f2bd',
        mediumYellow: '#eec68aff',

        playerHover: '#2b211cff',
      },
    },
  },
  plugins: [],
}
