import mongoose, { Schema } from 'mongoose';
import type { AuthProviderDoc, UserPreferences } from '../types/user';

const AuthProviderSchema = new Schema<AuthProviderDoc>(
  {
    provider: { type: String, required: true, enum: ['otp'] },
    providerId: { type: String, required: true },
    identifier: { type: String, required: true },
    linkedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    email: { type: String, sparse: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, sparse: true, unique: true, trim: true },
    displayName: { type: String, default: 'User', trim: true },
    avatarUrl: { type: String },
    authProviders: { type: [AuthProviderSchema], default: [] },
    hasOnboarded: { type: Boolean, default: false },
    preferences: {
      anonymousInCommunity: { type: Boolean, default: false },
      notifications: { type: Boolean, default: true },
    },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.index({ 'authProviders.provider': 1, 'authProviders.identifier': 1 });

export const User = mongoose.model('User', UserSchema);
