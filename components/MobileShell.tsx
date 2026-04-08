'use client'

import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

export default function MobileShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const isLogin = pathname === '/' || pathname === '/login'

  useEffect(() => {
    // Redirige vers login si non-authentifié
    try {
      const auth = localStorage.getItem('isAuth') === '1'
      if (!isLogin && !auth) router.push('/')
    } catch (e) {
      if (!isLogin) router.push('/')
    }
  }, [isLogin, pathname, router])

  return (
    <div className="min-h-screen w-full">
      {/* Mobile header - hidden on login */}
      {!isLogin && (
        <header className="md:hidden flex items-center justify-between p-4 bg-white shadow-sm">
          <button onClick={() => setOpen(true)} className="p-2 rounded-md bg-slate-100">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="text-lg font-black">Les Oursins</div>
          </div>
          <div />
        </header>
      )}

      {/* Overlay sidebar for mobile */}
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">
            <Sidebar mobile onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar hidden on login */}
        {!isLogin && <Sidebar />}
        <main className={`flex-1 ${!isLogin ? 'md:ml-72' : ''} p-4 md:p-10`}>
          {children}
        </main>
      </div>
    </div>
  )
}
