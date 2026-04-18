'use client'; 

import Link from 'next/link';
import { usePathname } from 'next/navigation'; 
import { LayoutDashboard, School, Users, GraduationCap, Wallet, Settings, LogOut, Notebook, NotebookTabs ,  } from 'lucide-react';
import { Graduate, Grandstander } from 'next/font/google';
import { report } from 'process';

type SidebarProps = { mobile?: boolean, onClose?: () => void };

const Sidebar = ({ mobile = false, onClose }: SidebarProps) => {
  const pathname = usePathname(); 

  const menuItems = [
    { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
    { name: 'Classes', href: '/classes', icon: School },
    { name: 'Élèves', href: '/students', icon: Users },
    { name: 'Professeurs', href: '/teachers', icon: GraduationCap },
    { name: 'Comptabilité', href: '/finance', icon: Wallet },
    {name : 'bulletins', href: '/bulletins', icon: NotebookTabs },
    {name : 'performance', href: '/performance', icon: Notebook },
    { name: 'Paramètres', href: '/admin/settings', icon: Settings }// Ajouté ici pour la cohérence
    
    
  ];

  const base = mobile
    ? 'fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-green-100 via-green-50 to-white backdrop-blur-xl text-gray-800 p-6 flex flex-col border-r border-green-200 shadow-2xl z-50 transform transition-transform'
    : 'hidden md:flex w-72 h-screen bg-gradient-to-b from-green-100 via-green-50 to-white backdrop-blur-xl text-gray-800 fixed left-0 top-0 p-8 flex flex-col border-r border-green-200 shadow-2xl shadow-green-100/50 z-50 rounded-r-[3rem]';

  return (
    <div className={base}>
      {mobile && (
        <div className="flex items-center justify-between mb-4">
          <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl text-white font-black">O</div>
          <button onClick={onClose} className="text-slate-600 p-2 rounded-md bg-white/50">Fermer</button>
        </div>
      )}
      
      {/* Logo & Header */}
      <div className="mb-16 flex items-center gap-4 px-3">
        <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-xl shadow-green-500/30 ring-2 ring-green-500/20">
          <span className="font-black text-2xl text-white">O</span>
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900 leading-tight whitespace-nowrap">
            Les<span className="text-transparent bg-gradient-to-r from-green-500 to-green-600 bg-clip-text"> Oursins</span>
          </h1>
          <p className="text-xs text-gray-600 font-semibold tracking-wider">administrateur</p>
        </div>
      </div>
      
      {/* Navigation Principale */}
      <nav className="space-y-3 flex-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`group relative flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 font-semibold text-sm overflow-hidden
                ${isActive 
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 scale-105' 
                  : 'text-gray-600 hover:bg-gradient-to-r hover:from-green-200 hover:to-green-100 hover:text-gray-800 hover:shadow-md hover:shadow-green-200/20 hover:scale-102'
                }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-green-500/20 rounded-2xl animate-pulse"></div>
              )}
              
              <item.icon size={22} className={`relative z-10 transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-green-500 group-hover:scale-110'}`} />
              <span className="relative z-10">{item.name}</span>
              
              {isActive && (
                <div className="relative z-10 ml-auto flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Section Bas */}
      <div className="border-t border-green-300/50 pt-8 mt-8 space-y-3">
          {/* Version simplifiée en bas si nécessaire, sinon on peut le supprimer car il est déjà dans menuItems */}
          <button className="w-full group flex items-center gap-4 px-5 py-4 rounded-2xl text-red-500 hover:bg-gradient-to-r hover:from-red-100 hover:to-red-50 hover:text-red-600 text-sm font-semibold transition-all duration-300 hover:scale-102">
            <LogOut size={22} className="group-hover:scale-110 transition-all duration-300" />
            <span>Déconnexion</span>
          </button>
      </div>
    </div>
  );
};

export default Sidebar;