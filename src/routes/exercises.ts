import { Router, Response } from 'express';
import { Exercise } from '../models/Exercise';
import { requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();
const DEFAULT_LIMIT = 50;

/**
 * GET /exercises — List exercises (auth optional for public library).
 * Query: tags (comma-separated), goalTags (comma-separated), severity (1-5), limit.
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  const tagsStr = typeof req.query.tags === 'string' ? req.query.tags : '';
  const goalTagsStr = typeof req.query.goalTags === 'string' ? req.query.goalTags : '';
  const severity = req.query.severity != null ? parseInt(String(req.query.severity), 10) : null;
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || DEFAULT_LIMIT));

  const filter: Record<string, unknown> = { isActive: true };

  if (tagsStr) {
    const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length > 0) filter.tags = { $in: tags };
  }
  if (goalTagsStr) {
    const goalTags = goalTagsStr.split(',').map((t) => t.trim()).filter(Boolean);
    if (goalTags.length > 0) filter.goalTags = { $in: goalTags };
  }
  if (Number.isFinite(severity) && severity! >= 1 && severity! <= 5) {
    (filter as { $or?: unknown[] }).$or = [
      { severityLevels: { $size: 0 } },
      { severityLevels: severity! },
    ];
  }

  const exercises = await Exercise.find(filter).sort({ phase: 1, order: 1 }).limit(limit).lean();

  res.status(200).json({
    exercises: exercises.map((e) => {
      const durationMinutes = (e as { durationMinutes: number }).durationMinutes;
      const displayType = (e as { displayType?: string }).displayType ?? 'exercise';
      return {
        id: (e as { _id: unknown })._id,
        title: (e as { title: string }).title,
        description: (e as { description: string }).description,
        content: (e as { content?: string | null }).content ?? null,
        contentUrl: (e as { contentUrl?: string | null }).contentUrl ?? null,
        type: (e as { type: string }).type,
        displayType: displayType === 'breathing' || displayType === 'read' ? displayType : 'exercise',
        durationMinutes,
        durationLabel: durationMinutes < 1 ? '1 min' : `${durationMinutes} min`,
        tags: (e as { tags?: string[] }).tags ?? [],
        goalTags: (e as { goalTags?: string[] }).goalTags ?? [],
        phase: (e as { phase?: number }).phase ?? 1,
        order: (e as { order?: number }).order ?? 0,
      };
    }),
  });
});

export const exerciseRoutes = router;
