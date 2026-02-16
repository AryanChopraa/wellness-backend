import mongoose, { Schema } from 'mongoose';

const ExerciseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: ['journaling', 'guided_audio', 'interactive', 'micro_lesson', 'challenge'],
    },
    durationMinutes: { type: Number, required: true, min: 1 },
    /** Tags for filtering (e.g. performance, anxiety, communication). Matches assessment concerns. */
    tags: { type: [String], default: [] },
    /** Severity levels this exercise is appropriate for (1-5). */
    severityLevels: { type: [Number], default: [] },
    /** Goal tags (e.g. confident_intimate, less_anxiety). */
    goalTags: { type: [String], default: [] },
    /** Optional: inline content or external URL */
    content: { type: String, default: null },
    contentUrl: { type: String, default: null },
    /** Order in a phase/week (for 7-day or 30-day plan). */
    order: { type: Number, default: 0 },
    /** Phase/week label (e.g. 1 = Week 1 Foundation). */
    phase: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ExerciseSchema.index({ tags: 1, isActive: 1 });
ExerciseSchema.index({ phase: 1, order: 1 });

export const Exercise = mongoose.model('Exercise', ExerciseSchema);
