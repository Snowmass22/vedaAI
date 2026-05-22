import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, Library, Sparkles, LogOut, Users } from 'lucide-react';

export default function MobileNav() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Assignments', href: '/dashboard', icon: FileText, matchPrefix: '/dashboard' },
    { name: 'Groups', href: '/groups', icon: Users, matchPrefix: '/groups' },
    { name: 'Logout', href: '/login', icon: LogOut },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900 text-white flex items-center justify-between px-6 py-3 rounded-t-3xl z-30 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
      {navItems.map((item) => {
        const isActive = item.href === '/dashboard' 
          ? pathname === '/dashboard' 
          : pathname.startsWith(item.matchPrefix || item.href);
          
        return (
          <Link 
            key={item.name} 
            href={item.href}
            onClick={() => {
              if (item.name === 'Logout') localStorage.removeItem('token');
            }}
            className={`flex flex-col items-center gap-1 min-w-[64px] ${
              isActive ? 'text-[#E8642C]' : 'text-gray-400 hover:text-gray-300'
            }`}
          >  <item.icon className="w-5 h-5" />
            <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
              {item.name}
            </span>
            {isActive && <div className="w-1 h-1 bg-[#E8642C] rounded-full absolute bottom-1" />}
          </Link>
        );
      })}
    </div>
  );
}
