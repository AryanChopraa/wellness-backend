import mongoose, { Schema } from 'mongoose';

const PostSchema = new Schema(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PostSchema.index({ communityId: 1, createdAt: -1 });
PostSchema.index({ communityId: 1, likeCount: -1 });
PostSchema.index({ communityId: 1, commentCount: -1 });

export const Post = mongoose.model('Post', PostSchema);
