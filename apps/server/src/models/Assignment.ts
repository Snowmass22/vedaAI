import mongoose, { Schema, Document } from 'mongoose';
import { Assignment as IAssignment, QuestionConfigItem, FileReference } from '@veda-ai/types';

export interface AssignmentDocument extends Omit<IAssignment, 'id' | '_id'>, Document {
  userId: mongoose.Types.ObjectId;
}

const QuestionConfigSchema = new Schema<QuestionConfigItem>({
  type: { type: String, enum: ['mcq', 'short', 'long', 'true_false'], required: true },
  count: { type: Number, required: true, min: 1 },
  marks: { type: Number, required: true, min: 1 },
  difficulty: { type: String, enum: ['easy', 'moderate', 'hard', 'mixed'], required: true }
}, { _id: false });

const FileReferenceSchema = new Schema<FileReference>({
  path: { type: String, required: true },
  filename: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true }
}, { _id: false });

const AssignmentSchema = new Schema<AssignmentDocument>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true, minlength: 3 },
  grade: { type: String, required: true },
  topic: { type: String, required: true, minlength: 3 },
  dueDate: { type: String, required: true },
  questionConfig: { type: [QuestionConfigSchema], required: true },
  fileReference: { type: FileReferenceSchema, required: false },
  additionalInstructions: { type: String, required: false },
  status: {
    type: String,
    enum: ['draft', 'queued', 'processing', 'completed', 'failed'],
    default: 'draft',
    required: true
  }
}, { timestamps: true });

// Add index on status for quick lookups
AssignmentSchema.index({ status: 1 });

export const AssignmentModel = mongoose.model<AssignmentDocument>('Assignment', AssignmentSchema);
