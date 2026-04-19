'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation'; 
import { LayoutDashboard, School, Users, GraduationCap, Wallet, Settings, LogOut, Notebook, NotebookTabs, X, Ruler, ChartLine } from 'lucide-react';
import { GraphHelpers } from 'next/dist/compiled/webpack/webpack';
import { scale } from 'pdf-lib';

type SidebarProps = { mobile?: boolean; floating?: boolean; onClose?: () => void };

const Sidebar = ({ mobile = false, floating = false, onClose }: SidebarProps) => {
  const pathname = usePathname(); 

  const menuItems = [
    { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
    { name: 'Classes', href: '/classes', icon: School },
    { name: 'Élèves', href: '/students', icon: Users },
    { name: 'Professeurs', href: '/teachers', icon: GraduationCap },
    { name: 'Comptabilité', href: '/finance', icon: Wallet },
    { name: 'Bulletins', href: '/bulletins', icon: NotebookTabs },
    { name: 'Performance', href: '/performance', icon: ChartLine },
    { name: 'Paramètres', href: '/admin/settings', icon: Settings }
  ];

  let base = '';
  if (floating) {
    base = 'fixed left-1/2 bottom-6 transform -translate-x-1/2 w-[92vw] max-w-[360px] bg-white text-gray-800 p-4 rounded-3xl shadow-2xl z-50 overflow-hidden';
  } else if (mobile) {
    // Changement : On réduit le padding et on s'assure que le overflow-y-auto fonctionne bien
    base = 'fixed inset-y-0 left-0 w-[85vw] max-w-[320px] bg-gradient-to-b from-green-50 to-white text-gray-800 p-5 flex flex-col border-r border-green-200 shadow-2xl z-50 transform transition-transform overflow-y-auto';
  } else {
    base = 'hidden md:flex w-72 h-screen bg-gradient-to-b from-green-50 to-white text-gray-800 fixed left-0 top-0 p-8 flex flex-col border-r border-green-200 z-50 rounded-r-[1.5rem] overflow-y-auto';
  }

  return (
    <div className={base} role="navigation" aria-label="Sidebar">
      {/* HEADER : Réduit sur mobile pour gagner de la place */}
      <div className={`flex items-center justify-between ${mobile ? 'mb-6' : 'mb-12'}`}>
        <div className="flex items-center gap-3 px-1">
          <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
            <span className="font-black text-xl text-white">O</span>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900 leading-tight">
              Les<span className="text-green-600"> Oursins</span>
            </h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Admin</p>
          </div>
        </div>

        {mobile && onClose && (
          <button onClick={onClose} className="p-2 rounded-xl bg-gray-100 text-slate-600">
            <X size={18} />
          </button>
        )}
      </div>
      
      {/* NAVIGATION : On réduit l'espacement entre les items (space-y-1 au lieu de 3) */}
      <nav className="space-y-1.5 flex-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm
                ${isActive 
                  ? 'bg-green-500 text-white shadow-md shadow-green-200' 
                  : 'text-gray-600 hover:bg-green-50 hover:text-green-700'
                }`}
              onClick={() => onClose?.()}
            >
              <item.icon size={20} className={isActive ? 'text-white' : 'text-gray-400 group-hover:text-green-500'} />
              <span>{item.name}</span>
              
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* SECTION BAS : Réduite pour ne pas être coupée */}
      <div className="border-t border-gray-100 pt-4 mt-4">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 text-sm font-bold transition-all">
          <LogOut size={20} />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;