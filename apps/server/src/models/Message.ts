import mongoose, { Schema, Document } from 'mongoose';

export interface MessageDocument extends Document {
  text: string;
  senderId: mongoose.Types.ObjectId;
  groupId: mongoose.Types.ObjectId;
}

const MessageSchema = new Schema<MessageDocument>({
  text: { type: String, required: true },
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true }
}, { timestamps: true });

export const MessageModel = mongoose.model<MessageDocument>('Message', MessageSchema);
