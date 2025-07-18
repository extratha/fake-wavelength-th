import './globals.css'
import type { Metadata } from 'next'

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
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
