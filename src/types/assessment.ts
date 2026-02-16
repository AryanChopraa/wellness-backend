/**
 * Types for the 10-question wellness assessment (enhanced workflow).
 * Used for personalized plan, Ally chat, exercises, videos, and community "For You".
 */

/** Q1: What brings you here today? (1–3 selections) */
export const CONCERN_TAGS = [
  'performance',
  'anxiety',
  'communication',
  'relationships',
  'body_image',
  'confidence',
  'sexual_health',
  'education',
  'loneliness',
  'social_wellness',
  'stress',
  'mental_health',
  'exploring',
] as const;
export type ConcernTag = (typeof CONCERN_TAGS)[number];

/** Q2: How long has this been on your mind? → urgency 1–4 */
export const DURATION_OPTIONS = [
  'recently',
  'few_months',
  'over_a_year',
  'years',
] as const;
export type DurationOption = (typeof DURATION_OPTIONS)[number];

/** Q3: How is this affecting your daily life? → severity 1–5 */
export const SEVERITY_OPTIONS = [
  'occasionally',
  'think_regularly',
  'affecting_confidence',
  'impacting_relationships',
  'avoiding_situations',
] as const;
export type SeverityOption = (typeof SEVERITY_OPTIONS)[number];

/** Q4: Are you currently in a relationship? */
export const RELATIONSHIP_STATUS_OPTIONS = [
  'yes_they_know',
  'yes_havent_shared',
  'no_single',
  'complicated',
] as const;
export type RelationshipStatusOption = (typeof RELATIONSHIP_STATUS_OPTIONS)[number];

/** Q5: What would "better" look like? (max 3) */
export const GOAL_TAGS = [
  'confident_intimate',
  'better_communication',
  'body_confidence',
  'less_anxiety',
  'enjoying_without_overthinking',
  'feeling_normal',
  'healthy_habits',
] as const;
export type GoalTag = (typeof GOAL_TAGS)[number];

/** Q6: Have you talked to anyone about this before? */
export const SUPPORT_HISTORY_OPTIONS = [
  'yes_therapist',
  'yes_friends_family',
  'no_first_time',
  'tried_not_helpful',
] as const;
export type SupportHistoryOption = (typeof SUPPORT_HISTORY_OPTIONS)[number];

/** Q8: What's your biggest fear or worry? */
export const PRIMARY_FEAR_OPTIONS = [
  'never_get_better',
  'broken_abnormal',
  'partner_will_leave',
  'never_confident',
  'alone_in_this',
  'all_in_my_head',
] as const;
export type PrimaryFearOption = (typeof PRIMARY_FEAR_OPTIONS)[number];

/** Q9: How do you prefer to learn and grow? */
export const LEARNING_STYLE_OPTIONS = [
  'videos',
  'reading',
  'interactive',
  'talking',
  'mix',
] as const;
export type LearningStyleOption = (typeof LEARNING_STYLE_OPTIONS)[number];

/** Q10: What time of day works best for self-care? */
export const PREFERRED_TIME_OPTIONS = [
  'morning',   // 6–10
  'midday',    // 10–14
  'afternoon', // 14–18
  'evening',   // 18–22
  'night',     // 22–2
  'varies',
] as const;
export type PreferredTimeOption = (typeof PREFERRED_TIME_OPTIONS)[number];

/** Request body for POST /assessment */
export interface AssessmentSubmitBody {
  /** Q1: 1–3 concern tags */
  concerns: ConcernTag[];
  /** Q2 */
  duration: DurationOption;
  /** Q3 */
  severity: SeverityOption;
  /** Q4 */
  relationshipStatus: RelationshipStatusOption;
  /** Q5: max 3 goal tags */
  goals: GoalTag[];
  /** Q6 */
  supportHistory: SupportHistoryOption;
  /** Q7: 1–10 */
  stressLevel: number;
  /** Q8 */
  primaryFear: PrimaryFearOption;
  /** Q9 */
  learningStyle: LearningStyleOption;
  /** Q10 */
  preferredTime: PreferredTimeOption;
}

/** Computed wellness profile returned for results page, Ally, recommendations */
export interface WellnessProfile {
  concerns: ConcernTag[];
  urgencyScore: number;       // 1–4 from Q2
  severityScore: number;       // 1–5 from Q3
  relationshipStatus: RelationshipStatusOption;
  goals: GoalTag[];
  supportHistory: SupportHistoryOption;
  stressLevel: number;         // 1–10
  primaryFear: PrimaryFearOption;
  learningStyle: LearningStyleOption;
  preferredTime: PreferredTimeOption;
}
