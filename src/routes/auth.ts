import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import * as otpService from '../services/otp';
import { signToken } from '../services/jwt';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { otpSendLimiter, otpVerifyLimiter } from '../middleware/rateLimit';
import { env } from '../config/env';
import type { OtpIdentifierType } from '../types/auth';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PHONE_DIGITS = 10;

function isValidEmail(email: unknown): boolean {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

function isValidPhone(phone: unknown): boolean {
  if (typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= MIN_PHONE_DIGITS;
}

/** Normalize phone to digits-only for storage and lookup. */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').trim();
}

/**
 * Parse body: must have exactly one of email or phone.
 * Returns { identifier, type } or null and sends 400 if invalid.
 */
function parseIdentifier(req: Request, res: Response): { identifier: string; type: OtpIdentifierType } | null {
  const { email, phone } = (req.body ?? {}) as { email?: string; phone?: string };
  const hasEmail = email !== undefined && email !== null && String(email).trim() !== '';
  const hasPhone = phone !== undefined && phone !== null && String(phone).trim() !== '';

  if (hasEmail && hasPhone) {
    res.status(400).json({ error: 'Provide either email or phone, not both' });
    return null;
  }
  if (hasEmail) {
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Valid email is required' });
      return null;
    }
    return { identifier: (email as string).trim().toLowerCase(), type: 'email' };
  }
  if (hasPhone) {
    if (!isValidPhone(phone)) {
      res.status(400).json({ error: 'Valid phone number is required (at least 10 digits)' });
      return null;
    }
    return { identifier: normalizePhone(phone as string), type: 'phone' };
  }
  res.status(400).json({ error: 'Either email or phone is required' });
  return null;
}

/**
 * Find user by email or phone (identifier + type).
 */
async function findUserByIdentifier(identifier: string, type: OtpIdentifierType) {
  if (type === 'email') {
    return User.findOne({
      $or: [{ email: identifier }, { 'authProviders.identifier': identifier }],
    });
  }
  return User.findOne({
    $or: [{ phone: identifier }, { 'authProviders.identifier': identifier }],
  });
}

/**
 * POST /auth/signup
 * Body: { email? } or { phone? } (exactly one).
 * Creates user if new, sends OTP. Same as signin — single OTP-based flow.
 */
router.post('/signup', otpSendLimiter, async (req: Request, res: Response) => {
  const parsed = parseIdentifier(req, res);
  if (!parsed) return;
  const { identifier, type } = parsed;

  let user = await findUserByIdentifier(identifier, type);
  if (user && (user as { isBlocked?: boolean }).isBlocked) {
    res.status(403).json({ error: 'Account is blocked' });
    return;
  }
  let created = false;
  if (!user) {
    const providerId = `otp:${identifier}:${Date.now()}`;
    user = await User.create({
      ...(type === 'email' ? { email: identifier } : { phone: identifier }),
      displayName: type === 'email' ? identifier.split('@')[0] : 'User',
      authProviders: [{ provider: 'otp', providerId, identifier, linkedAt: new Date() }],
    });
    created = true;
  }

  const { code, expiresAt } = await otpService.createOtp(identifier, type);
  if (env.jwt.secret.includes('dev') || process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${identifier}: ${code} (expires ${expiresAt.toISOString()})`);
  }

  res.status(created ? 201 : 200).json({
    message: created ? 'Account created. Check your email/phone for the OTP.' : 'If an account exists, an OTP has been sent',
    expiresAt: expiresAt.toISOString(),
  });
});

/**
 * POST /auth/signin
 * Body: { email? } or { phone? }. Same as signup — sends OTP.
 */
router.post('/signin', otpSendLimiter, async (req: Request, res: Response) => {
  const parsed = parseIdentifier(req, res);
  if (!parsed) return;
  const { identifier, type } = parsed;

  let user = await findUserByIdentifier(identifier, type);
  if (user && (user as { isBlocked?: boolean }).isBlocked) {
    res.status(403).json({ error: 'Account is blocked' });
    return;
  }
  if (!user) {
    const providerId = `otp:${identifier}:${Date.now()}`;
    user = await User.create({
      ...(type === 'email' ? { email: identifier } : { phone: identifier }),
      displayName: type === 'email' ? identifier.split('@')[0] : 'User',
      authProviders: [{ provider: 'otp', providerId, identifier, linkedAt: new Date() }],
    });
  } else {
    const hasOtpProvider = user.authProviders.some((p) => p.provider === 'otp' && p.identifier === identifier);
    if (!hasOtpProvider) {
      user.authProviders.push({
        provider: 'otp',
        providerId: `otp:${identifier}:${Date.now()}`,
        identifier,
        linkedAt: new Date(),
      });
      await user.save();
    }
  }

  const { code, expiresAt } = await otpService.createOtp(identifier, type);
  if (env.jwt.secret.includes('dev') || process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${identifier}: ${code} (expires ${expiresAt.toISOString()})`);
  }

  res.status(200).json({
    message: 'OTP sent',
    expiresAt: expiresAt.toISOString(),
  });
});

/**
 * POST /auth/otp/send
 * Body: { email? } or { phone? }. Single entry point for sending OTP.
 */
