/**
 * Build a short user profile string from onboarding (and optionally user) for the chat AI.
 * Used to personalize Venice chat system prompt. Omits "prefer-not-to-say" and missing fields.
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
