import type { WellnessProfile } from '../types/assessment';

/** Lean assessment or document with required fields */
export interface AssessmentLike {
  age?: number;
  gender?: string;
  concerns: string[];
  urgencyScore: number;
  severityScore: number;
  relationshipStatus: string;
  goals: string[];
  supportHistory: string;
  stressLevel: number;
  primaryFear: string;
  learningStyle: string;
  preferredTime: string;
}

/**
 * Build wellness profile from an Assessment document for results page, Ally, recommendations.
 */
export function getWellnessProfile(assessment: AssessmentLike | null): WellnessProfile | null {
  if (!assessment) return null;

  const a = assessment as {
    age?: number;
    gender?: string;
    concerns: string[];
    urgencyScore: number;
    severityScore: number;
    relationshipStatus: string;
    goals: string[];
    supportHistory: string;
    stressLevel: number;
    primaryFear: string;
    learningStyle: string;
    preferredTime: string;
  };

  return {
    age: a.age,
    gender: a.gender as WellnessProfile['gender'],
    concerns: a.concerns as WellnessProfile['concerns'],
    urgencyScore: a.urgencyScore,
    severityScore: a.severityScore,
    relationshipStatus: a.relationshipStatus as WellnessProfile['relationshipStatus'],
    goals: a.goals as WellnessProfile['goals'],
    supportHistory: a.supportHistory as WellnessProfile['supportHistory'],
    stressLevel: a.stressLevel,
    primaryFear: a.primaryFear as WellnessProfile['primaryFear'],
    learningStyle: a.learningStyle as WellnessProfile['learningStyle'],
    preferredTime: a.preferredTime as WellnessProfile['preferredTime'],
  };
}

/**
 * Get notification hour (0-23) from preferred time for reminders.
 * Morning=7, Midday=12, Afternoon=15, Evening=19, Night=22, Varies=12.
 */
export function getNotificationHour(preferredTime: WellnessProfile['preferredTime']): number {
  const map: Record<string, number> = {
    morning: 7,
    midday: 12,
    afternoon: 15,
    evening: 19,
    night: 22,
    varies: 12,
  };
  return map[preferredTime] ?? 12;
}
