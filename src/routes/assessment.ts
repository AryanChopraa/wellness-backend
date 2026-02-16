import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Assessment, durationToUrgency, severityOptionToScore } from '../models/Assessment';
import { User } from '../models/User';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getWellnessProfile } from '../services/wellnessProfile';
import { get7DayPlan } from '../services/planService';
import type {
  AssessmentSubmitBody,
  ConcernTag,
  DurationOption,
  SeverityOption,
  RelationshipStatusOption,
  GoalTag,
  SupportHistoryOption,
  PrimaryFearOption,
  LearningStyleOption,
  PreferredTimeOption,
} from '../types/assessment';

const router = Router();

const CONCERN_TAGS_SET = new Set<string>([
  'performance', 'anxiety', 'communication', 'relationships', 'body_image', 'confidence',
  'sexual_health', 'education', 'loneliness', 'social_wellness', 'stress', 'mental_health', 'exploring',
]);
const DURATION_OPTIONS_SET = new Set<string>(['recently', 'few_months', 'over_a_year', 'years']);
const SEVERITY_OPTIONS_SET = new Set<string>([
  'occasionally', 'think_regularly', 'affecting_confidence', 'impacting_relationships', 'avoiding_situations',
]);
const RELATIONSHIP_OPTIONS_SET = new Set<string>(['yes_they_know', 'yes_havent_shared', 'no_single', 'complicated']);
const GOAL_TAGS_SET = new Set<string>([
  'confident_intimate', 'better_communication', 'body_confidence', 'less_anxiety',
  'enjoying_without_overthinking', 'feeling_normal', 'healthy_habits',
]);
const SUPPORT_HISTORY_SET = new Set<string>(['yes_therapist', 'yes_friends_family', 'no_first_time', 'tried_not_helpful']);
const PRIMARY_FEAR_SET = new Set<string>([
  'never_get_better', 'broken_abnormal', 'partner_will_leave', 'never_confident', 'alone_in_this', 'all_in_my_head',
]);
const LEARNING_STYLE_SET = new Set<string>(['videos', 'reading', 'interactive', 'talking', 'mix']);
const PREFERRED_TIME_SET = new Set<string>(['morning', 'midday', 'afternoon', 'evening', 'night', 'varies']);

function validateConcerns(arr: unknown): arr is ConcernTag[] {
  return Array.isArray(arr) && arr.length >= 1 && arr.length <= 3 && arr.every((c) => typeof c === 'string' && CONCERN_TAGS_SET.has(c));
}
function validateGoals(arr: unknown): arr is GoalTag[] {
  return Array.isArray(arr) && arr.length >= 1 && arr.length <= 3 && arr.every((g) => typeof g === 'string' && GOAL_TAGS_SET.has(g));
}

