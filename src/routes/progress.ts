import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { UserProgress } from '../models/UserProgress';
import { Exercise } from '../models/Exercise';
import { Assessment } from '../models/Assessment';
import { CheckIn } from '../models/CheckIn';
import { User } from '../models/User';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getWellnessProfile } from '../services/wellnessProfile';
import { getActionableContent } from '../services/planService';
import { getVideoPlayUrl } from '../utils/videoUrl';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const router = Router();

/**
 * GET /progress — Actionable content + wellness profile (auth required). No streak, no check-in, no day plan.
 * For full home screen use GET /progress/dashboard (adds recommendedContent).
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const assessment = await Assessment.findOne({ userId: new mongoose.Types.ObjectId(req.userId!) }).lean();
  const profile = getWellnessProfile(assessment);
  const actionableContent = profile ? await getActionableContent(profile) : [];
  res.status(200).json({
    wellnessProfile: profile ? { concerns: profile.concerns, goals: profile.goals, primaryFear: profile.primaryFear } : null,
    actionableContent,
  });
});

/**
 * GET /progress/dashboard — Home screen: actionable content + wellness focus + recommended videos (auth required).
 * No check-in, no streak, no day plan. Just what the user can do and how to display each item.
 */
router.get('/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const assessment = await Assessment.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  const profile = getWellnessProfile(assessment);
  const actionableContent = profile ? await getActionableContent(profile) : [];

  const tags = profile?.concerns?.length ? profile.concerns : ['stress'];
  const { Video } = await import('../models/Video');
  const { Asset } = await import('../models/Asset');
  const recommendedVideos = await Video.find({
    isActive: true,
    source: 'asset',
    $or: [{ tags: { $in: tags } }, { fearAddressed: profile?.primaryFear }],
  })
    .sort({ viewCount: -1 })
    .limit(8)
    .lean();

  const recAssetIds = recommendedVideos
    .map((v) => (v as { assetId?: mongoose.Types.ObjectId }).assetId)
    .filter(Boolean) as mongoose.Types.ObjectId[];
  const recAssets = recAssetIds.length
    ? await Asset.find({ _id: { $in: recAssetIds } }).select('url').lean()
    : [];
  const recAssetUrlMap = new Map(recAssets.map((a) => [String((a as { _id: unknown })._id), (a as { url: string }).url]));

  res.status(200).json({
    wellnessProfile: profile
      ? {
          concerns: profile.concerns,
          goals: profile.goals,
          primaryFear: profile.primaryFear,
        }
      : null,
    actionableContent,
    recommendedContent: recommendedVideos.map((v) => {
      const assetId = (v as { assetId?: mongoose.Types.ObjectId }).assetId;
      const assetUrl = assetId ? recAssetUrlMap.get(String(assetId)) ?? null : null;
      const playUrl = getVideoPlayUrl({ source: 'asset', assetUrl: assetUrl ?? null });
      return {
        id: (v as { _id: unknown })._id,
        title: (v as { title: string }).title,
        description: (v as { description?: string }).description ?? '',
        duration: (v as { duration?: string }).duration ?? '',
        thumbnailUrl: (v as { thumbnailUrl?: string }).thumbnailUrl ?? '',
        format: (v as { format?: string }).format ?? 'reel',
        playUrl,
        tags: (v as { tags?: string[] }).tags ?? [],
      };
    }),
  });
});

