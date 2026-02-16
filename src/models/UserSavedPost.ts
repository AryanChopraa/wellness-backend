import mongoose, { Schema } from 'mongoose';

const UserSavedPostSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
  },
  { timestamps: true }
);

UserSavedPostSchema.index({ userId: 1, postId: 1 }, { unique: true });

export const UserSavedPost = mongoose.model('UserSavedPost', UserSavedPostSchema);
