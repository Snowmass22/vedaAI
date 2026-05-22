import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileNav from './MobileNav';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function AppLayout({ children, title, showBack, onBack }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F2F2F2] flex">
      <Sidebar />
      <div className="flex-1 lg:ml-[220px] flex flex-col min-w-0">
        <TopBar title={title} showBack={showBack} onBack={onBack} />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
