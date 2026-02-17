import mongoose from 'mongoose';
import { Exercise } from '../models/Exercise';
import type { WellnessProfile } from '../types/assessment';

/** Display type for frontend: breathing = "X min breathing" card, exercise = exercise card, read = blog/lesson */
export type ActionableDisplayType = 'breathing' | 'exercise' | 'read';

export interface ActionableItem {
  id: string;
  displayType: ActionableDisplayType;
  title: string;
  description: string;
  /** Actual body/instructions to show (blog text, exercise steps). Null if use contentUrl instead. */
  content: string | null;
  /** Link to external article/audio/video. Use when content is null or for "open in browser". */
  contentUrl: string | null;
  durationMinutes: number;
  durationLabel: string;
  type: string;
}

function durationLabel(minutes: number): string {
  if (minutes < 1) return '1 min';
  return `${minutes} min`;
}

/**
 * Get personalized actionable content (exercises, breathing, reads) for the home screen.
 * No day plan or streak — just a list of things the user can do, with exact display instructions.
 */
export async function getActionableContent(profile: WellnessProfile): Promise<ActionableItem[]> {
  const tags = profile.concerns.length > 0 ? profile.concerns : ['stress'];
  const goals = profile.goals.length > 0 ? profile.goals : ['healthy_habits'];
  const severity = profile.severityScore;
  const highStress = profile.stressLevel > 7;

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
    .limit(20)
    .lean();

  const list = exercises as Array<{
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    content?: string | null;
    contentUrl?: string | null;
    durationMinutes: number;
    phase: number;
    order: number;
    type: string;
    displayType?: string;
  }>;

  const stressFirst = highStress
    ? list.filter((e) => (e as { tags?: string[] }).tags?.includes('stress') || (e as { tags?: string[] }).tags?.includes('anxiety'))
    : [];
  const rest = list.filter((e) => !stressFirst.includes(e));
  const ordered = [...stressFirst, ...rest].slice(0, 15);

  return ordered.map((ex) => {
    const displayType = (ex.displayType === 'breathing' || ex.displayType === 'read' ? ex.displayType : 'exercise') as ActionableDisplayType;
    return {
      id: (ex._id as mongoose.Types.ObjectId).toString(),
      displayType,
      title: ex.title,
      description: ex.description,
      content: ex.content ?? null,
      contentUrl: ex.contentUrl ?? null,
      durationMinutes: ex.durationMinutes,
      durationLabel: durationLabel(ex.durationMinutes),
      type: ex.type,
    };
  });
}

/**
 * Legacy: 7-day plan (for backward compat). Prefer getActionableContent for new dashboard.
 */
export async function get7DayPlan(profile: WellnessProfile): Promise<{ dayNumber: number; exerciseId: string; title: string; durationMinutes: number }[]> {
  const items = await getActionableContent(profile);
  return items.slice(0, 7).map((item, i) => ({
    dayNumber: i + 1,
    exerciseId: item.id,
    title: item.title,
    durationMinutes: item.durationMinutes,
  }));
}
