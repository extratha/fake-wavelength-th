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
        teamB: '#EA5B6F',

        // ---------- Design system (Claymorphism) ----------
        // พื้นการ์ดและขอบ ไล่โทนจาก darkBrown เดิม
        surface: '#5c4334',
        surfaceDeep: '#3d2b22',
        clayEdge: '#2e1f18',
        // ตัวอักษรเข้มสำหรับวางบนสีสว่าง (contrast ≥ 4.5:1 บน mediumBrown)
        ink: '#2b1d16',
        // ตัวอักษรรอง บนพื้น surface (contrast 5.3:1)
        muted: '#d9c3a5',
        // สีทีมแบบสว่างขึ้น สำหรับ "ตัวอักษร" บนพื้นเข้ม (teamB เดิมได้แค่ 2.7:1 บน surface)
        teamAText: '#9fd2f5',
        teamBText: '#ffa3b0',
      },
      fontFamily: {
        // ตั้งค่าใน src/app/layout.tsx ผ่าน next/font
        display: ['var(--font-display)', 'sans-serif'],
        sans: ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: {
        clay: '1.25rem',
      },
      boxShadow: {
        // เงาแบบดินน้ำมัน: เงาทึบด้านล่าง (ดูนูน) + ไฮไลต์จาง ๆ ด้านบน
        clay: '0 6px 0 #2e1f18, inset 0 2px 0 rgba(255, 255, 255, 0.08)',
        'clay-sm': '0 4px 0 #2e1f18, inset 0 2px 0 rgba(255, 255, 255, 0.12)',
        'clay-pressed': '0 1px 0 #2e1f18, inset 0 2px 0 rgba(255, 255, 255, 0.12)',
      },
    },
  },
  plugins: [],
}
