import mongoose from 'mongoose';
import { Exercise } from '../models/Exercise';
import type { WellnessProfile } from '../types/assessment';

/**
 * Generate a 7-day personalized plan (exercise IDs) based on wellness profile.
 * Rule-based: match tags, goals, severity; prioritize stress if stressLevel > 7.
 */
export async function get7DayPlan(profile: WellnessProfile): Promise<{ dayNumber: number; exerciseId: string; title: string; durationMinutes: number }[]> {
  const tags = profile.concerns.length > 0 ? profile.concerns : ['stress'];
  const goals = profile.goals.length > 0 ? profile.goals : ['healthy_habits'];
  const severity = profile.severityScore;
  const highStress = profile.stressLevel > 7;

  // Fetch exercises that match any of the user's tags or goals; optional severity filter
  const exercises = await Exercise.find({
    isActive: true,
    $and: [
      {
        $or: [
          { tags: { $in: tags } },
          { goalTags: { $in: goals } },
        ],
      },
      {
        $or: [
          { severityLevels: { $size: 0 } },
          { severityLevels: severity },
        ],
      },
    ],
  })
    .sort({ phase: 1, order: 1 })
    .limit(30)
    .lean();

  const list = exercises as Array<{
    _id: mongoose.Types.ObjectId;
    title: string;
    durationMinutes: number;
    phase: number;
    order: number;
  }>;

  // If high stress, prefer exercises tagged with stress/anxiety first
  const stressFirst = highStress
    ? list.filter((e) => (e as { tags?: string[] }).tags?.includes('stress') || (e as { tags?: string[] }).tags?.includes('anxiety'))
    : [];
  const rest = list.filter((e) => !stressFirst.includes(e));
  const ordered = [...stressFirst, ...rest].slice(0, 7);

  return ordered.map((ex, i) => ({
    dayNumber: i + 1,
    exerciseId: (ex._id as mongoose.Types.ObjectId).toString(),
    title: ex.title,
    durationMinutes: ex.durationMinutes,
  }));
}
