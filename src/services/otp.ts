import { Otp } from '../models/Otp';
import { env } from '../config/env';
import type { OtpIdentifierType } from '../types/auth';

const DIGITS = 6;
const LENGTH = 10 ** DIGITS;

function generateCode(): string {
  return Math.floor(Math.random() * LENGTH)
    .toString()
    .padStart(DIGITS, '0');
}

/**
 * Create and store OTP for an identifier (email or phone).
 * In production, also send via email/SMS; in dev we log to console.
 */
export async function createOtp(
  identifier: string,
  type: OtpIdentifierType
): Promise<{ code: string; expiresAt: Date }> {
  const normalized = identifier.trim().toLowerCase();
  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.otp.expiryMinutes * 60 * 1000);

  await Otp.create({
    identifier: normalized,
    code,
    expiresAt,
    type,
  });

  return { code, expiresAt };
}

/**
 * Verify OTP for an identifier. Returns true if valid and not expired.
 * Deletes the OTP after successful verification (one-time use).
 */
export async function verifyOtp(identifier: string, code: string): Promise<boolean> {
  const normalized = identifier.trim().toLowerCase();
  const trimmedCode = code.trim();

  const doc = await Otp.findOne({
    identifier: normalized,
    code: trimmedCode,
    expiresAt: { $gt: new Date() },
  });

  if (!doc) return false;

  await Otp.deleteOne({ _id: doc._id });
  return true;
}

/**
 * Dev only: get current OTP for an identifier (for testing). Do not use in production.
 */
export async function getStoredOtpForDev(identifier: string): Promise<string | null> {
  const normalized = identifier.trim().toLowerCase();
  const doc = await Otp.findOne({
    identifier: normalized,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
  return doc ? doc.code : null;
}
