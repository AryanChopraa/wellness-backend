/**
 * Build a short user profile string from legacy profile (old questionnaire) for the chat AI.
 * Used when user has no Assessment; omits "prefer-not-to-say" and missing fields.
 */
export interface OnboardingForProfile {
  age?: number;
  gender?: string;
  relationshipStatus?: string;
  mainInterests?: string[];
  sexualExperience?: string;
  physicalActivityLevel?: string;
  selfRatedInBed?: string;
  whatToImproveChat?: string;
  intimacyComfortLevel?: string;
}

export function buildUserProfile(onboarding: OnboardingForProfile | null): string {
  if (!onboarding) {
    return 'No profile provided; respond in a general, inclusive way.';
  }

  const skip = 'prefer-not-to-say';
  const parts: string[] = [];

  const gender = onboarding.gender && onboarding.gender !== skip ? onboarding.gender : null;
  const age = typeof onboarding.age === 'number' && onboarding.age >= 18 ? onboarding.age : null;
  if (gender || age) {
    const bits = [];
    if (gender) bits.push(`a ${gender}`);
    if (age) bits.push(`age ${age}`);
    parts.push(`User is ${bits.join(', ')}.`);
  }

  const sexualExp =
    onboarding.sexualExperience && onboarding.sexualExperience !== skip
      ? onboarding.sexualExperience
      : null;
  if (sexualExp) {
    parts.push(`Sexual experience: ${sexualExp.replace(/-/g, ' ')}.`);
  }

  const rel =
    onboarding.relationshipStatus && onboarding.relationshipStatus !== skip
      ? onboarding.relationshipStatus
      : null;
  if (rel) {
    parts.push(`Relationship: ${rel}.`);
  }

  const interests =
    Array.isArray(onboarding.mainInterests) && onboarding.mainInterests.length > 0
      ? onboarding.mainInterests.filter((i) => i && i !== skip)
      : [];
  if (interests.length > 0) {
    parts.push(`Main interests: ${interests.join(', ').replace(/-/g, ' ')}.`);
  }

  const activity =
    onboarding.physicalActivityLevel && onboarding.physicalActivityLevel !== skip
      ? onboarding.physicalActivityLevel
      : null;
  if (activity) {
    parts.push(`Physical activity level: ${activity}.`);
  }

  const selfRated =
    onboarding.selfRatedInBed && onboarding.selfRatedInBed !== skip
      ? onboarding.selfRatedInBed.replace(/-/g, ' ')
      : null;
  if (selfRated) {
    parts.push(`Self-rated in bed: ${selfRated}.`);
  }

  const toImprove =
    onboarding.whatToImproveChat && onboarding.whatToImproveChat !== skip
      ? onboarding.whatToImproveChat
      : null;
  if (toImprove) {
    parts.push(`Wants to improve: ${toImprove}.`);
  }

  const comfort =
    onboarding.intimacyComfortLevel && onboarding.intimacyComfortLevel !== skip
      ? onboarding.intimacyComfortLevel.replace(/-/g, ' ')
      : null;
  if (comfort) {
    parts.push(`Intimacy comfort level: ${comfort}.`);
  }

  return parts.length > 0 ? parts.join(' ') : 'No profile provided; respond in a general, inclusive way.';
}

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
