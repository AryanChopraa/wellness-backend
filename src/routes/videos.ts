import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Video } from '../models/Video';
import { Asset } from '../models/Asset';
import { Assessment } from '../models/Assessment';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getWellnessProfile } from '../services/wellnessProfile';
import { getVideoPlayUrl } from '../utils/videoUrl';

const router = Router();
const DEFAULT_LIMIT = 20;

/**
 * GET /videos — List videos. If auth: "recommended for you" by assessment; else all.
 * Query: tags (comma), limit, recommended=true (when auth) to get personalized list.
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit), 10) || DEFAULT_LIMIT));
  const recommended = req.query.recommended === 'true' && req.userId;

  let filter: Record<string, unknown> = { isActive: true };

  if (recommended && req.userId) {
    const assessment = await Assessment.findOne({ userId: new mongoose.Types.ObjectId(req.userId) }).lean();
    const profile = getWellnessProfile(assessment);
    if (profile && profile.concerns.length > 0) {
      filter = {
        isActive: true,
        $and: [
          {
            $or: [
              { tags: { $in: profile.concerns } },
              { fearAddressed: profile.primaryFear },
            ],
          },
          {
            $or: [
              { severityLevels: { $size: 0 } },
              { severityLevels: profile.severityScore },
            ],
          },
        ],
      };
    }
  }

  const tagsStr = typeof req.query.tags === 'string' ? req.query.tags : '';
  if (tagsStr) {
    const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) (filter as { tags?: unknown }).tags = { $in: tags };
  }

  const videos = await Video.find(filter).sort({ viewCount: -1 }).limit(limit).lean();

  const assetIds = videos
    .filter((v) => (v as { source?: string }).source === 'asset' && (v as { assetId?: unknown }).assetId)
    .map((v) => (v as { assetId: mongoose.Types.ObjectId }).assetId);
  const assets = assetIds.length
    ? await Asset.find({ _id: { $in: assetIds } }).select('url').lean()
    : [];
  const assetUrlMap = new Map(assets.map((a) => [String((a as { _id: unknown })._id), (a as { url: string }).url]));

  res.status(200).json({
    videos: videos.map((v) => {
      const source = (v as { source?: string }).source ?? 'url';
      const assetId = (v as { assetId?: mongoose.Types.ObjectId }).assetId;
      const assetUrl = assetId ? assetUrlMap.get(String(assetId)) ?? null : null;
      const playUrl = getVideoPlayUrl({
        source,
        externalId: (v as { externalId?: string | null }).externalId ?? null,
        videoUrl: (v as { videoUrl?: string | null }).videoUrl ?? null,
        assetUrl: assetUrl ?? null,
      });
      return {
        id: (v as { _id: unknown })._id,
        title: (v as { title: string }).title,
        description: (v as { description?: string }).description ?? '',
        duration: (v as { duration?: string }).duration ?? '',
        thumbnailUrl: (v as { thumbnailUrl?: string }).thumbnailUrl ?? '',
        source,
        externalId: (v as { externalId?: string | null }).externalId ?? null,
        videoUrl: (v as { videoUrl?: string | null }).videoUrl ?? null,
        assetId: assetId ?? null,
        playUrl,
        tags: (v as { tags?: string[] }).tags ?? [],
        viewCount: (v as { viewCount?: number }).viewCount ?? 0,
      };
    }),
  });
});

/** GET /videos/:id — Get one video by id. */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({ error: 'Video not found' });
    return;
  }
  const video = await Video.findById(id).lean();
  if (!video) {
    res.status(404).json({ error: 'Video not found' });
    return;
  }
  const source = (video as { source?: string }).source ?? 'url';
  const assetId = (video as { assetId?: mongoose.Types.ObjectId }).assetId;
  let assetUrl: string | null = null;
  if (source === 'asset' && assetId) {
    const asset = await Asset.findById(assetId).select('url').lean();
    assetUrl = asset ? (asset as { url: string }).url : null;
  }
  const playUrl = getVideoPlayUrl({
    source,
    externalId: (video as { externalId?: string | null }).externalId ?? null,
    videoUrl: (video as { videoUrl?: string | null }).videoUrl ?? null,
    assetUrl,
  });
  res.status(200).json({
    video: {
      id: (video as { _id: unknown })._id,
      title: (video as { title: string }).title,
      description: (video as { description?: string }).description ?? '',
      duration: (video as { duration?: string }).duration ?? '',
      thumbnailUrl: (video as { thumbnailUrl?: string }).thumbnailUrl ?? '',
      source,
      externalId: (video as { externalId?: string | null }).externalId ?? null,
      videoUrl: (video as { videoUrl?: string | null }).videoUrl ?? null,
      assetId: assetId ?? null,
      playUrl,
      tags: (video as { tags?: string[] }).tags ?? [],
      viewCount: (video as { viewCount?: number }).viewCount ?? 0,
    },
  });
});

export const videoRoutes = router;
