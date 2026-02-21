import { Otp } from '../models/Otp';
import { env } from '../config/env';
import type { OtpIdentifierType } from '../types/auth';
import { sendOtpEmail } from './email';

const DIGITS = 6;
const LENGTH = 10 ** DIGITS;

/** Max OTP requests per identifier in OTP_WINDOW_HOURS. */
export const OTP_MAX_PER_IDENTIFIER = 5;
export const OTP_WINDOW_HOURS = 2;

/**
 * Count how many OTPs were created for this identifier in the last OTP_WINDOW_HOURS.
 * Used to enforce per-email/phone rate limit (e.g. 5 in 2 hours).
 */
export async function countRecentOtps(identifier: string): Promise<number> {
  const normalized = identifier.trim().toLowerCase();
  const since = new Date(Date.now() - OTP_WINDOW_HOURS * 60 * 60 * 1000);
  return Otp.countDocuments({ identifier: normalized, createdAt: { $gte: since } });
}

function generateCode(): string {
  return Math.floor(Math.random() * LENGTH)
    .toString()
    .padStart(DIGITS, '0');
}

/**
 * Create and store OTP for an identifier (email or phone).
 * Throws if this identifier has already requested OTP_MAX_PER_IDENTIFIER in the last OTP_WINDOW_HOURS.
 * In production, also send via email/SMS; in dev we log to console.
 */
export async function createOtp(
  identifier: string,
  type: OtpIdentifierType
): Promise<{ code: string; expiresAt: Date }> {
  const normalized = identifier.trim().toLowerCase();
  const recentCount = await countRecentOtps(normalized);
  if (recentCount >= OTP_MAX_PER_IDENTIFIER) {
    const err = new Error(
      `Too many OTP requests for this ${type}. For your security, please try again after ${OTP_WINDOW_HOURS} hours.`
    ) as Error & { statusCode?: number };
    err.statusCode = 429;
    throw err;
  }
  const code = generateCode();
  const expiresAt = new Date(Date.now() + env.otp.expiryMinutes * 60 * 1000);

  await Otp.create({
    identifier: normalized,
    code,
    expiresAt,
    type,
  });

  if (type === 'email') {
    await sendOtpEmail(normalized, code, env.otp.expiryMinutes);
  }

  return { code, expiresAt };
}

/**
 * Verify OTP for an identifier. Returns true if valid, not expired, and not yet used.
 * Marks the OTP as used (sets usedAt) so it cannot be reused. OTP is kept in the collection for tracking.
 */
export async function verifyOtp(identifier: string, code: string): Promise<boolean> {
  const normalized = identifier.trim().toLowerCase();
  const trimmedCode = code.trim();

  const doc = await Otp.findOne({
    identifier: normalized,
    code: trimmedCode,
    expiresAt: { $gt: new Date() },
    $or: [{ usedAt: null }, { usedAt: { $exists: false } }],
  });

  if (!doc) return false;

  await Otp.updateOne({ _id: doc._id }, { $set: { usedAt: new Date() } });
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
    $or: [{ usedAt: null }, { usedAt: { $exists: false } }],
  }).sort({ createdAt: -1 });
  return doc ? doc.code : null;
}
