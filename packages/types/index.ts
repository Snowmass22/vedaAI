export type QuestionType = 'mcq' | 'short' | 'long' | 'true_false';
export type DifficultyLevel = 'easy' | 'moderate' | 'hard';
export type ConfigDifficultyLevel = 'easy' | 'moderate' | 'hard' | 'mixed';

export interface QuestionConfigItem {
  type: QuestionType;
  count: number;
  marks: number;
  difficulty: ConfigDifficultyLevel;
}

export interface FileReference {
  path: string;
  filename: string;
  size: number;
  mimeType: string;
}

export type JobStatus = 'draft' | 'queued' | 'processing' | 'completed' | 'failed';

export interface Assignment {
  id?: string;
  _id?: string;
  subject: string;
  grade: string;
  topic: string;
  dueDate: string; // ISO date string
  questionConfig: QuestionConfigItem[];
  fileReference?: FileReference;
  additionalInstructions?: string;
  status: JobStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // for MCQs (A, B, C, D options)
  difficulty: DifficultyLevel;
  marks: number;
  section: string; // e.g. "Section A"
  sampleAnswer?: string; // grading guide / schema
}

export interface Section {
  title: string;      // e.g. "SECTION A - Multiple Choice Questions"
  instruction: string; // e.g. "Answer all questions. Each carries 1 mark."
  questions: Question[];
}

export interface QuestionPaper {
  id?: string;
  _id?: string;
  assignmentId: string;
  title: string;
  subject: string;
  grade: string;
  timeLimit: number; // in minutes
  totalMarks: number;
  sections: Section[];
  metadata?: {
    modelUsed?: string;
    promptTokens?: number;
    generationTimeMs?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

// Websocket Events
export type WebSocketServerMessage =
  | { type: 'progress'; progress: number; message: string }
  | { type: 'completed'; paperId: string }
  | { type: 'failed'; error: string };

export type WebSocketClientMessage =
  | { type: 'subscribe'; assignmentId: string };
