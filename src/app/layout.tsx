import { UserProfileProvider } from '@/context/UserProfileContext';
import './globals.css'
import type { Metadata } from 'next'
import { IBM_Plex_Sans_Thai, Mitr } from 'next/font/google';

// เนื้อความ: อ่านง่าย (ใช้เฉพาะน้ำหนักที่มีในหน้าเว็บ ลดขนาดที่ต้องโหลด)
const ibmPlexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-body',
});

// หัวข้อ / ปุ่ม / รหัสห้อง: ตัวกลมมน ให้อารมณ์เกมสนุก ๆ
const mitr = Mitr({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-display',
});
export const metadata: Metadata = {
  title: 'Fake Wavelength Th ',
  description: 'This inspired from Wavelength boardgame.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${ibmPlexThai.variable} ${mitr.variable} font-sans`} suppressHydrationWarning>
        <UserProfileProvider>
          {children}
        </UserProfileProvider>
      </body>
    </html>
  )
}
