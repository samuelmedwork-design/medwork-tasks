import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import ThemeProvider from '@/components/layout/ThemeProvider'
import PwaSetup from '@/components/layout/PwaSetup'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'MedWork Tasks',
  description: 'Sistema de controle de tarefas da equipe MedWork',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MW Tasks',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6366f1',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full`}>
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full antialiased">
        <ThemeProvider>
          {children}
          <PwaSetup />
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
