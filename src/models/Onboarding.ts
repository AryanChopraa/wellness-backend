import mongoose, { Schema } from 'mongoose';

const OnboardingSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    age: { type: Number, required: true },
    gender: { type: String, required: true, enum: ['male', 'female', 'non-binary', 'prefer-not-to-say'] },
    relationshipStatus: {
      type: String,
      required: true,
      enum: ['single', 'dating', 'married', 'complicated'],
    },
    mainInterests: {
      type: [
        {
          type: String,
          enum: ['relationship-advice', 'intimacy-techniques', 'product-knowledge', 'general-education'],
        },
      ],
      required: true,
    },
    sexualExperience: {
      type: String,
      required: true,
      enum: ['virgin', 'some-experience', 'experienced', 'prefer-not-to-say'],
    },
    whyImprove: { type: String, required: true },
    primaryConcern: { type: String, required: true },
    intimacyGoals: { type: String, required: true },
    currentChallenges: { type: String, required: true },
    whatBroughtYouHere: { type: String, required: true },
    hopesFromPlatform: { type: String, required: true },
    anythingElseWeShouldKnow: { type: String, required: true },
  },
  { timestamps: true }
);

export const Onboarding = mongoose.model('Onboarding', OnboardingSchema);
