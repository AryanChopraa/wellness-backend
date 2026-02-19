import mongoose, { Schema } from 'mongoose';

/**
 * Videos are stored only as assets (GCS). assetId → Asset.url gives the playable URL.
 * format: 'reel' = short-form vertical (reel-style); 'standard' = longer/other.
 */
const VideoSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    duration: { type: String, default: '' }, // e.g. "0:45" for display
    /** Duration in seconds; used for reels filter (e.g. <= 90) */
    durationSeconds: { type: Number, default: null },
    thumbnailUrl: { type: String, default: '' },
    /** Only asset is supported; play URL comes from Asset.url */
    source: {
      type: String,
      required: true,
      enum: ['asset'],
      default: 'asset',
    },
    /** Ref to Asset (GCS). Resolve Asset.url for playable link. */
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', required: true },
    /** reel = short-form vertical (reel-style); standard = longer */
    format: { type: String, enum: ['reel', 'standard'], default: 'reel' },
    /**
     * Primary content category — used for tab filtering in the feed.
     * One of: stamina | pleasure | dating | education | confidence
     */
    category: {
      type: String,
      enum: ['stamina', 'pleasure', 'dating', 'education', 'confidence'],
      default: null,
      index: true,
    },
    /** Tags for recommendation (performance, anxiety, communication, etc.) */
    tags: { type: [String], default: [] },
    /** Primary fear this video addresses (from Q8) */
    fearAddressed: { type: String, default: null },
    /** Severity levels this video is appropriate for (1-5) */
    severityLevels: { type: [Number], default: [] },
    /** Relationship filter: yes_they_know, yes_havent_shared, etc. */
    relationshipFilter: { type: [String], default: [] },
    viewCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

VideoSchema.index({ tags: 1, isActive: 1 });
VideoSchema.index({ fearAddressed: 1 });
VideoSchema.index({ format: 1, isActive: 1 });

export const Video = mongoose.model('Video', VideoSchema);
