import mongoose, { Schema, Document } from 'mongoose';

export interface GroupDocument extends Document {
  name: string;
  members: mongoose.Types.ObjectId[];
}

const GroupSchema = new Schema<GroupDocument>({
  name: { type: String, required: true },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export const GroupModel = mongoose.model<GroupDocument>('Group', GroupSchema);
