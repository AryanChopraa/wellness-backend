export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
export type RelationshipStatus = 'single' | 'dating' | 'married' | 'complicated';
export type MainInterest =
  | 'relationship-advice'
  | 'intimacy-techniques'
  | 'product-knowledge'
  | 'general-education';

export type SexualExperience = 'virgin' | 'some-experience' | 'experienced' | 'prefer-not-to-say';

export interface OnboardingData {
  age?: number;
  gender?: Gender;
  relationshipStatus?: RelationshipStatus;
  mainInterests?: MainInterest[];
  sexualExperience?: SexualExperience;
  whyImprove?: string;
  primaryConcern?: string;
  intimacyGoals?: string;
  currentChallenges?: string;
  whatBroughtYouHere?: string;
  hopesFromPlatform?: string;
  anythingElseWeShouldKnow?: string;
}

/** Request body for PUT /auth/profile (questionnaire). All questionnaire fields required; email/phone optional. */
export interface ProfileQuestionnaireBody {
  age: number;
  gender: Gender;
  relationshipStatus: RelationshipStatus;
  mainInterests: MainInterest[];
  sexualExperience: SexualExperience;
  whyImprove: string;
  primaryConcern: string;
  intimacyGoals: string;
  currentChallenges: string;
  whatBroughtYouHere: string;
  hopesFromPlatform: string;
  anythingElseWeShouldKnow: string;
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
