'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useJobStatus } from '@/hooks/useJobStatus';
import { usePaperStore } from '@/store/paperStore';
import { Sparkles, Terminal, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface GeneratingPageProps {
  params: {
    id: string;
  };
}

export default function GeneratingPage({ params }: GeneratingPageProps) {
  const router = useRouter();
  const assignmentId = params.id;

  // Subscribe to socket room
  const { status, progress, message, paperId, error } = useJobStatus(assignmentId);
  const logs = usePaperStore((state) => state.logs);
  const resetPaperStore = usePaperStore((state) => state.resetPaperStore);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal console to the bottom on new logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Automated redirect on job completion (with a 1-second delay so they see the 100% state)
  useEffect(() => {
    if (status === 'completed' && paperId) {
      const timer = setTimeout(() => {
        router.push(`/assignments/${assignmentId}/paper`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, paperId, assignmentId, router]);

  const handleRetry = () => {
    resetPaperStore();
    router.push('/assignments/new');
  };

  return (
    <div className="min-h-screen py-16 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto flex flex-col justify-center">
      
      <div className="bg-white/90 border border-slate-200/80 rounded-3xl shadow-xl p-8 sm:p-10 text-center glass-card relative overflow-hidden">
        
        {/* Glow accent overlay */}
        <div className="absolute -right-24 -top-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute -left-24 -bottom-24 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl" />

        {/* Dynamic Icons state */}
        <div className="flex justify-center mb-8">
          {status === 'failed' ? (
            <div className="bg-rose-50 border border-rose-100 text-rose-500 p-5 rounded-full shadow-lg shadow-rose-500/5">
              <AlertCircle className="h-10 w-10" />
            </div>
          ) : status === 'completed' ? (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-500 p-5 rounded-full shadow-lg shadow-emerald-500/5 ring-4 ring-emerald-50">
              <CheckCircle2 className="h-10 w-10" />
            </div>
          ) : (
            <div className="relative">
              <div className="bg-indigo-50 border border-indigo-100 text-indigo-600 p-5 rounded-full shadow-lg shadow-indigo-600/5 ring-4 ring-indigo-50 pulse-ring">
                <Sparkles className="h-10 w-10 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            </div>
          )}
        </div>

        {/* Headers */}
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
          {status === 'failed' 
            ? 'Generation Failed' 
            : status === 'completed' 
              ? 'Assessment Created!' 
              : 'Creating Assessment Paper...'}
        </h2>
        <p className="mt-3 text-slate-500 text-sm font-semibold max-w-sm mx-auto">
          {status === 'failed' 
            ? 'The background queue execution encountered an error.' 
            : status === 'completed' 
              ? 'Finalizing Layout and paper elements...' 
              : 'Google Gemini is drafting questions based on your syllabus.'}
        </p>

        {/* Progress gauge bar */}
        <div className="mt-8 mb-4 max-w-md mx-auto">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
            <span>{message}</span>
            <span className="text-indigo-600">{progress}%</span>
          </div>
          
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 p-0.5">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                status === 'failed' 
                  ? 'bg-rose-500 shadow-md shadow-rose-500/20' 
                  : status === 'completed' 
                    ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' 
                    : 'bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-md shadow-indigo-500/20'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Live log Console Terminal */}
        <div className="mt-10 max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left shadow-2xl relative">
          <div className="flex items-center space-x-2 pb-3.5 border-b border-slate-800 text-slate-500">
            <Terminal className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-wider">Live Compilation Console</span>
          </div>

          <div className="mt-4 h-40 overflow-y-auto space-y-2.5 font-mono text-[11px] leading-relaxed text-slate-300 scrollbar-thin scrollbar-thumb-slate-800">
            {logs.length === 0 ? (
              <div className="text-slate-600 italic">[Waiting for websocket connection...]</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="flex space-x-2">
                  <span className="text-indigo-500 shrink-0">❯</span>
                  <span className={log.includes('successfully') || log.includes('completed') ? 'text-emerald-400 font-bold' : log.includes('failed') || log.includes('Failed') ? 'text-rose-400 font-bold' : ''}>
                    {log}
                  </span>
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Failures fallback controller */}
        {status === 'failed' && (
          <div className="mt-10 pt-6 border-t border-slate-200/60">
            <p className="text-rose-500 text-xs font-semibold mb-4 bg-rose-50 border border-rose-100 rounded-xl p-3 inline-block">
              ⚠️ Reason: {error || 'Fatal queue worker timeout.'}
            </p>
            <div>
              <button
                type="button"
                onClick={handleRetry}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl shadow-md shadow-indigo-600/10 transition-all duration-200 flex items-center space-x-1.5 mx-auto text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Adjust Settings & Retry</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
