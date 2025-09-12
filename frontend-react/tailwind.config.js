// tailwind.config.js

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx,css,html}", // ✅ important : inclure aussi .css
  ],
  theme: {
  extend: {
      colors: {
        fondfooter: {
          DEFAULT: "#e52305e4",     // dark mode
          light: "#f4f4f4"        // light mode
        },
    }
  }
},
darkMode: 'class', // 👈 important pour activer dark avec <body class="dark">
  plugins: [],
}