/**
 * POST /progress — Record completion of an exercise (auth required).
 * Body: { exerciseId: string, dayNumber: number, moodRating?: number (1-5) }
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const body = (req.body ?? {}) as { exerciseId?: string; dayNumber?: number; moodRating?: number };

  if (!body.exerciseId || !mongoose.Types.ObjectId.isValid(body.exerciseId)) {
    res.status(400).json({ error: 'Valid exerciseId is required' });
    return;
  }
  const dayNumber = typeof body.dayNumber === 'number' ? body.dayNumber : parseInt(String(body.dayNumber), 10);
  if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 30) {
    res.status(400).json({ error: 'dayNumber must be 1-30' });
    return;
  }
  let moodRating: number | null = null;
  if (body.moodRating !== undefined && body.moodRating !== null) {
    const r = typeof body.moodRating === 'number' ? body.moodRating : parseInt(String(body.moodRating), 10);
    if (Number.isFinite(r) && r >= 1 && r <= 5) moodRating = r;
  }

  const uid = new mongoose.Types.ObjectId(userId);
  const exerciseId = new mongoose.Types.ObjectId(body.exerciseId);

  const existing = await Exercise.findById(exerciseId);
  if (!existing) {
    res.status(404).json({ error: 'Exercise not found' });
    return;
  }

  const progress = await UserProgress.findOneAndUpdate(
    { userId: uid, dayNumber },
    {
      $set: {
        exerciseId,
        completed: true,
        moodRating: moodRating ?? undefined,
        completedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  ).lean();

  res.status(201).json({
    message: 'Progress recorded',
    progress: {
      dayNumber: (progress as { dayNumber: number }).dayNumber,
      exerciseId: (progress as { exerciseId: unknown }).exerciseId,
      moodRating: (progress as { moodRating?: number }).moodRating ?? null,
      completedAt: (progress as { completedAt?: Date }).completedAt,
    },
  });
});

const FEELING_OPTIONS = ['much_better', 'somewhat_better', 'same', 'struggling_more'] as const;
const WHAT_HELPED_OPTIONS = ['daily_exercises', 'chatbot', 'community', 'videos', 'having_plan'] as const;

/**
 * POST /progress/check-in — Submit weekly check-in (auth required).
 * Simple yes/no: body can be {} — backend infers current week. All fields optional.
 * Body: { weekNumber?: number (optional; inferred from memberSince), goalProximityPercent?, feeling?, whatHelped?, noteForAlly? }
 */
router.post('/check-in', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const uid = new mongoose.Types.ObjectId(userId);
  const body = (req.body ?? {}) as {
    weekNumber?: number;
    goalProximityPercent?: number;
    feeling?: string;
    whatHelped?: string[];
    noteForAlly?: string;
  };

  const user = await User.findById(uid).select('createdAt').lean();
  const memberSince = (user as { createdAt?: Date } | null)?.createdAt ?? null;
  const currentWeekNumber = memberSince
    ? Math.max(1, Math.floor((Date.now() - new Date(memberSince).getTime()) / MS_PER_WEEK) + 1)
    : 1;

  let weekNumber = typeof body.weekNumber === 'number' ? body.weekNumber : parseInt(String(body.weekNumber), 10);
  if (!Number.isFinite(weekNumber) || weekNumber < 1 || weekNumber > 52) {
    weekNumber = currentWeekNumber;
  }

  const goalProximityPercent =
    body.goalProximityPercent != null
      ? Math.min(100, Math.max(0, Number(body.goalProximityPercent)))
      : null;
  const feeling =
    body.feeling && FEELING_OPTIONS.includes(body.feeling as (typeof FEELING_OPTIONS)[number])
      ? body.feeling
      : null;
  const whatHelped = Array.isArray(body.whatHelped)
    ? body.whatHelped.filter((h) => typeof h === 'string' && WHAT_HELPED_OPTIONS.includes(h as (typeof WHAT_HELPED_OPTIONS)[number]))
    : [];
  const noteForAlly = typeof body.noteForAlly === 'string' ? body.noteForAlly.trim().slice(0, 1000) : null;

  const checkIn = await CheckIn.findOneAndUpdate(
    { userId: uid, weekNumber },
    {
      $set: {
        goalProximityPercent,
        feeling,
        whatHelped,
        noteForAlly,
      },
    },
    { upsert: true, new: true }
  ).lean();

  res.status(201).json({
    message: 'Check-in saved',
    checkIn: {
      weekNumber: (checkIn as { weekNumber: number }).weekNumber,
      goalProximityPercent: (checkIn as { goalProximityPercent?: number | null }).goalProximityPercent ?? null,
      feeling: (checkIn as { feeling?: string | null }).feeling ?? null,
      whatHelped: (checkIn as { whatHelped?: string[] }).whatHelped ?? [],
      createdAt: (checkIn as { createdAt?: Date }).createdAt,
    },
  });
});

export const progressRoutes = router;
