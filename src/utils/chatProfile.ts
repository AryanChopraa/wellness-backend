/** Wellness profile from Assessment (10-question flow) for Ally chat */
export interface WellnessProfileForChat {
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
 * Build Ally (wellness) chat context from wellness profile.
 * Used when user has completed the 10-question assessment.
 */
export function buildWellnessProfileForChat(profile: WellnessProfileForChat | null): string {
  if (!profile) {
    return 'No wellness profile provided; respond in a general, supportive way.';
  }
  const parts: string[] = [
    `Primary concerns: ${profile.concerns.join(', ')}.`,
    `They have been dealing with this: urgency level ${profile.urgencyScore}/4.`,
    `Severity (how much it affects daily life): ${profile.severityScore}/5.`,
    `Relationship status: ${profile.relationshipStatus.replace(/_/g, ' ')}.`,
    `Goals: ${profile.goals.join(', ').replace(/_/g, ' ')}.`,
    `Support history: ${profile.supportHistory.replace(/_/g, ' ')}.`,
    `Current stress level: ${profile.stressLevel}/10.`,
    `Biggest fear/worry: ${profile.primaryFear.replace(/_/g, ' ')}.`,
    `Learning style: ${profile.learningStyle}.`,
    `Preferred practice time: ${profile.preferredTime}.`,
  ];
  const tone =
    profile.severityScore >= 4
      ? 'Very gentle, extra validating, use "I understand" and "That makes sense" frequently.'
      : 'Supportive and encouraging.';
  parts.push(`TONE: ${tone} Never judgmental.`);
  return parts.join(' ');
}