router.post('/otp/send', otpSendLimiter, async (req: Request, res: Response) => {
  const parsed = parseIdentifier(req, res);
  if (!parsed) return;
  const { identifier, type } = parsed;

  let user = await findUserByIdentifier(identifier, type);
  if (user && (user as { isBlocked?: boolean }).isBlocked) {
    res.status(403).json({ error: 'Account is blocked' });
    return;
  }
  if (!user) {
    const providerId = `otp:${identifier}:${Date.now()}`;
    user = await User.create({
      ...(type === 'email' ? { email: identifier } : { phone: identifier }),
      displayName: type === 'email' ? identifier.split('@')[0] : 'User',
      authProviders: [{ provider: 'otp', providerId, identifier, linkedAt: new Date() }],
    });
  } else {
    const hasOtpProvider = user.authProviders.some((p) => p.provider === 'otp' && p.identifier === identifier);
    if (!hasOtpProvider) {
      user.authProviders.push({
        provider: 'otp',
        providerId: `otp:${identifier}:${Date.now()}`,
        identifier,
        linkedAt: new Date(),
      });
      await user.save();
    }
  }

  const { code, expiresAt } = await otpService.createOtp(identifier, type);
  if (env.jwt.secret.includes('dev') || process.env.NODE_ENV !== 'production') {
    console.log(`[DEV] OTP for ${identifier}: ${code} (expires ${expiresAt.toISOString()})`);
  }

  res.status(200).json({
    message: 'OTP sent',
    expiresAt: expiresAt.toISOString(),
  });
});

/**
 * POST /auth/otp/verify
 * Body: { email? or phone?, code }. Verifies OTP and returns JWT + user.
 */
router.post('/otp/verify', otpVerifyLimiter, async (req: Request, res: Response) => {
  const { email, phone, code } = (req.body ?? {}) as { email?: string; phone?: string; code?: string };
  const hasEmail = email !== undefined && email !== null && String(email).trim() !== '';
  const hasPhone = phone !== undefined && phone !== null && String(phone).trim() !== '';

  if ((hasEmail && hasPhone) || (!hasEmail && !hasPhone)) {
    res.status(400).json({ error: 'Provide exactly one of email or phone' });
    return;
  }
  if (typeof code !== 'string' || code.trim().length < 4) {
    res.status(400).json({ error: 'Valid OTP code is required' });
    return;
  }

  const identifier = hasEmail
    ? (email as string).trim().toLowerCase()
    : normalizePhone(phone as string);
  const type: OtpIdentifierType = hasEmail ? 'email' : 'phone';

  if (hasEmail && !isValidEmail(email)) {
    res.status(400).json({ error: 'Valid email is required' });
    return;
  }
  if (hasPhone && !isValidPhone(phone)) {
    res.status(400).json({ error: 'Valid phone number is required' });
    return;
  }

  const valid = await otpService.verifyOtp(identifier, code.trim());
  if (!valid) {
    res.status(401).json({ error: 'Invalid or expired OTP' });
    return;
  }

  const userDoc = await findUserByIdentifier(identifier, type);
  if (!userDoc) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  if ((userDoc as { isBlocked?: boolean }).isBlocked) {
    res.status(403).json({ error: 'Account is blocked' });
    return;
  }

  const u = (userDoc.toObject?.() ?? userDoc) as Record<string, unknown>;
  const rawId = u._id;
  const userId = typeof rawId === 'object' && rawId !== null && 'toString' in rawId
    ? (rawId as { toString(): string }).toString()
    : String(rawId);
  const token = signToken({
    userId,
    ...(type === 'email' ? { email: identifier } : { phone: identifier }),
  });

  res.status(200).json({
    token,
    user: {
      id: (u as { _id?: unknown })._id,
      email: (u as { email?: string }).email,
      phone: (u as { phone?: string }).phone,
      username: (u as { username?: string }).username,
      nickname: (u as { nickname?: string }).nickname,
      displayName: (u as { displayName?: string }).displayName,
      avatarUrl: (u as { avatarUrl?: string }).avatarUrl,
      hasOnboarded: (u as { hasOnboarded?: boolean }).hasOnboarded,
      preferences: (u as { preferences?: unknown }).preferences,
    },
  });
});

/**
 * GET /auth/me — Protected. Returns current user.
 */
router.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.status(200).json({
    user: {
      id: (user as { _id?: unknown })._id,
      email: (user as { email?: string }).email,
      phone: (user as { phone?: string }).phone,
      username: (user as { username?: string }).username,
      nickname: (user as { nickname?: string }).nickname,
      displayName: (user as { displayName?: string }).displayName,
      avatarUrl: (user as { avatarUrl?: string }).avatarUrl,
      hasOnboarded: (user as { hasOnboarded?: boolean }).hasOnboarded,
      preferences: (user as { preferences?: unknown }).preferences,
    },
  });
});

/**
 * GET /auth/otp/dev/:identifier — Dev only: returns current OTP for identifier (email or phone).
 */
router.get('/otp/dev/:identifier', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).end();
    return;
  }
  const identifier = req.params.identifier?.trim();
  if (!identifier) {
    res.status(400).json({ error: 'Identifier required' });
    return;
  }
  const normalized = identifier.includes('@') ? identifier.toLowerCase() : identifier.replace(/\D/g, '');
  const code = await otpService.getStoredOtpForDev(normalized);
  if (code === null) {
    res.status(404).json({ error: 'No OTP found or expired' });
    return;
  }
  res.status(200).json({ code });
});

export const authRoutes = router;
