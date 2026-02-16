import mongoose, { Schema } from 'mongoose';
import type { AssessmentSubmitBody } from '../types/assessment';

const AssessmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    // Q1: 1-3 concerns
    concerns: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length >= 1 && v.length <= 3,
        message: 'concerns must have 1-3 items',
      },
    },
    // Q2: duration -> urgency 1-4
    duration: { type: String, required: true, enum: ['recently', 'few_months', 'over_a_year', 'years'] },
    urgencyScore: { type: Number, required: true, min: 1, max: 4 },
    // Q3: severity option -> severity 1-5
    severityOption: { type: String, required: true, enum: ['occasionally', 'think_regularly', 'affecting_confidence', 'impacting_relationships', 'avoiding_situations'] },
    severityScore: { type: Number, required: true, min: 1, max: 5 },
    // Q4
    relationshipStatus: {
      type: String,
      required: true,
      enum: ['yes_they_know', 'yes_havent_shared', 'no_single', 'complicated'],
    },
    // Q5: max 3 goals
    goals: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length >= 1 && v.length <= 3,
        message: 'goals must have 1-3 items',
      },
    },
    // Q6
    supportHistory: {
      type: String,
      required: true,
      enum: ['yes_therapist', 'yes_friends_family', 'no_first_time', 'tried_not_helpful'],
    },
    // Q7: 1-10
    stressLevel: { type: Number, required: true, min: 1, max: 10 },
    // Q8
    primaryFear: {
      type: String,
      required: true,
      enum: ['never_get_better', 'broken_abnormal', 'partner_will_leave', 'never_confident', 'alone_in_this', 'all_in_my_head'],
    },
    // Q9
    learningStyle: {
      type: String,
      required: true,
      enum: ['videos', 'reading', 'interactive', 'talking', 'mix'],
    },
    // Q10
    preferredTime: {
      type: String,
      required: true,
      enum: ['morning', 'midday', 'afternoon', 'evening', 'night', 'varies'],
    },
  },
  { timestamps: true }
);

AssessmentSchema.index({ userId: 1 });

export interface AssessmentDoc extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  concerns: string[];
  duration: string;
  urgencyScore: number;
  severityOption: string;
  severityScore: number;
  relationshipStatus: string;
  goals: string[];
  supportHistory: string;
  stressLevel: number;
  primaryFear: string;
  learningStyle: string;
  preferredTime: string;
  createdAt: Date;
  updatedAt: Date;
}

export const Assessment = mongoose.model<AssessmentDoc>('Assessment', AssessmentSchema);

/** Map Q2 duration to urgency score (1-4). */
export function durationToUrgency(duration: AssessmentSubmitBody['duration']): number {
  const map: Record<AssessmentSubmitBody['duration'], number> = {
    recently: 1,
    few_months: 2,
    over_a_year: 3,
    years: 4,
  };
  return map[duration] ?? 1;
}

/** Map Q3 severity option to score (1-5). */
export function severityOptionToScore(severity: AssessmentSubmitBody['severity']): number {
  const map: Record<AssessmentSubmitBody['severity'], number> = {
    occasionally: 1,
    think_regularly: 2,
    affecting_confidence: 3,
    impacting_relationships: 4,
    avoiding_situations: 5,
  };
  return map[severity] ?? 1;
}
