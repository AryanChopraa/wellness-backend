export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
export type RelationshipStatus = 'single' | 'dating' | 'married' | 'complicated';
export type MainInterest =
  | 'relationship-advice'
  | 'intimacy-techniques'
  | 'product-knowledge'
  | 'general-education';

export type SexualExperience = 'virgin' | 'some-experience' | 'experienced' | 'prefer-not-to-say';

/** Optional MCQ enums for chat-focused onboarding (Version 2); all have "prefer-not-to-say" to skip. */
export type PhysicalActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'prefer-not-to-say';
export type SelfRatedInBed = 'beginner' | 'somewhat-confident' | 'confident' | 'prefer-not-to-say';
export type WhatToImprove = 'stamina' | 'technique' | 'communication' | 'confidence' | 'exploration' | 'prefer-not-to-say';
export type IntimacyComfortLevel = 'shy' | 'getting-comfortable' | 'comfortable' | 'very-open' | 'prefer-not-to-say';

export interface OnboardingData {
  age?: number;
  gender?: Gender;
  relationshipStatus?: RelationshipStatus;
  mainInterests?: MainInterest[];
  sexualExperience?: SexualExperience;
  physicalActivityLevel?: PhysicalActivityLevel;
  selfRatedInBed?: SelfRatedInBed;
  whatToImproveChat?: WhatToImprove;
  intimacyComfortLevel?: IntimacyComfortLevel;
}

/** Request body for PUT /profile (questionnaire). MCQ-only; email/phone optional. */
export interface ProfileQuestionnaireBody {
  username: string;
  age: number;
  gender: Gender;
  relationshipStatus: RelationshipStatus;
  mainInterests: MainInterest[];
  sexualExperience: SexualExperience;
  /** Optional MCQ fields (skippable = prefer-not-to-say) */
  physicalActivityLevel?: PhysicalActivityLevel;
  selfRatedInBed?: SelfRatedInBed;
  whatToImproveChat?: WhatToImprove;
  intimacyComfortLevel?: IntimacyComfortLevel;
  email?: string;
  phone?: string;
}

export interface UserPreferences {
  anonymousInCommunity?: boolean;
  notifications?: boolean;
}

export interface AuthProviderDoc {
  provider: 'otp';
  providerId: string;
  identifier: string;
  linkedAt: Date;
}
