import React, { useEffect, useState } from 'react';
import { ArrowLeft, Bell, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function TopBar({ title, showBack, onBack }: TopBarProps) {
  const [user, setUser] = useState<{name: string} | null>(null);

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
        if (data.status === 'success') setUser(data.user);
      } catch (err) {}
    };
    fetchUser();
  }, []);
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
      <div className="flex items-center gap-3">
        {showBack && (
          <button 
            onClick={onBack}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        {showBack && <div className="h-4 w-px bg-gray-300 mx-1 hidden sm:block" />}
        <div className="flex items-center gap-2">
          {showBack && <div className="w-2 h-2 rounded-full bg-emerald-400 hidden sm:block"></div>}
          <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E8642C] rounded-full border-2 border-white"></span>
        </button>
        
        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors">
          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
            <img src={`https://ui-avatars.com/api/?name=${user ? encodeURIComponent(user.name) : 'User'}&background=random`} alt="User" className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-medium text-gray-700 hidden sm:block truncate max-w-[120px]">
            {user ? user.name : 'Teacher'}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
        </div>
      </div>
    </header>
  );
}
