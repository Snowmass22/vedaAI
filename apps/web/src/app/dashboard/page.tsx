'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';
import { Search, Filter, MoreVertical, SearchX, FileText, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }
        const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const res = await fetch(`${apiHost}/api/assignments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status === 'success') {
          setAssignments(data.assignments);
        }
      } catch (error) {
        console.error('Failed to fetch assignments', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssignments();
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const token = localStorage.getItem('token');
      const apiHost = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiHost}/api/assignments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAssignments(prev => prev.filter(a => a._id !== id));
      } else {
        alert('Failed to delete assignment');
      }
    } catch (error) {
      console.error('Delete error', error);
      alert('Error deleting assignment');
    }
  };

  return (
    <AppLayout title="Assignment">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <h1 className="text-xl font-bold text-gray-900">Assignments</h1>
        </div>
        <p className="text-sm text-gray-500">Manage and create assignments for your classes.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600 hover:bg-gray-50 shrink-0">
          <Filter className="w-4 h-4" />
          Filter By
        </button>
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search Assignment" 
            className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8642C]/20 focus:border-[#E8642C] text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-8 h-8 border-4 border-[#E8642C] border-t-transparent rounded-full" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-48 h-48 mb-6 relative">
            <div className="absolute inset-0 bg-gray-100 rounded-full opacity-50 blur-xl"></div>
            <div className="relative z-10 flex items-center justify-center w-full h-full bg-white rounded-full border border-gray-100 shadow-sm">
              <SearchX className="w-16 h-16 text-rose-500" />
            </div>
            {/* Decorative elements */}
            <div className="absolute top-4 left-4 w-6 h-6 border-2 border-gray-300 rounded-md rotate-12"></div>
            <div className="absolute bottom-8 right-4 w-4 h-4 bg-blue-200 rounded-full"></div>
            <div className="absolute top-1/2 -left-4 w-3 h-3 bg-[#E8642C] rounded-full"></div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3">No assignments yet</h3>
          <p className="text-sm text-gray-500 max-w-md mb-8">
            Create your first assignment to start collecting and grading student submissions. You can set up rubrics, define marking criteria, and let AI assist with grading.
          </p>
          <Link
            href="/assignments/new"
            className="bg-gray-900 text-white rounded-full py-3 px-6 font-medium hover:bg-gray-800 transition-colors shadow-lg"
          >
            + Create Your First Assignment
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((assignment) => (
            <div 
              key={assignment._id} 
              className="veda-card p-5 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/assignments/${assignment._id}/${assignment.status === 'completed' ? 'paper' : 'generating'}`)}
            >
              <div className="flex justify-between items-start mb-12">
                <div className="flex items-start gap-3">
                  <div className="bg-[#E8642C]/10 p-2 rounded-lg text-[#E8642C]">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 line-clamp-1">{assignment.topic}</h3>
                    <p className="text-xs font-semibold text-gray-500">{assignment.subject} • Grade {assignment.grade}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    className="text-gray-400 hover:text-rose-500 p-1 transition-colors" 
                    onClick={(e) => handleDelete(e, assignment._id)}
                    title="Delete Assignment"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button className="text-gray-400 hover:text-gray-600 p-1" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs font-medium text-gray-500">
                <span className="bg-gray-100 px-2 py-1 rounded-md text-gray-700 capitalize">
                  {assignment.status === 'completed' ? '🟢 Ready' : '🟡 Processing'}
                </span>
                <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {assignments.length > 0 && (
        <div className="fixed bottom-24 lg:bottom-8 left-0 right-0 flex justify-center pointer-events-none">
          <Link
            href="/assignments/new"
            className="pointer-events-auto bg-gray-900 text-white rounded-full py-3 px-6 font-medium hover:bg-gray-800 transition-colors shadow-xl flex items-center gap-2"
          >
            <span className="text-lg leading-none">+</span> Create Assignment
          </Link>
        </div>
      )}
    </AppLayout>
  );
}
