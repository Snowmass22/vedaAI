import { create } from 'zustand';
import { QuestionConfigItem } from '@veda-ai/types';

export interface FormState {
  subject: string;
  grade: string;
  topic: string;
  dueDate: string;
  questionConfig: QuestionConfigItem[];
  file: File | null;
  fileMetadata: { filename: string; size: number } | null;
  additionalInstructions: string;
  currentStep: number;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

interface FormActions {
  setField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  addConfigRow: () => void;
  removeConfigRow: (index: number) => void;
  updateConfigRow: (index: number, key: keyof QuestionConfigItem, value: any) => void;
  setFile: (file: File | null) => void;
  setErrors: (errors: Record<string, string>) => void;
  resetForm: () => void;
  validateStep: (step: number) => boolean;
}

const initialFormState: FormState = {
  subject: '',
  grade: '',
  topic: '',
  dueDate: '',
  questionConfig: [
    { type: 'mcq', count: 5, marks: 1, difficulty: 'easy' }
  ],
  file: null,
  fileMetadata: null,
  additionalInstructions: '',
  currentStep: 1,
  errors: {},
  isSubmitting: false
};

export const useAssignmentStore = create<FormState & FormActions>((set, get) => ({
  ...initialFormState,

  setField: (key, value) => {
    set({
      [key]: value,
      errors: { ...get().errors, [key as string]: '' }
    });
  },

  addConfigRow: () => {
    set((state) => ({
      questionConfig: [
        ...state.questionConfig,
        { type: 'short', count: 3, marks: 2, difficulty: 'moderate' as any }
      ]
    }));
  },

  removeConfigRow: (index) => {
    set((state) => {
      const updated = [...state.questionConfig];
      updated.splice(index, 1);
      return { questionConfig: updated };
    });
  },

  updateConfigRow: (index, key, value) => {
    set((state) => {
      const updated = [...state.questionConfig];
      updated[index] = { ...updated[index], [key]: value };
      return { questionConfig: updated };
    });
  },

  setFile: (file) => {
    if (!file) {
      set({ file: null, fileMetadata: null });
      return;
    }
    set({
      file,
      fileMetadata: {
        filename: file.name,
        size: file.size
      },
      errors: { ...get().errors, file: '' }
    });
  },

  setErrors: (errors) => set({ errors }),

  resetForm: () => set(initialFormState),

  validateStep: (step) => {
    const state = get();
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!state.subject || state.subject.trim().length < 3) {
        newErrors.subject = 'Subject name must be at least 3 characters';
      }
      if (!state.grade || state.grade.trim().length === 0) {
        newErrors.grade = 'Grade or class level is required';
      }
      if (!state.topic || state.topic.trim().length < 3) {
        newErrors.topic = 'Topic description must be at least 3 characters';
      }
      if (!state.dueDate) {
        newErrors.dueDate = 'Due Date is required';
      } else {
        const selectedDate = new Date(state.dueDate).getTime();
        if (selectedDate <= Date.now()) {
          newErrors.dueDate = 'Due date must be in the future';
        }
      }
    }

    if (step === 2) {
      if (state.questionConfig.length === 0) {
        newErrors.questionConfig = 'At least one question configuration is required';
      }
      state.questionConfig.forEach((cfg, idx) => {
        if (!cfg.count || cfg.count <= 0) {
          newErrors[`config_${idx}_count`] = 'Count must be 1 or more';
        } else if (cfg.count > 100) {
          newErrors[`config_${idx}_count`] = 'Maximum 100 questions per row';
        }

        if (!cfg.marks || cfg.marks <= 0) {
          newErrors[`config_${idx}_marks`] = 'Marks must be 1 or more';
        } else if (cfg.marks > 100) {
          newErrors[`config_${idx}_marks`] = 'Maximum 100 marks per question';
        }
      });
    }

    if (step === 3) {
      if (state.file) {
        const allowedExtensions = ['.pdf', '.txt'];
        const fileNameLower = state.file.name.toLowerCase();
        const isValidExtension = allowedExtensions.some(ext => fileNameLower.endsWith(ext));
        
        if (!isValidExtension) {
          newErrors.file = 'Invalid file type. Only PDF and plain text (.txt) files are allowed';
        }
        if (state.file.size > 10 * 1024 * 1024) {
          newErrors.file = 'File size exceeds the 10MB limit';
        }
      }
    }

    set({ errors: newErrors });
    return Object.keys(newErrors).length === 0;
  }
}));
