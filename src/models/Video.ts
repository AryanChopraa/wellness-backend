import mongoose, { Schema } from 'mongoose';

/**
 * Where the video content lives:
 * - youtube: externalId = YouTube video ID → embedUrl = https://www.youtube.com/embed/{externalId}
 * - vimeo: externalId = Vimeo video ID → embedUrl = https://player.vimeo.com/video/{externalId}
 * - url: videoUrl = direct link to video (any host)
 * - asset: assetId = ref to Asset (GCS upload); play URL comes from Asset.url
 */
const VideoSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    duration: { type: String, default: '' }, // e.g. "8:32"
    thumbnailUrl: { type: String, default: '' },
    /** How the video is stored: youtube | vimeo | url | asset */
    source: {
      type: String,
      required: true,
      enum: ['youtube', 'vimeo', 'url', 'asset'],
      default: 'url',
    },
    /** For youtube/vimeo: video ID (e.g. YouTube "dQw4w9WgXcQ"). Frontend builds embed URL. */
    externalId: { type: String, default: null },
    /** Direct video URL when source=url, or share/fallback URL. */
    videoUrl: { type: String, default: null },
    /** When source=asset: ref to Asset (GCS). Resolve Asset.url for playable link. */
    assetId: { type: Schema.Types.ObjectId, ref: 'Asset', default: null },
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

export const Video = mongoose.model('Video', VideoSchema);
