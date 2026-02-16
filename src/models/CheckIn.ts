import mongoose, { Schema } from 'mongoose';

const CheckInSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Week number since user started (1, 2, 3...) */
    weekNumber: { type: Number, required: true },
    /** How close to goal (0-100) */
    goalProximityPercent: { type: Number, min: 0, max: 100, default: null },
    /** Feeling: much_better | somewhat_better | same | struggling_more */
    feeling: {
      type: String,
      enum: ['much_better', 'somewhat_better', 'same', 'struggling_more'],
      default: null,
    },
    /** What helped (multi-select) */
    whatHelped: { type: [String], default: [] },
    /** Optional note for Ally */
    noteForAlly: { type: String, default: null },
  },
  { timestamps: true }
);

CheckInSchema.index({ userId: 1, weekNumber: 1 }, { unique: true });

export const CheckIn = mongoose.model('CheckIn', CheckInSchema);
