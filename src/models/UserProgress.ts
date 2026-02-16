import mongoose, { Schema } from 'mongoose';

const UserProgressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dayNumber: { type: Number, required: true }, // 1-30 (or 1-7 for first week)
    exerciseId: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true, index: true },
    completed: { type: Boolean, default: true },
    /** Mood after exercise (1-5 or emoji mapping). */
    moodRating: { type: Number, min: 1, max: 5, default: null },
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UserProgressSchema.index({ userId: 1, completedAt: -1 });
UserProgressSchema.index({ userId: 1, dayNumber: 1 }, { unique: true });

export const UserProgress = mongoose.model('UserProgress', UserProgressSchema);
