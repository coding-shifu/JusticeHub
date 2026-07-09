import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JusticeHub — Legal Practice Management',
  description:
    'JusticeHub helps small law firms manage cases, documents, and client communication in one shared system.',
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