/**
 * POST /assessment — Submit 10-question wellness assessment (auth required).
 * Creates or replaces assessment for current user. Sets user.hasOnboarded if not already.
 */
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const body = (req.body ?? {}) as Partial<AssessmentSubmitBody>;

  if (!validateConcerns(body.concerns)) {
    res.status(400).json({ error: 'concerns is required: array of 1-3 valid concern tags' });
    return;
  }
  if (!body.duration || !DURATION_OPTIONS_SET.has(body.duration)) {
    res.status(400).json({ error: 'duration is required and must be one of: recently, few_months, over_a_year, years' });
    return;
  }
  if (!body.severity || !SEVERITY_OPTIONS_SET.has(body.severity)) {
    res.status(400).json({ error: 'severity is required and must be one of: occasionally, think_regularly, affecting_confidence, impacting_relationships, avoiding_situations' });
    return;
  }
  if (!body.relationshipStatus || !RELATIONSHIP_OPTIONS_SET.has(body.relationshipStatus)) {
    res.status(400).json({ error: 'relationshipStatus is required and must be one of: yes_they_know, yes_havent_shared, no_single, complicated' });
    return;
  }
  if (!validateGoals(body.goals)) {
    res.status(400).json({ error: 'goals is required: array of 1-3 valid goal tags' });
    return;
  }
  if (!body.supportHistory || !SUPPORT_HISTORY_SET.has(body.supportHistory)) {
    res.status(400).json({ error: 'supportHistory is required and must be one of: yes_therapist, yes_friends_family, no_first_time, tried_not_helpful' });
    return;
  }
  const stressLevel = typeof body.stressLevel === 'number' ? body.stressLevel : parseInt(String(body.stressLevel), 10);
  if (!Number.isFinite(stressLevel) || stressLevel < 1 || stressLevel > 10) {
    res.status(400).json({ error: 'stressLevel is required and must be 1-10' });
    return;
  }
  if (!body.primaryFear || !PRIMARY_FEAR_SET.has(body.primaryFear)) {
    res.status(400).json({ error: 'primaryFear is required and must be one of: never_get_better, broken_abnormal, partner_will_leave, never_confident, alone_in_this, all_in_my_head' });
    return;
  }
  if (!body.learningStyle || !LEARNING_STYLE_SET.has(body.learningStyle)) {
    res.status(400).json({ error: 'learningStyle is required and must be one of: videos, reading, interactive, talking, mix' });
    return;
  }
  if (!body.preferredTime || !PREFERRED_TIME_SET.has(body.preferredTime)) {
    res.status(400).json({ error: 'preferredTime is required and must be one of: morning, midday, afternoon, evening, night, varies' });
    return;
  }

  const urgencyScore = durationToUrgency(body.duration as DurationOption);
  const severityScore = severityOptionToScore(body.severity as SeverityOption);

  const payload = {
    userId: new mongoose.Types.ObjectId(userId),
    concerns: body.concerns!,
    duration: body.duration!,
    urgencyScore,
    severityOption: body.severity!,
    severityScore,
    relationshipStatus: body.relationshipStatus!,
    goals: body.goals!,
    supportHistory: body.supportHistory!,
    stressLevel,
    primaryFear: body.primaryFear!,
    learningStyle: body.learningStyle!,
    preferredTime: body.preferredTime!,
  };

  const assessment = await Assessment.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId) },
    { $set: payload },
    { upsert: true, new: true }
  ).lean();

  await User.findByIdAndUpdate(userId, { $set: { hasOnboarded: true } });

  const profile = getWellnessProfile(assessment);
  res.status(200).json({
    message: 'Assessment saved',
    assessment: {
      id: (assessment as { _id: unknown })._id,
      concerns: (assessment as { concerns: string[] }).concerns,
      urgencyScore: (assessment as { urgencyScore: number }).urgencyScore,
      severityScore: (assessment as { severityScore: number }).severityScore,
      relationshipStatus: (assessment as { relationshipStatus: string }).relationshipStatus,
      goals: (assessment as { goals: string[] }).goals,
      supportHistory: (assessment as { supportHistory: string }).supportHistory,
      stressLevel: (assessment as { stressLevel: number }).stressLevel,
      primaryFear: (assessment as { primaryFear: string }).primaryFear,
      learningStyle: (assessment as { learningStyle: string }).learningStyle,
      preferredTime: (assessment as { preferredTime: string }).preferredTime,
      completedAt: (assessment as { updatedAt?: Date }).updatedAt,
    },
    wellnessProfile: profile ?? undefined,
  });
});

/** GET /assessment — Get current user's assessment (auth required). */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const assessment = await Assessment.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  if (!assessment) {
    res.status(200).json({ assessment: null, wellnessProfile: null });
    return;
  }
  const profile = getWellnessProfile(assessment);
  res.status(200).json({
    assessment: {
      id: (assessment as { _id: unknown })._id,
      concerns: (assessment as { concerns: string[] }).concerns,
      urgencyScore: (assessment as { urgencyScore: number }).urgencyScore,
      severityScore: (assessment as { severityScore: number }).severityScore,
      relationshipStatus: (assessment as { relationshipStatus: string }).relationshipStatus,
      goals: (assessment as { goals: string[] }).goals,
      supportHistory: (assessment as { supportHistory: string }).supportHistory,
      stressLevel: (assessment as { stressLevel: number }).stressLevel,
      primaryFear: (assessment as { primaryFear: string }).primaryFear,
      learningStyle: (assessment as { learningStyle: string }).learningStyle,
      preferredTime: (assessment as { preferredTime: string }).preferredTime,
      completedAt: (assessment as { updatedAt?: Date }).updatedAt,
    },
    wellnessProfile: profile ?? undefined,
  });
});

/** GET /assessment/wellness-profile — Get computed wellness profile for results page / personalization (auth required). */
router.get('/wellness-profile', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const assessment = await Assessment.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  const profile = getWellnessProfile(assessment);
  if (!profile) {
    res.status(404).json({ error: 'No assessment found. Complete the assessment first.' });
    return;
  }
  res.status(200).json({ wellnessProfile: profile });
});

/** GET /assessment/plan — Get personalized 7-day plan (auth required, requires completed assessment). */
router.get('/plan', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const assessment = await Assessment.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  const profile = getWellnessProfile(assessment);
  if (!profile) {
    res.status(404).json({ error: 'Complete the assessment first to get your personalized plan.' });
    return;
  }
  const plan = await get7DayPlan(profile);
  res.status(200).json({ plan });
});

export const assessmentRoutes = router;
