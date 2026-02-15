import mongoose, { Schema } from 'mongoose';

const AssetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assetProvider: { type: String, required: true, enum: ['google'], default: 'google' },
    bucket: { type: String, required: true },
    path: { type: String, required: true },
    url: { type: String, required: true },
    mimeType: { type: String, required: true },
    name: { type: String, required: true },
    note: { type: String, default: null },
  },
  { timestamps: true }
);

AssetSchema.index({ userId: 1, createdAt: -1 });

export const Asset = mongoose.model('Asset', AssetSchema);
