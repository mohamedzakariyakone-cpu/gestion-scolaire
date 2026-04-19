import './globals.css'
import MobileShell from '@/components/MobileShell'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = {
  title: 'ECOLE-PRO | Gestion Administrative',
  description: 'Interface de gestion moderne',

};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${inter.variable} font-sans`}>
      <body className="bg-[#F8FAFC] text-slate-900 antialiased">
        <MobileShell>
          {children}
        </MobileShell>
      </body>
    </html>
  )
}