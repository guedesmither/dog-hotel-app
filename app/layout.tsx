import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import Providers from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AU-Ê Petcare - Creche & Hotel para Cães',
  description: 'Sistema de gerenciamento da AU-Ê Petcare',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
