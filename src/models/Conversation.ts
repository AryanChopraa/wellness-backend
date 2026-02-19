import mongoose, { Schema } from 'mongoose';

const ConversationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, trim: true, default: 'New conversation' },
    persona: { type: String, trim: true },
  },
  { timestamps: true }
);

ConversationSchema.index({ userId: 1, createdAt: -1 });

export const Conversation = mongoose.model('Conversation', ConversationSchema);
