import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Video } from '../models/Video';
import { Asset } from '../models/Asset';
import { optionalAuth, type AuthRequest } from '../middleware/auth';
import { getVideoPlayUrl } from '../utils/videoUrl';

const router = Router();

const PAGE_LIMIT = 10; // videos per page
const MAX_LIMIT = 20;

const VALID_CATEGORIES = ['stamina', 'pleasure', 'dating', 'education', 'confidence'] as const;

/**
 * GET /videos
 * Query params:
 *   category   — one of the 5 categories (filter)
 *   page       — 1-based page number (default 1)
 *   limit      — items per page (default 5, max 10)
 *   recommended — 'true' + auth → personalised order
 *   reels      — 'true' → short-form only (legacy, kept for compat)
 *   tags       — comma-separated (legacy)
 *
 * Response: { videos, total, page, hasMore }
 */
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit), 10) || PAGE_LIMIT));
  const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const skip = (page - 1) * limit;

  const categoryParam = typeof req.query.category === 'string' ? req.query.category : '';
  const category = VALID_CATEGORIES.includes(categoryParam as typeof VALID_CATEGORIES[number])
    ? categoryParam
    : '';

  const reelsOnly = req.query.reels === 'true';

  // ── Build filter ────────────────────────────────────────────────────────────
  // Always show ALL active asset videos - the seeded shuffle already provides
  // a fresh, unique ordering per user. Assessment-based narrowing caused feeds
  // to stop at just 2-3 videos whose tags happened to match.
  const filter: Record<string, unknown> = { isActive: true, source: 'asset' };

  // Category tab filter
  if (category) {
    filter.category = category;
  }

  // ── Query (Seeded Random) ──────────────────────────────────────────────────
  // We fetch all matching IDs, shuffle them with a seed (hourly + user-based),
  // and then fetch the full documents for the current page. This ensures 
  // randomness while keeping pagination stable within the same hour.
  const allVideosMeta = await Video.find(filter).select('_id').lean();
  const total = allVideosMeta.length;

  // Create a seed that changes every hour but is unique-ish per user/IP
  const seedStr = (req.userId || req.ip || 'guest') + '-' + Math.floor(Date.now() / 3600000);
  let seedNum = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seedNum = (seedNum << 5) - seedNum + seedStr.charCodeAt(i);
    seedNum |= 0;
  }

  // Linear Congruential Generator for seeded randomness
  const seededRandom = () => {
    seedNum = (seedNum * 1664525 + 1013904223) | 0;
    return (seedNum >>> 0) / 4294967296;
  };

  const shuffledIds = allVideosMeta.map((v) => v._id);
  for (let i = shuffledIds.length - 1; i > 0; i--) {
    const j = Math.floor(seededRandom() * (i + 1));
    [shuffledIds[i], shuffledIds[j]] = [shuffledIds[j], shuffledIds[i]];
  }

  const pageIds = shuffledIds.slice(skip, skip + limit);
  const videosUnordered = await Video.find({ _id: { $in: pageIds } }).lean();

  // Re-sort results to match the shuffled ID order
  const videos = pageIds
    .map((id) => videosUnordered.find((v) => String((v as { _id: unknown })._id) === String(id)))
    .filter(Boolean);

  const hasMore = skip + videos.length < total;

  // ── Resolve asset URLs ────────────────────────────────────────────────────
  const assetIds = videos
    .map((v) => (v as { assetId?: mongoose.Types.ObjectId }).assetId)
    .filter(Boolean) as mongoose.Types.ObjectId[];
  const assets = assetIds.length
    ? await Asset.find({ _id: { $in: assetIds } }).select('url').lean()
    : [];
  const assetUrlMap = new Map(assets.map((a) => [String((a as { _id: unknown })._id), (a as { url: string }).url]));

  res.status(200).json({
    videos: videos.map((v) => {
      const assetId = (v as { assetId: mongoose.Types.ObjectId }).assetId;
      const assetUrl = assetId ? assetUrlMap.get(String(assetId)) ?? null : null;
      const playUrl = getVideoPlayUrl({ source: 'asset', assetUrl: assetUrl ?? null });
      return {
        id: (v as { _id: unknown })._id,
        title: (v as { title: string }).title,
        description: (v as { description?: string }).description ?? '',
        duration: (v as { duration?: string }).duration ?? '',
        durationSeconds: (v as { durationSeconds?: number | null }).durationSeconds ?? null,
        thumbnailUrl: (v as { thumbnailUrl?: string }).thumbnailUrl ?? '',
        format: (v as { format?: string }).format ?? 'reel',
        category: (v as { category?: string | null }).category ?? null,
        assetId: assetId ?? null,
        playUrl,
        tags: (v as { tags?: string[] }).tags ?? [],
        viewCount: (v as { viewCount?: number }).viewCount ?? 0,
      };
    }),
    total,
    page,
    hasMore,
  });
});

/** GET /videos/:id — single video */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({ error: 'Video not found' });
    return;
  }
  const video = await Video.findById(id).lean();
  if (!video || (video as { source?: string }).source !== 'asset') {
    res.status(404).json({ error: 'Video not found' });
    return;
  }
  const assetId = (video as { assetId?: mongoose.Types.ObjectId }).assetId;
  let assetUrl: string | null = null;
  if (assetId) {
    const asset = await Asset.findById(assetId).select('url').lean();
    assetUrl = asset ? (asset as { url: string }).url : null;
  }
  const playUrl = getVideoPlayUrl({ source: 'asset', assetUrl });
  res.status(200).json({
    video: {
      id: (video as { _id: unknown })._id,
      title: (video as { title: string }).title,
      description: (video as { description?: string }).description ?? '',
      duration: (video as { duration?: string }).duration ?? '',
      durationSeconds: (video as { durationSeconds?: number | null }).durationSeconds ?? null,
      thumbnailUrl: (video as { thumbnailUrl?: string }).thumbnailUrl ?? '',
      format: (video as { format?: string }).format ?? 'reel',
      category: (video as { category?: string | null }).category ?? null,
      assetId: assetId ?? null,
      playUrl,
      tags: (video as { tags?: string[] }).tags ?? [],
      viewCount: (video as { viewCount?: number }).viewCount ?? 0,
    },
  });
});

export const videoRoutes = router;
