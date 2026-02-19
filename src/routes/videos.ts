import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Video } from '../models/Video';
import { Asset } from '../models/Asset';
import { Assessment } from '../models/Assessment';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getWellnessProfile } from '../services/wellnessProfile';
import { getVideoPlayUrl } from '../utils/videoUrl';

const router = Router();

const PAGE_LIMIT = 5; // videos per page — small so first paint is fast
const MAX_LIMIT = 10;

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
router.get('/', async (req: AuthRequest, res: Response) => {
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit), 10) || PAGE_LIMIT));
  const page  = Math.max(1, parseInt(String(req.query.page), 10) || 1);
  const skip  = (page - 1) * limit;

  const categoryParam = typeof req.query.category === 'string' ? req.query.category : '';
  const category = VALID_CATEGORIES.includes(categoryParam as typeof VALID_CATEGORIES[number])
    ? categoryParam
    : '';

  const recommended = req.query.recommended === 'true' && req.userId;
  const reelsOnly   = req.query.reels === 'true';

  // ── Build filter ──────────────────────────────────────────────────────────
  let filter: Record<string, unknown> = { isActive: true, source: 'asset' };

  // Category tab filter (takes priority over legacy tag filter)
  if (category) {
    filter.category = category;
  }

  // Legacy reels-only compat
  if (reelsOnly && !category) {
    (filter as { $or?: unknown[] }).$or = [
      { format: 'reel' },
      { durationSeconds: { $lte: 90 } },
      { durationSeconds: null },
    ];
  }

  // Personalised ordering when authenticated
  if (recommended && req.userId && !category) {
    const assessment = await Assessment.findOne({ userId: new mongoose.Types.ObjectId(req.userId) }).lean();
    const profile = getWellnessProfile(assessment);
    if (profile && profile.concerns.length > 0) {
      const andClauses: Record<string, unknown>[] = [
        { $or: [{ tags: { $in: profile.concerns } }, { fearAddressed: profile.primaryFear }] },
        { $or: [{ severityLevels: { $size: 0 } }, { severityLevels: profile.severityScore }] },
      ];
      if (reelsOnly) {
        andClauses.push({ $or: [{ format: 'reel' }, { durationSeconds: { $lte: 90 } }, { durationSeconds: null }] });
      }
      filter = { isActive: true, source: 'asset', $and: andClauses };
    }
  }

  // Legacy tag filter (kept for compat, ignored when category is set)
  if (!category) {
    const tagsStr = typeof req.query.tags === 'string' ? req.query.tags : '';
    if (tagsStr) {
      const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length > 0) (filter as { tags?: unknown }).tags = { $in: tags };
    }
  }

  // ── Query ─────────────────────────────────────────────────────────────────
  const [videos, total] = await Promise.all([
    Video.find(filter).sort({ viewCount: -1, _id: 1 }).skip(skip).limit(limit).lean(),
    Video.countDocuments(filter),
  ]);

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
      const assetId  = (v as { assetId: mongoose.Types.ObjectId }).assetId;
      const assetUrl = assetId ? assetUrlMap.get(String(assetId)) ?? null : null;
      const playUrl  = getVideoPlayUrl({ source: 'asset', assetUrl: assetUrl ?? null });
      return {
        id:             (v as { _id: unknown })._id,
        title:          (v as { title: string }).title,
        description:    (v as { description?: string }).description ?? '',
        duration:       (v as { duration?: string }).duration ?? '',
        durationSeconds:(v as { durationSeconds?: number | null }).durationSeconds ?? null,
        thumbnailUrl:   (v as { thumbnailUrl?: string }).thumbnailUrl ?? '',
        format:         (v as { format?: string }).format ?? 'reel',
        category:       (v as { category?: string | null }).category ?? null,
        assetId:        assetId ?? null,
        playUrl,
        tags:           (v as { tags?: string[] }).tags ?? [],
        viewCount:      (v as { viewCount?: number }).viewCount ?? 0,
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
      id:             (video as { _id: unknown })._id,
      title:          (video as { title: string }).title,
      description:    (video as { description?: string }).description ?? '',
      duration:       (video as { duration?: string }).duration ?? '',
      durationSeconds:(video as { durationSeconds?: number | null }).durationSeconds ?? null,
      thumbnailUrl:   (video as { thumbnailUrl?: string }).thumbnailUrl ?? '',
      format:         (video as { format?: string }).format ?? 'reel',
      category:       (video as { category?: string | null }).category ?? null,
      assetId:        assetId ?? null,
      playUrl,
      tags:           (video as { tags?: string[] }).tags ?? [],
      viewCount:      (video as { viewCount?: number }).viewCount ?? 0,
    },
  });
});

export const videoRoutes = router;
