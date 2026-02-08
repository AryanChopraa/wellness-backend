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
    // Optional MCQ fields for chat personalization (Version 2 questionnaire; skippable = prefer-not-to-say)
    physicalActivityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'prefer-not-to-say'],
    },
    selfRatedInBed: {
      type: String,
      enum: ['beginner', 'somewhat-confident', 'confident', 'prefer-not-to-say'],
    },
    whatToImproveChat: {
      type: String,
      enum: ['stamina', 'technique', 'communication', 'confidence', 'exploration', 'prefer-not-to-say'],
    },
    intimacyComfortLevel: {
      type: String,
      enum: ['shy', 'getting-comfortable', 'comfortable', 'very-open', 'prefer-not-to-say'],
    },
  },
  { timestamps: true }
);

export const Onboarding = mongoose.model('Onboarding', OnboardingSchema);
