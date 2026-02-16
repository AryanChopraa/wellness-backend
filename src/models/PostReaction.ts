import mongoose, { Schema } from 'mongoose';

const REACTION_TYPES = ['relate', 'support', 'celebrate', 'helpful'] as const;

const PostReactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    type: { type: String, required: true, enum: REACTION_TYPES },
  },
  { timestamps: true }
);

PostReactionSchema.index({ userId: 1, postId: 1 }, { unique: true });
PostReactionSchema.index({ postId: 1, type: 1 });

export const PostReaction = mongoose.model('PostReaction', PostReactionSchema);
