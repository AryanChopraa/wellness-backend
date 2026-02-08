import mongoose, { Schema } from 'mongoose';

const PostVoteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    value: { type: Number, required: true, enum: [1, -1] },
  },
  { timestamps: true }
);

PostVoteSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const PostVote = mongoose.model('PostVote', PostVoteSchema);
