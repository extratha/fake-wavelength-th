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
        lightBrown: '#fae2bdff',
        mediumYellow: '#eec68aff',

        playerHover: '#2b211cff',

        teamA: '#77BEF0',
        teamB: '#EA5B6F'
      },
    },
  },
  plugins: [],
}
