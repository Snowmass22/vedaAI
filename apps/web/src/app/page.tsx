'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F2F2F2] flex flex-col items-center justify-center px-4">
      <div className="bg-white rounded-3xl p-10 md:p-16 max-w-3xl text-center shadow-xl border border-gray-100">
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className="bg-[#E8642C] w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg">
            V
          </div>
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">VedaAI</h1>
        </div>
        
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 leading-tight">
          AI-Powered Assessment Creator
        </h2>
        <p className="text-lg text-gray-500 mb-10 max-w-xl mx-auto">
          Generate complete, printable examination sheets with correct marking schemes in real-time. Input your subject, upload materials, and let Gemini craft perfectly structured question papers.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="bg-[#E8642C] text-white rounded-full py-4 px-8 font-bold text-lg hover:bg-[#d9561f] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="bg-gray-100 text-gray-900 border border-gray-200 rounded-full py-4 px-8 font-bold text-lg hover:bg-gray-200 transition-all"
          >
            Log In
          </Link>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex items-center justify-center gap-2 text-sm font-semibold text-gray-400">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          Powered by Gemini 1.5 Flash
        </div>
      </div>
    </div>
  );
}
