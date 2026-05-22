import { create } from 'zustand';
import { QuestionPaper, JobStatus } from '@veda-ai/types';

export interface PaperState {
  paper: QuestionPaper | null;
  status: JobStatus;
  progress: number;
  message: string;
  error: string | null;
  paperId: string | null;
  logs: string[];
}

interface PaperActions {
  setPaper: (paper: QuestionPaper | null) => void;
  updateStatus: (status: JobStatus, progress: number, message: string) => void;
  addLog: (log: string) => void;
  setError: (error: string | null) => void;
  setPaperId: (paperId: string | null) => void;
  resetPaperStore: () => void;
  
  // Drag and Drop & Editing Mutators
  reorderQuestion: (sectionIndex: number, startIndex: number, endIndex: number) => void;
  moveQuestion: (sourceSectionIndex: number, targetSectionIndex: number, sourceIndex: number, targetIndex: number) => void;
  deleteQuestion: (sectionIndex: number, questionIndex: number) => void;
  updateQuestionText: (sectionIndex: number, questionIndex: number, newText: string) => void;
  addManualQuestion: (sectionIndex: number) => void;
}

const initialPaperState: PaperState = {
  paper: null,
  status: 'draft',
  progress: 0,
  message: 'Initiating queue processes...',
  error: null,
  paperId: null,
  logs: []
};

export const usePaperStore = create<PaperState & PaperActions>((set) => ({
  ...initialPaperState,

  setPaper: (paper) => set({ paper }),

  updateStatus: (status, progress, message) => set((state) => ({
    status,
    progress,
    message,
    logs: [...state.logs, `${message}`]
  })),

  addLog: (log) => set((state) => ({
    logs: [...state.logs, `${log}`]
  })),

  setError: (error) => set({
    error,
    status: error ? 'failed' : 'draft'
  }),

  setPaperId: (paperId) => set({ paperId }),

  resetPaperStore: () => set(initialPaperState),

  // --- Mutators ---
  reorderQuestion: (sectionIndex, startIndex, endIndex) => set((state) => {
    if (!state.paper) return state;
    const newPaper = { ...state.paper };
    const section = newPaper.sections[sectionIndex];
    const [removed] = section.questions.splice(startIndex, 1);
    section.questions.splice(endIndex, 0, removed);
    return { paper: newPaper };
  }),

  moveQuestion: (sourceSectionIndex, targetSectionIndex, sourceIndex, targetIndex) => set((state) => {
    if (!state.paper) return state;
    const newPaper = { ...state.paper };
    const sourceSection = newPaper.sections[sourceSectionIndex];
    const targetSection = newPaper.sections[targetSectionIndex];
    const [removed] = sourceSection.questions.splice(sourceIndex, 1);
    targetSection.questions.splice(targetIndex, 0, removed);
    return { paper: newPaper };
  }),

  deleteQuestion: (sectionIndex, questionIndex) => set((state) => {
    if (!state.paper) return state;
    const newPaper = { ...state.paper };
    newPaper.sections[sectionIndex].questions.splice(questionIndex, 1);
    return { paper: newPaper };
  }),

  updateQuestionText: (sectionIndex, questionIndex, newText) => set((state) => {
    if (!state.paper) return state;
    const newPaper = { ...state.paper };
    newPaper.sections[sectionIndex].questions[questionIndex].text = newText;
    return { paper: newPaper };
  }),

  addManualQuestion: (sectionIndex) => set((state) => {
    if (!state.paper) return state;
    const newPaper = { ...state.paper };
    newPaper.sections[sectionIndex].questions.push({
      id: `manual-${Date.now()}`,
      type: newPaper.sections[sectionIndex].title.toLowerCase().includes('multiple') ? 'mcq' : 'short',
      text: 'New manual question (click to edit)',
      marks: 1,
      difficulty: 'medium',
      section: newPaper.sections[sectionIndex].title
    });
    return { paper: newPaper };
  })
}));
