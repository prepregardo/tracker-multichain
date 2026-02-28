import type { Metadata } from 'next'
import './globals.css'
import AuthProvider from '@/components/layout/AuthProvider'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

export const metadata: Metadata = {
  title: 'Tracker Multichain',
  description: 'Multi-chain ERC20 & TRC20 asset tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 pl-64">
              <Header />
              <main className="p-6">{children}</main>
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
