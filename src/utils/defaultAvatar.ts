/**
 * Default pixelated avatar when user has no profile picture.
 * Uses DiceBear pixel-art API; seed determines the avatar (same seed = same avatar).
 * Pass userId + optional gender so default varies by user and gender (e.g. male/female).
 */
const DICEBEAR_BASE = 'https://api.dicebear.com/9.x/pixel-art/svg';

export function getDefaultAvatarUrl(seed: string, gender?: string | null): string {
  const safeSeed = [seed, gender].filter(Boolean).join('-').replace(/[^a-zA-Z0-9_-]/g, '') || seed;
  return `${DICEBEAR_BASE}?seed=${encodeURIComponent(safeSeed)}`;
}
