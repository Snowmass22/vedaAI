import mongoose, { Schema, Document } from 'mongoose';
import { QuestionPaper as IQuestionPaper, Section as ISection, Question as IQuestion } from '@veda-ai/types';

export interface QuestionPaperDocument extends Omit<IQuestionPaper, 'id' | '_id'>, Document {}

const QuestionSchema = new Schema<IQuestion>({
  id: { type: String, required: true },
  text: { type: String, required: true },
  type: { type: String, enum: ['mcq', 'short', 'long', 'true_false'], required: true },
  options: { type: [String], required: false },
  difficulty: { type: String, enum: ['easy', 'moderate', 'hard'], required: true },
  marks: { type: Number, required: true },
  section: { type: String, required: true },
  sampleAnswer: { type: String, required: false }
}, { _id: false });

const SectionSchema = new Schema<ISection>({
  title: { type: String, required: true },
  instruction: { type: String, required: true },
  questions: { type: [QuestionSchema], required: true }
}, { _id: false });

const QuestionPaperSchema = new Schema({
  assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  grade: { type: String, required: true },
  timeLimit: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  sections: { type: [SectionSchema], required: true },
  metadata: {
    modelUsed: { type: String, required: false },
    promptTokens: { type: Number, required: false },
    generationTimeMs: { type: Number, required: false }
  }
}, { timestamps: true });

// Create rapid lookup index on assignmentId
QuestionPaperSchema.index({ assignmentId: 1 });

export const QuestionPaperModel = mongoose.model<QuestionPaperDocument>('QuestionPaper', QuestionPaperSchema);
