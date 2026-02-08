import mongoose, { Schema } from 'mongoose';

const CommunitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Community = mongoose.model('Community', CommunitySchema);
