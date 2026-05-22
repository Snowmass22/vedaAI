'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAssignmentStore } from '@/store/assignmentStore';
import AppLayout from '../../components/AppLayout';
import { Upload, Calendar, Plus, X, Mic } from 'lucide-react';

export default function NewAssignmentPage() {
  const router = useRouter();
  const store = useAssignmentStore();
  const setField = store.setField;
  
  // Use a local step state since we simplified to 2 steps: 1=Form, 2=Review
  const [localStep, setLocalStep] = useState(1);
  const [isListening, setIsListening] = useState(false);

  const totalQuestions = store.questionConfig.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const totalMarks = store.questionConfig.reduce((sum, item) => sum + ((Number(item.count) || 0) * (Number(item.marks) || 0)), 0);

  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      store.setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      store.setFile(e.dataTransfer.files[0]);
    }
  };

  const handleMicClick = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Your browser doesn't support speech recognition. Please use Google Chrome.");
      return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const currentText = store.additionalInstructions;
      setField('additionalInstructions', currentText ? `${currentText} ${transcript}` : transcript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleNext = () => {
    // Basic validation before review
    if (!store.subject) setField('subject', 'Assignment'); 
    if (!store.grade) setField('grade', 'Any');
    if (!store.topic) setField('topic', 'General');
    
    // Zod schema requires dueDate to be a valid future date
    if (!store.dueDate) {
      const tomorrow = new Date(Date.now() + 86400000);
      setField('dueDate', tomorrow.toISOString().slice(0, 16));
    } else {
      const selectedDate = new Date(store.dueDate).getTime();
      if (selectedDate <= Date.now()) {
        const tomorrow = new Date(Date.now() + 86400000);
        setField('dueDate', tomorrow.toISOString().slice(0, 16));
      }
    }
    
    setLocalStep(2);
  };

  const handleSubmit = async () => {
    setField('isSubmitting', true);
    setField('errors', {});

    try {
      const formData = new FormData();
      const metadata = {
        subject: store.subject,
        grade: store.grade,
        topic: store.topic,
        dueDate: store.dueDate,
        questionConfig: store.questionConfig,
        additionalInstructions: store.additionalInstructions
      };

      formData.append('metadata', JSON.stringify(metadata));
      if (store.file) {
        formData.append('file', store.file);
      }

      const token = localStorage.getItem('token');
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiHost}/api/assignments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();

      if (result.status === 'success') {
        router.push(`/assignments/${result.assignmentId}/generating`);
      } else {
        const backendErrors: Record<string, string> = {};
        if (result.errors) {
          result.errors.forEach((err: any) => {
            backendErrors[err.field] = err.message;
          });
        } else {
          backendErrors.form = result.message || 'Server rejected assignment submission';
        }
        store.setErrors(backendErrors);
        setLocalStep(1); // Go back if error
      }
    } catch (error) {
      store.setErrors({ form: 'Network request failed.' });
      setLocalStep(1);
    } finally {
      setField('isSubmitting', false);
    }
  };

  const fullTypeNames: Record<string, string> = {
    mcq: 'Multiple Choice Questions',
    true_false: 'True / False Questions',
    short: 'Short Questions',
    long: 'Long Answer / Essay Questions'
  };

  return (
    <AppLayout 
      title={localStep === 1 ? "Create Assignment" : "Review Assignment"} 
      showBack 
      onBack={() => localStep === 2 ? setLocalStep(1) : router.push('/dashboard')}
    >
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">
          {localStep === 1 ? 'Create Assignment' : 'Review & Submit'}
        </h1>
        <p className="text-sm text-gray-500">
          {localStep === 1 ? 'Set up a new assignment for your students' : 'Confirm your settings before generating'}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-2 mb-8">
        <div className={`h-1 flex-1 rounded-full ${localStep >= 1 ? 'bg-[#E8642C]' : 'bg-gray-200'}`}></div>
        <div className={`h-1 flex-1 rounded-full ${localStep >= 2 ? 'bg-[#E8642C]' : 'bg-gray-200'}`}></div>
      </div>

      <div className="veda-card p-6 md:p-8">
        {localStep === 1 ? (
          <div className="space-y-8">
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-1">Assignment Details</h2>
              <p className="text-sm text-gray-500 mb-6">Basic information about your assignment</p>
              
              {/* File Upload Box */}
              <div 
                className="border-2 border-dashed border-gray-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors relative"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <input 
                  type="file" 
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.jpg,.png"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-gray-400 mb-4" />
                <p className="font-semibold text-gray-700 mb-1">Choose a file or drag & drop it here</p>
                <p className="text-xs text-gray-400 mb-4">JPEG, PNG, upto 10MB</p>
                <button type="button" className="px-4 py-1.5 border border-gray-200 rounded-full text-xs font-medium text-gray-600 bg-white">
                  Browse Files
                </button>
              </div>
              <p className="text-center text-xs text-gray-500 mt-3">Upload images of your preferred document/image</p>
            </div>

            {/* Basic Info Row (Added to capture subject/grade/topic) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Subject</label>
                <input 
                  type="text" 
                  value={store.subject}
                  onChange={(e) => setField('subject', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="e.g. Science"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Grade</label>
                <input 
                  type="text" 
                  value={store.grade}
                  onChange={(e) => setField('grade', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="e.g. 8th"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Topic</label>
                <input 
                  type="text" 
                  value={store.topic}
                  onChange={(e) => setField('topic', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400"
                  placeholder="e.g. Electricity"
                />
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Due Date</label>
              <div className="relative">
                <input 
                  type="datetime-local" 
                  value={store.dueDate}
                  onChange={(e) => setField('dueDate', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400 appearance-none bg-white"
                  placeholder="DD-MM-YYYY"
                />
              </div>
            </div>

            {/* Question Type List */}
            <div>
              <div className="hidden md:grid grid-cols-12 gap-4 mb-2 px-1">
                <div className="col-span-6 text-sm font-bold text-gray-900">Question Type</div>
                <div className="col-span-3 text-sm font-bold text-gray-900 text-center">No. of Questions</div>
                <div className="col-span-3 text-sm font-bold text-gray-900 text-center">Marks</div>
              </div>

              <div className="space-y-4">
                {store.questionConfig.map((row, idx) => (
                  <div key={idx} className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-4 md:p-0 border border-gray-200 md:border-none rounded-xl">
                    <div className="w-full md:w-1/2 flex items-center gap-3">
                      <select 
                        value={row.type}
                        onChange={(e) => store.updateConfigRow(idx, 'type', e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400 appearance-none bg-white"
                      >
                        <option value="mcq">Multiple Choice Questions</option>
                        <option value="true_false">True / False Questions</option>
                        <option value="short">Short Questions</option>
                        <option value="long">Long Answer Questions</option>
                      </select>
                      {store.questionConfig.length > 1 && (
                        <button onClick={() => store.removeConfigRow(idx)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    
                    <div className="w-full md:w-1/4 flex items-center justify-between md:justify-center border border-gray-200 rounded-xl px-2 py-1">
                      <span className="md:hidden text-xs font-semibold text-gray-500 pl-2">No. of Questions</span>
                      <div className="flex items-center">
                        <button 
                          onClick={() => store.updateConfigRow(idx, 'count', Math.max(1, row.count - 1))}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-lg"
                        >−</button>
                        <span className="w-8 text-center text-sm font-medium">{row.count}</span>
                        <button 
                          onClick={() => store.updateConfigRow(idx, 'count', row.count + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-lg"
                        >+</button>
                      </div>
                    </div>

                    <div className="w-full md:w-1/4 flex items-center justify-between md:justify-center border border-gray-200 rounded-xl px-2 py-1">
                      <span className="md:hidden text-xs font-semibold text-gray-500 pl-2">Marks</span>
                      <div className="flex items-center">
                        <button 
                          onClick={() => store.updateConfigRow(idx, 'marks', Math.max(1, row.marks - 1))}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-lg"
                        >−</button>
                        <span className="w-8 text-center text-sm font-medium">{row.marks}</span>
                        <button 
                          onClick={() => store.updateConfigRow(idx, 'marks', row.marks + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-lg text-lg"
                        >+</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={store.addConfigRow}
                className="mt-4 flex items-center gap-2 text-sm font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-full transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Question Type
              </button>

              <div className="mt-6 text-right">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Questions : <span className="font-bold text-gray-900">{totalQuestions}</span></p>
                <p className="text-sm font-medium text-gray-600">Total Marks : <span className="font-bold text-gray-900">{totalMarks}</span></p>
              </div>
            </div>

            {/* Additional Info */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Additional Information (For better output)</label>
              <div className="relative">
                <textarea 
                  rows={4}
                  value={store.additionalInstructions}
                  onChange={(e) => setField('additionalInstructions', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-400 bg-gray-50"
                  placeholder="e.g Generate a question paper for 3 hour exam duration..."
                />
                <button 
                  onClick={handleMicClick}
                  type="button"
                  className={`absolute bottom-4 right-4 p-2 rounded-full transition-colors ${
                    isListening ? 'bg-rose-100 text-rose-500 animate-pulse' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="space-y-6">
            {/* Review Step Content */}
            <h2 className="text-xl font-bold text-gray-900">Review Summary</h2>
            <div className="bg-gray-50 rounded-xl p-6 space-y-4 border border-gray-100">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Subject & Topic</p>
                <p className="font-medium">{store.subject} — {store.topic} (Grade {store.grade})</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase">Questions Structure</p>
                <ul className="mt-2 space-y-2">
                  {store.questionConfig.map((row, idx) => (
                    <li key={idx} className="flex justify-between text-sm">
                      <span>{fullTypeNames[row.type]}</span>
                      <span className="font-medium">{row.count} Qs × {row.marks} marks</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{totalQuestions} Qs = {totalMarks} Marks</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
          <button 
            onClick={() => localStep === 2 ? setLocalStep(1) : router.push('/dashboard')}
            className="px-6 py-3 rounded-full border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Previous
          </button>
          
          <button 
            onClick={localStep === 1 ? handleNext : handleSubmit}
            disabled={store.isSubmitting}
            className="px-8 py-3 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {store.isSubmitting ? 'Generating...' : (localStep === 1 ? 'Next →' : 'Submit')}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
