import { UserProfileProvider } from '@/context/UserProfileContext';
import './globals.css'
import type { Metadata } from 'next'
import { IBM_Plex_Sans_Thai } from 'next/font/google';

const ibmPlexThai = IBM_Plex_Sans_Thai({
  subsets: ['thai'],
  weight: ['100', '300', '400', '500', '600', '700'],
  display: 'swap',
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
    <html lang="en" suppressHydrationWarning>
      <body className={ibmPlexThai.className} suppressHydrationWarning>
        <UserProfileProvider>
          {children}
        </UserProfileProvider>
      </body>
    </html>
  )
}
