import './globals.css';
import React from 'react';

export const metadata = {
  title: 'VedaAI — AI Assessment Creator',
  description: 'Instantly design, structure, and download professional class examination sheets using Google Gemini AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F2F2F2] min-h-screen antialiased text-slate-800">
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
