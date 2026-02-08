import mongoose, { Schema } from 'mongoose';
import type { OtpIdentifierType } from '../types/auth';

export interface IOtp {
  identifier: string;
  code: string;
  expiresAt: Date;
  type: OtpIdentifierType;
  usedAt?: Date;
}

const OtpSchema = new Schema<IOtp>(
  {
    identifier: { type: String, required: true, index: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: true },
    type: { type: String, required: true, enum: ['email', 'phone'] },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

OtpSchema.index({ identifier: 1, expiresAt: 1 });

export const Otp = mongoose.model<IOtp>('Otp', OtpSchema);
