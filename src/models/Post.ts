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
    /** Enhanced workflow: post type for filtering/display */
    postType: {
      type: String,
      enum: ['question', 'story', 'progress_update', 'resource_share', 'seeking_support'],
      default: 'story',
    },
    /** Tags for "For You" feed (match assessment concerns) */
    tags: { type: [String], default: [] },
    /** Optional severity level (1-5) for filtering */
    severityLevel: { type: Number, min: 1, max: 5, default: null },
    /** Trigger warnings for filtering */
    triggerWarnings: { type: [String], default: [] },
    /** Attached media: asset IDs (from POST /assets). Frontend uploads first, then passes ids here. */
    assetIds: { type: [Schema.Types.ObjectId], ref: 'Asset', default: [] },
    /** NSFW flag */
    isNsfw: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PostSchema.index({ communityId: 1, createdAt: -1 });
PostSchema.index({ communityId: 1, likeCount: -1 });
PostSchema.index({ communityId: 1, commentCount: -1 });
PostSchema.index({ tags: 1 });

export const Post = mongoose.model('Post', PostSchema);
