'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Bell, ChevronDown, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TopBarProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function TopBar({ title, showBack, onBack }: TopBarProps) {
  const [user, setUser] = useState<{name: string} | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

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
        {/* Notifications Dropdown */}
        <div className="relative" ref={notificationsRef}>
          <button 
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className={`relative p-2 rounded-full transition-colors ${notificationsOpen ? 'bg-[#E8642C]/10 text-[#E8642C]' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E8642C] rounded-full border-2 border-white"></span>
          </button>

          {/* Notifications Menu */}
          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-900">Notifications</h3>
                <span className="text-xs bg-[#E8642C]/10 text-[#E8642C] px-2 py-1 rounded-full font-semibold">1 New</span>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <div className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-colors">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <span className="text-lg">🎉</span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 font-medium">Welcome to VedaAI!</p>
                      <p className="text-xs text-gray-500 mt-1">Start creating your first AI-powered assessment.</p>
                      <p className="text-[10px] text-gray-400 mt-1">Just now</p>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-8 text-center text-gray-500 text-sm">
                  No more notifications
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* User Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded-lg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
              <img src={`https://ui-avatars.com/api/?name=${user ? encodeURIComponent(user.name) : 'User'}&background=random`} alt="User" className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-medium text-gray-700 hidden sm:block truncate max-w-[120px]">
              {user ? user.name : 'Teacher'}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 hidden sm:block transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'Teacher'}</p>
                <p className="text-xs text-gray-500">Logged in</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
