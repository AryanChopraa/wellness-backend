import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { UserProgress } from '../models/UserProgress';
import { Exercise } from '../models/Exercise';
import { Assessment } from '../models/Assessment';
import { CheckIn } from '../models/CheckIn';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getWellnessProfile } from '../services/wellnessProfile';
import { get7DayPlan } from '../services/planService';

const router = Router();

/**
 * GET /progress — Current user's progress: streak, completed days, mood over time, today's exercise (auth required).
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const uid = new mongoose.Types.ObjectId(userId);

  const [progressList, assessment, latestCheckIn] = await Promise.all([
    UserProgress.find({ userId: uid }).sort({ dayNumber: 1 }).lean(),
    Assessment.findOne({ userId: uid }).lean(),
    CheckIn.findOne({ userId: uid }).sort({ weekNumber: -1 }).limit(1).lean(),
  ]);

  const profile = getWellnessProfile(assessment);
  const plan = profile ? await get7DayPlan(profile) : [];

  // Streak: consecutive days with completion, counting backward from today
  const dateSet = new Set(
    progressList.map((p) => {
      const d = (p as { completedAt?: Date }).completedAt;
      return d ? new Date(d).toDateString() : null;
    }).filter(Boolean) as string[]
  );
  let streak = 0;
  let check = new Date();
  for (let i = 0; i < 365; i++) {
    if (dateSet.has(check.toDateString())) streak++;
    else break;
    check.setDate(check.getDate() - 1);
  }

  const completed = progressList.map((p) => ({
    dayNumber: (p as { dayNumber: number }).dayNumber,
    exerciseId: (p as { exerciseId: unknown }).exerciseId,
    moodRating: (p as { moodRating?: number }).moodRating ?? null,
    completedAt: (p as { completedAt?: Date }).completedAt ?? null,
  }));

  const nextDay = completed.length + 1;
  const todayPlan = plan.find((p) => p.dayNumber === nextDay) ?? null;

  res.status(200).json({
    streak,
    completedCount: completed.length,
    completed,
    plan: plan,
    todayExercise: todayPlan,
    totalDaysInPlan: plan.length,
    latestCheckIn: latestCheckIn
      ? {
          weekNumber: (latestCheckIn as { weekNumber: number }).weekNumber,
          goalProximityPercent: (latestCheckIn as { goalProximityPercent?: number | null }).goalProximityPercent ?? null,
          feeling: (latestCheckIn as { feeling?: string | null }).feeling ?? null,
          whatHelped: (latestCheckIn as { whatHelped?: string[] }).whatHelped ?? [],
          createdAt: (latestCheckIn as { createdAt?: Date }).createdAt,
        }
      : null,
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
 * Body: { weekNumber: number, goalProximityPercent?: number (0-100), feeling?: string, whatHelped?: string[], noteForAlly?: string }
 */
router.post('/check-in', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const body = (req.body ?? {}) as {
    weekNumber?: number;
    goalProximityPercent?: number;
    feeling?: string;
    whatHelped?: string[];
    noteForAlly?: string;
  };

  const weekNumber = typeof body.weekNumber === 'number' ? body.weekNumber : parseInt(String(body.weekNumber), 10);
  if (!Number.isFinite(weekNumber) || weekNumber < 1 || weekNumber > 52) {
    res.status(400).json({ error: 'weekNumber must be 1-52' });
    return;
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
    { userId: new mongoose.Types.ObjectId(userId), weekNumber },
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
