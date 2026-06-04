import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cercle MDB — Séminaire Marbella',
  description: 'Coordination des transferts aéroport, 16-18 juin',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
