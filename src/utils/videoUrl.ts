/**
 * Build embed or play URL for a video based on its source.
 * Used when returning video payload to the client.
 */
export interface VideoSourceFields {
  source: string;
  externalId?: string | null;
  videoUrl?: string | null;
  assetUrl?: string | null; // resolved from Asset when source=asset
}

/**
 * Returns URL the client can use to embed or play the video.
 * - youtube: https://www.youtube.com/embed/{externalId}
 * - vimeo: https://player.vimeo.com/video/{externalId}
 * - url: videoUrl as-is
 * - asset: assetUrl (must be resolved by caller from Asset.url)
 */
export function getVideoPlayUrl(v: VideoSourceFields): string | null {
  switch (v.source) {
    case 'youtube':
      return v.externalId
        ? `https://www.youtube.com/embed/${v.externalId}`
        : null;
    case 'vimeo':
      return v.externalId
        ? `https://player.vimeo.com/video/${v.externalId}`
        : null;
    case 'url':
      return v.videoUrl && v.videoUrl.trim() ? v.videoUrl.trim() : null;
    case 'asset':
      return v.assetUrl && v.assetUrl.trim() ? v.assetUrl.trim() : null;
    default:
      return v.videoUrl && v.videoUrl.trim() ? v.videoUrl.trim() : null;
  }
}
