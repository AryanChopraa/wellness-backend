export type Gender = 'male' | 'female' | 'non-binary' | 'prefer-not-to-say';
export type RelationshipStatus = 'single' | 'dating' | 'married' | 'complicated';
export type MainInterest =
  | 'relationship-advice'
  | 'intimacy-techniques'
  | 'product-knowledge'
  | 'general-education';

export type SexualExperience = 'virgin' | 'some-experience' | 'experienced' | 'prefer-not-to-say';

export interface UserPreferences {
  anonymousInCommunity?: boolean;
  notifications?: boolean;
  messageLimit?: number;
}


export interface AuthProviderDoc {
  provider: 'otp';
  providerId: string;
  identifier: string;
  linkedAt: Date;
}
