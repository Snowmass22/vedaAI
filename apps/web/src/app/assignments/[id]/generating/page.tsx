'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useJobStatus } from '@/hooks/useJobStatus';
import { usePaperStore } from '@/store/paperStore';
import AppLayout from '../../../components/AppLayout';
import { Sparkles, Terminal, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

interface GeneratingPageProps {
  params: Promise<{ id: string }>;
}

export default function GeneratingPage({ params }: GeneratingPageProps) {
  const router = useRouter();
  const { id: assignmentId } = React.use(params);

  const { status, progress, message, paperId, error } = useJobStatus(assignmentId);
  const logs = usePaperStore((state) => state.logs);
  const resetPaperStore = usePaperStore((state) => state.resetPaperStore);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    if (status === 'completed' && paperId) {
      const timer = setTimeout(() => {
        router.push(`/assignments/${assignmentId}/paper`);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [status, paperId, assignmentId, router]);

  return (
    <AppLayout 
      title="Assignment Output" 
      showBack 
      onBack={() => router.push('/dashboard')}
    >
      <div className="flex flex-col items-center justify-center py-10 max-w-2xl mx-auto">
        <div className="veda-card p-10 w-full text-center relative overflow-hidden">
          
          <div className="flex justify-center mb-8">
            {status === 'failed' ? (
              <div className="bg-rose-50 text-rose-500 p-5 rounded-full">
                <AlertCircle className="h-10 w-10" />
              </div>
            ) : status === 'completed' ? (
              <div className="bg-emerald-50 text-emerald-500 p-5 rounded-full">
                <CheckCircle2 className="h-10 w-10" />
              </div>
            ) : (
              <div className="relative">
                <div className="bg-[#E8642C]/10 text-[#E8642C] p-5 rounded-full">
                  <Sparkles className="h-10 w-10 animate-pulse" />
                </div>
                <div className="absolute inset-0 rounded-full border-2 border-[#E8642C] border-t-transparent animate-spin" />
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'failed' 
              ? 'Generation Failed' 
              : status === 'completed' 
                ? 'Assessment Created!' 
                : 'Creating Assessment Paper...'}
          </h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-10">
            {status === 'failed' 
              ? 'The background queue execution encountered an error.' 
              : status === 'completed' 
                ? 'Finalizing Layout and paper elements...' 
                : 'Google Gemini is drafting questions based on your syllabus.'}
          </p>

          {/* Progress Bar */}
          <div className="max-w-md mx-auto mb-10">
            <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
              <span>{message}</span>
              <span className="text-[#E8642C]">{progress}%</span>
            </div>
            
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  status === 'failed' ? 'bg-rose-500' : status === 'completed' ? 'bg-emerald-500' : 'bg-[#E8642C]'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Terminal */}
          <div className="bg-gray-900 rounded-xl p-5 text-left">
            <div className="flex items-center gap-2 pb-3 border-b border-gray-800 text-gray-400 mb-3">
              <Terminal className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Live Compilation Console</span>
            </div>
            <div className="h-32 overflow-y-auto space-y-2 font-mono text-xs text-gray-300">
              {logs.length === 0 ? (
                <div className="text-gray-500 italic">[Waiting for websocket connection...]</div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-[#E8642C] shrink-0">❯</span>
                    <span className={log.includes('completed') ? 'text-emerald-400 font-bold' : log.includes('failed') ? 'text-rose-400 font-bold' : ''}>
                      {log}
                    </span>
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>

          {status === 'failed' && (
            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-rose-500 text-sm font-medium mb-4">Reason: {error || 'Worker timeout.'}</p>
              <button
                onClick={() => { resetPaperStore(); router.push('/assignments/new'); }}
                className="bg-gray-900 hover:bg-gray-800 text-white font-medium px-6 py-3 rounded-full flex items-center gap-2 mx-auto text-sm transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
