'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePaperStore } from '@/store/paperStore';
import AppLayout from '../../../components/AppLayout';
import { Download, Check, CloudLightning, AlertCircle, GripVertical, Trash2, PlusCircle, Printer } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

export default function PaperPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [user, setUser] = useState<{name: string, institution: string} | null>(null);
  const { id: assignmentId } = React.use(params);
  
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }
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
  
  const { 
    paper, setPaper, 
    reorderQuestion, moveQuestion, deleteQuestion, updateQuestionText, addManualQuestion 
  } = usePaperStore();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [showMarkingScheme, setShowMarkingScheme] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [studentName, setStudentName] = useState('');
  const [studentRoll, setStudentRoll] = useState('');
  const [studentSec, setStudentSec] = useState('');

  useEffect(() => {
    const fetchPaper = async () => {
      setIsLoading(true);
      try {
        const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiHost}/api/papers/assignment/${assignmentId}`);
        const data = await response.json();

        if (data.status === 'success') {
          setPaper(data.paper);
        } else {
          setErrorMsg(data.message || 'Failed to retrieve assessment paper details.');
        }
      } catch (error) {
        setErrorMsg('Network error. Make sure your backend API server is online.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPaper();
  }, [assignmentId, setPaper]);

  const handleSaveChanges = async (updatedPaper: typeof paper) => {
    if (!updatedPaper || !updatedPaper._id) return;
    
    setIsSaving(true);
    try {
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiHost}/api/papers/${updatedPaper._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: updatedPaper.title,
          timeLimit: updatedPaper.timeLimit,
          sections: updatedPaper.sections
        })
      });
      const data = await response.json();
      if (data.status === 'success') {
        setPaper(data.paper);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {} finally {
      setIsSaving(false);
    }
  };

  const handleQuestionTextChange = (sectionIdx: number, qIdx: number, text: string) => {
    updateQuestionText(sectionIdx, qIdx, text);
  };

  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    if (!destination) return; // dropped outside the list
    if (source.droppableId === destination.droppableId && source.index === destination.index) return; // didn't move

    const sourceSectionIdx = parseInt(source.droppableId);
    const destSectionIdx = parseInt(destination.droppableId);

    if (sourceSectionIdx === destSectionIdx) {
      reorderQuestion(sourceSectionIdx, source.index, destination.index);
    } else {
      moveQuestion(sourceSectionIdx, destSectionIdx, source.index, destination.index);
    }
    handleSaveChanges(usePaperStore.getState().paper);
  };

  // Client-side PDF download using browser's native print dialog
  const handleDownloadPDF = () => {
    window.print();
  };

  if (isLoading) return (
    <AppLayout title="Assignment Output" showBack onBack={() => router.push('/dashboard')}>
      <div className="py-20 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-[#E8642C] border-t-transparent rounded-full" /></div>
    </AppLayout>
  );

  if (errorMsg || !paper) return (
    <AppLayout title="Assignment Output" showBack onBack={() => router.push('/dashboard')}>
      <div className="py-20 text-center text-rose-500 font-bold"><AlertCircle className="w-10 h-10 mx-auto mb-4" />{errorMsg}</div>
    </AppLayout>
  );

  return (
    <AppLayout title="Assignment Output" showBack onBack={() => router.push('/dashboard')}>
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        
        {/* AI Message Box (Figma Style) */}
        <div className="bg-[#1A1A1A] rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center text-white no-print shadow-lg">
          <p className="font-medium text-sm md:text-base leading-relaxed md:max-w-xl">
            Certainly! Here are customized Question Papers for your {paper.subject} classes on {paper.title}:
          </p>
          <button 
            onClick={handleDownloadPDF}
            className="shrink-0 bg-white text-gray-900 hover:bg-gray-100 font-bold px-6 py-3 rounded-full flex items-center gap-2 text-sm transition-colors"
          >
            <Printer className="w-4 h-4" /> Download as PDF
          </button>
        </div>

        {/* The Paper Sheet */}
        <div id="paper-content" className="bg-white rounded-3xl p-8 md:p-16 shadow-sm border border-gray-200 text-gray-900 exam-paper min-h-[800px]">
          
          {/* Header */}
          <div className="text-center pb-8 border-b border-gray-300">
            <h1 className="text-2xl md:text-3xl font-bold font-serif mb-2">{user ? user.institution : 'School Name'}</h1>
            <h2 className="text-lg font-medium mb-1">Subject: {paper.subject}</h2>
            <h2 className="text-lg font-medium mb-8">Class: {paper.grade}</h2>

            <div className="flex justify-between items-end text-sm font-bold mb-4">
              <div className="flex items-center gap-1">
                Time Allowed: 
                <input
                  type="number"
                  value={paper.timeLimit}
                  onChange={(e) => {
                    const updated = { ...paper, timeLimit: parseInt(e.target.value) || 0 };
                    setPaper(updated);
                  }}
                  onBlur={() => handleSaveChanges(paper)}
                  className="w-12 text-center border-b border-dashed border-gray-400 focus:outline-none no-print-border"
                /> 
                minutes
              </div>
              <div>Maximum Marks: {paper.totalMarks}</div>
            </div>
            <div className="text-left text-sm font-bold">All questions are compulsory unless stated otherwise.</div>
          </div>

          {/* Student Fields */}
          <div className="py-6 space-y-3 border-b border-gray-300 text-sm font-medium">
            <div className="flex">
              <span className="w-16">Name:</span>
              <input type="text" className="flex-1 border-b border-gray-400 focus:outline-none" value={studentName} onChange={e=>setStudentName(e.target.value)} />
            </div>
            <div className="flex">
              <span className="w-24">Roll Number:</span>
              <input type="text" className="w-32 border-b border-gray-400 focus:outline-none" value={studentRoll} onChange={e=>setStudentRoll(e.target.value)} />
            </div>
            <div className="flex">
              <span className="w-24">Class: {paper.grade} Section:</span>
              <input type="text" className="w-20 border-b border-gray-400 focus:outline-none" value={studentSec} onChange={e=>setStudentSec(e.target.value)} />
            </div>
          </div>

          {/* Questions */}
          <div className="mt-8 space-y-12">
            <DragDropContext onDragEnd={handleDragEnd}>
              {paper.sections.map((section, secIdx) => (
              <div key={secIdx}>
                <h3 className="text-center font-bold text-lg mb-6">{section.title}</h3>
                
                <div className="mb-4">
                  <h4 className="font-bold">{section.title.includes('Multiple') ? 'Multiple Choice Questions' : section.title.includes('Short') ? 'Short Answer Questions' : section.title.includes('Long') ? 'Long Answer Questions' : 'True/False Questions'}</h4>
                  <p className="text-sm italic">{section.instruction}</p>
                </div>

                <Droppable droppableId={secIdx.toString()}>
                  {(provided) => (
                    <div 
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-6 min-h-[50px]"
                    >
                      {section.questions.map((q, qIdx) => (
                        <Draggable key={q.id || `q-${secIdx}-${qIdx}`} draggableId={q.id || `q-${secIdx}-${qIdx}`} index={qIdx}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`flex flex-col text-sm group relative rounded-lg p-2 transition-colors ${snapshot.isDragging ? 'bg-white shadow-xl ring-2 ring-[#E8642C]' : 'hover:bg-gray-50'}`}
                            >
                              {/* Drag Handle & Controls */}
                              <div className="absolute left-0 top-2 -translate-x-full pr-2 opacity-0 group-hover:opacity-100 flex flex-col items-center gap-2 transition-opacity no-print">
                                <div {...provided.dragHandleProps} className="text-gray-400 hover:text-gray-600 p-1">
                                  <GripVertical className="w-4 h-4" />
                                </div>
                                <button 
                                  onClick={() => {
                                    if(window.confirm('Delete this question?')) {
                                      deleteQuestion(secIdx, qIdx);
                                      handleSaveChanges(usePaperStore.getState().paper);
                                    }
                                  }} 
                                  className="text-gray-400 hover:text-rose-500 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="flex items-start gap-2">
                                <span className="font-medium mt-1">{qIdx + 1}.</span>
                                <div className="flex-1">
                                  <span className="text-gray-500 mr-1 hidden print:hidden">[{q.difficulty}]</span>
                                  <textarea
                                    rows={1}
                                    value={q.text}
                                    onChange={(e) => handleQuestionTextChange(secIdx, qIdx, e.target.value)}
                                    onBlur={() => handleSaveChanges(paper)}
                                    className="w-full bg-transparent resize-none overflow-hidden focus:outline-none font-medium text-gray-900 border-b border-transparent hover:border-gray-200 focus:border-blue-400 p-1 rounded-sm"
                                    style={{ minHeight: '28px' }}
                                  />
                                  {q.options && q.options.length > 0 && (
                                    <div className="ml-4 mt-2 space-y-1">
                                      {q.options.map((opt, oIdx) => (
                                        <div key={oIdx}>{String.fromCharCode(97 + oIdx)}) {opt}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <span className="shrink-0 font-medium whitespace-nowrap mt-1">[{q.marks} Marks]</span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                <div className="mt-4 no-print flex justify-center">
                  <button 
                    onClick={() => {
                      addManualQuestion(secIdx);
                      handleSaveChanges(usePaperStore.getState().paper);
                    }}
                    className="flex items-center gap-2 text-sm font-bold text-[#E8642C] hover:text-[#d9561f] bg-[#E8642C]/10 px-4 py-2 rounded-full transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" /> Add Manual Question
                  </button>
                </div>
              </div>
            ))}
            </DragDropContext>
          </div>

          <div className="mt-12 font-bold text-sm">End of Question Paper</div>

          {/* Answer Key Toggle area */}
          <div className="mt-16 pt-8 border-t border-gray-300 no-print">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Answer Key</h3>
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">
                  {isSaving ? <><CloudLightning className="inline w-3 h-3 animate-pulse" /> Saving...</> : saveSuccess ? <><Check className="inline w-3 h-3" /> Saved</> : ''}
                </span>
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={showMarkingScheme} onChange={() => setShowMarkingScheme(!showMarkingScheme)} />
                    <div className={`block w-10 h-6 rounded-full transition ${showMarkingScheme ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${showMarkingScheme ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <div className="ml-3 text-sm font-medium text-gray-700">Show Marking Scheme</div>
                </label>
              </div>
            </div>

            {showMarkingScheme && (
              <div className="space-y-6 text-sm">
                {paper.sections.flatMap(s => s.questions).map((q, idx) => (
                  <div key={idx} className="flex gap-4">
                    <span className="font-medium">{idx + 1}.</span>
                    <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">{q.sampleAnswer}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AppLayout>
  );
}
