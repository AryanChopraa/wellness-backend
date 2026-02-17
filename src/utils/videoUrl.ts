/**
 * Build play URL for a video. Videos are asset-only; play URL comes from Asset.url.
 */
export interface VideoSourceFields {
  source: string;
  assetUrl?: string | null;
}

/** Returns URL the client can use to play the video (asset URL from storage). */
export function getVideoPlayUrl(v: VideoSourceFields): string | null {
  if (v.source !== 'asset') return null;
  return v.assetUrl && v.assetUrl.trim() ? v.assetUrl.trim() : null;
}
