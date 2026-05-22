import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, FileText, Sparkles, Library, Settings } from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<{name: string, institution: string} | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiHost}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status === 'success') {
          setUser(data.user);
        }
      } catch (err) {}
    };
    fetchUser();
  }, []);

  const navItems = [
    { name: 'Assignments', href: '/dashboard', icon: FileText, matchPrefix: '/dashboard' },
    { name: 'My Groups', href: '/groups', icon: Users, matchPrefix: '/groups' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-[220px] bg-white border-r border-gray-200 h-screen fixed left-0 top-0 overflow-y-auto sidebar-nav z-20">
      <div className="p-6 pb-4">
        <Link href="/" className="flex items-center gap-3 mb-8">
          <div className="bg-[#E8642C] w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-lg">
            V
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">VedaAI</span>
        </Link>

        <Link
          href="/assignments/new"
          className="bg-gray-900 text-white rounded-full py-2.5 px-4 flex items-center justify-center gap-2 text-sm font-medium hover:bg-gray-800 transition-colors mb-8 shadow-sm"
        >
          <Sparkles className="w-4 h-4" />
          Create Assignment
        </Link>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = item.href === '/dashboard' 
              ? pathname === '/dashboard' 
              : pathname.startsWith(item.matchPrefix || item.href);
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-gray-100 text-gray-900 font-semibold' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-gray-900' : 'text-gray-500'}`} />
                  {item.name}
                </div>
                {item.badge && (
                  <span className="bg-[#E8642C] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 pt-4 border-t border-gray-100">
        <Link
          href="/login"
          onClick={() => localStorage.removeItem('token')}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors mb-4"
        >
          <Settings className="w-4 h-4 text-rose-500" />
          Logout
        </Link>

        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-100">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-gray-200 shrink-0">
            {/* Placeholder for school avatar, using a reliable unpkg or ui-avatars link */}
            <img 
              src={`https://ui-avatars.com/api/?name=${user ? encodeURIComponent(user.institution) : 'School'}&background=random&color=fff`}
              alt="School Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-gray-900 truncate">{user ? user.institution : 'School Name'}</h4>
            <p className="text-[10px] text-gray-500 truncate">{user ? user.name : 'Teacher'}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
