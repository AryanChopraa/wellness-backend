import { Router, Response } from 'express';
import { User } from '../models/User';
import { Onboarding } from '../models/Onboarding';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import type {
  Gender,
  RelationshipStatus,
  MainInterest,
  SexualExperience,
  ProfileQuestionnaireBody,
} from '../types/user';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PHONE_DIGITS = 10;
const MIN_AGE = 18;
const GENDERS: Gender[] = ['male', 'female', 'non-binary', 'prefer-not-to-say'];
const RELATIONSHIP_STATUSES: RelationshipStatus[] = ['single', 'dating', 'married', 'complicated'];
const MAIN_INTERESTS: MainInterest[] = [
  'relationship-advice',
  'intimacy-techniques',
  'product-knowledge',
  'general-education',
];
const SEXUAL_EXPERIENCES: SexualExperience[] = ['virgin', 'some-experience', 'experienced', 'prefer-not-to-say'];

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
const USERNAME_MIN = 3;
const USERNAME_MAX = 30;

function isValidEmail(email: unknown): boolean {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

function isValidPhone(phone: unknown): boolean {
  if (typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= MIN_PHONE_DIGITS;
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').trim();
}

function isValidUsername(username: unknown): boolean {
  if (typeof username !== 'string') return false;
  const s = username.trim().toLowerCase();
  return s.length >= USERNAME_MIN && s.length <= USERNAME_MAX && USERNAME_REGEX.test(s);
}

/**
 * GET /profile — Protected. Returns current user (with hasOnboarded) and onboarding record if any.
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = (user as { _id?: unknown })._id;
  const onboarding = await Onboarding.findOne({ userId }).lean();
  res.status(200).json({
    user: {
      id: (user as { _id?: unknown })._id,
      email: (user as { email?: string }).email,
      phone: (user as { phone?: string }).phone,
      username: (user as { username?: string }).username,
      nickname: (user as { nickname?: string }).nickname,
      displayName: (user as { displayName?: string }).displayName,
      avatarUrl: (user as { avatarUrl?: string }).avatarUrl,
      age: (user as { age?: number }).age ?? (onboarding ? (onboarding as { age?: number }).age : undefined),
      hasOnboarded: (user as { hasOnboarded?: boolean }).hasOnboarded,
      preferences: (user as { preferences?: unknown }).preferences,
    },
    onboarding: onboarding
      ? {
          age: (onboarding as { age?: number }).age,
          gender: (onboarding as { gender?: string }).gender,
          relationshipStatus: (onboarding as { relationshipStatus?: string }).relationshipStatus,
          mainInterests: (onboarding as { mainInterests?: string[] }).mainInterests,
          sexualExperience: (onboarding as { sexualExperience?: string }).sexualExperience,
          whyImprove: (onboarding as { whyImprove?: string }).whyImprove,
          primaryConcern: (onboarding as { primaryConcern?: string }).primaryConcern,
          intimacyGoals: (onboarding as { intimacyGoals?: string }).intimacyGoals,
          currentChallenges: (onboarding as { currentChallenges?: string }).currentChallenges,
          whatBroughtYouHere: (onboarding as { whatBroughtYouHere?: string }).whatBroughtYouHere,
          hopesFromPlatform: (onboarding as { hopesFromPlatform?: string }).hopesFromPlatform,
          anythingElseWeShouldKnow: (onboarding as { anythingElseWeShouldKnow?: string }).anythingElseWeShouldKnow,
        }
      : null,
  });
});

/**
 * PATCH /profile — Protected. Update only profile page fields: username, nickname, age, avatarUrl.
 * All fields optional; only provided fields are updated. Use for the "Edit profile" page.
 */
router.patch('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = (user as { _id?: unknown })._id;
  const body = (req.body ?? {}) as { username?: string; nickname?: string; age?: number; avatarUrl?: string };
  const updates: Record<string, unknown> = {};

  if (body.username !== undefined) {
    if (!body.username || !isValidUsername(body.username)) {
      res.status(400).json({
        error: 'username must be 3–30 characters, only letters, numbers, and underscore',
      });
      return;
    }
    const usernameLower = (body.username as string).trim().toLowerCase();
    const existingByUsername = await User.findOne({ username: usernameLower, _id: { $ne: userId } });
    if (existingByUsername) {
      res.status(400).json({ error: 'This username is already taken' });
      return;
    }
    updates.username = usernameLower;
  }

  if (body.nickname !== undefined) {
    if (typeof body.nickname !== 'string' || body.nickname.trim().length === 0) {
      res.status(400).json({ error: 'nickname must be a non-empty string' });
      return;
    }
    const nickname = body.nickname.trim();
    if (nickname.length > 50) {
      res.status(400).json({ error: 'nickname must be at most 50 characters' });
      return;
    }
    updates.nickname = nickname;
  }

  if (body.age !== undefined) {
    const age = typeof body.age === 'number' ? body.age : parseInt(String(body.age), 10);
    if (!Number.isFinite(age) || age < MIN_AGE) {
      res.status(400).json({ error: `age must be at least ${MIN_AGE}` });
      return;
    }
    updates.age = age;
  }

  if (body.avatarUrl !== undefined) {
    updates.avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'Provide at least one field to update: username, nickname, age, avatarUrl' });
    return;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).lean();
  if (!updatedUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (updates.age !== undefined) {
    await Onboarding.findOneAndUpdate(
      { userId },
      { $set: { age: updates.age } },
      { upsert: false }
    );
  }

  res.status(200).json({
    user: {
      id: (updatedUser as { _id?: unknown })._id,
      email: (updatedUser as { email?: string }).email,
      phone: (updatedUser as { phone?: string }).phone,
      username: (updatedUser as { username?: string }).username,
      nickname: (updatedUser as { nickname?: string }).nickname,
      displayName: (updatedUser as { displayName?: string }).displayName,
      avatarUrl: (updatedUser as { avatarUrl?: string }).avatarUrl,
      age: (updatedUser as { age?: number }).age,
      hasOnboarded: (updatedUser as { hasOnboarded?: boolean }).hasOnboarded,
      preferences: (updatedUser as { preferences?: unknown }).preferences,
    },
  });
});

/**
 * PUT /profile — Protected. Create/update onboarding record and set user.hasOnboarded.
 * Full questionnaire; optional: add email or phone to user if missing.
 */
router.put('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const body = (req.body ?? {}) as Partial<ProfileQuestionnaireBody>;

  if (!body.username || !isValidUsername(body.username)) {
    res.status(400).json({
      error: `username is required: 3–30 characters, only letters, numbers, and underscore`,
    });
    return;
  }
  const usernameLower = (body.username as string).trim().toLowerCase();
  const existingByUsername = await User.findOne({ username: usernameLower, _id: { $ne: (user as { _id?: unknown })._id } });
  if (existingByUsername) {
    res.status(400).json({ error: 'This username is already taken' });
    return;
  }

  if (!body.nickname || typeof body.nickname !== 'string' || body.nickname.trim().length === 0) {
    res.status(400).json({ error: 'nickname is required and must be a non-empty string' });
    return;
  }
  const nickname = (body.nickname as string).trim();
  if (nickname.length > 50) {
    res.status(400).json({ error: 'nickname must be at most 50 characters' });
    return;
  }

  const age = typeof body.age === 'number' ? body.age : parseInt(String(body.age), 10);
  if (!Number.isFinite(age) || age < MIN_AGE) {
    res.status(400).json({ error: `Age is required and must be at least ${MIN_AGE}` });
    return;
  }

  if (!body.gender || !GENDERS.includes(body.gender)) {
    res.status(400).json({ error: 'Valid gender is required (male, female, non-binary, prefer-not-to-say)' });
    return;
  }
  if (!body.relationshipStatus || !RELATIONSHIP_STATUSES.includes(body.relationshipStatus)) {
    res.status(400).json({ error: 'Valid relationshipStatus is required (single, dating, married, complicated)' });
    return;
  }
  if (!Array.isArray(body.mainInterests) || body.mainInterests.length === 0) {
    res.status(400).json({
      error:
        'mainInterests is required (at least one: relationship-advice, intimacy-techniques, product-knowledge, general-education)',
    });
    return;
  }
  for (const i of body.mainInterests) {
    if (!MAIN_INTERESTS.includes(i as MainInterest)) {
      res.status(400).json({ error: `Invalid mainInterest: ${i}` });
      return;
    }
  }
  if (!body.sexualExperience || !SEXUAL_EXPERIENCES.includes(body.sexualExperience)) {
    res.status(400).json({
      error: 'Valid sexualExperience is required (virgin, some-experience, experienced, prefer-not-to-say)',
    });
    return;
  }

  const textFields: (keyof ProfileQuestionnaireBody)[] = [
    'whyImprove',
    'primaryConcern',
    'intimacyGoals',
    'currentChallenges',
    'whatBroughtYouHere',
    'hopesFromPlatform',
    'anythingElseWeShouldKnow',
  ];
  for (const key of textFields) {
    const val = body[key];
    if (typeof val !== 'string' || val.trim().length === 0) {
      res.status(400).json({ error: `${key} is required and must be a non-empty string` });
      return;
    }
  }

  const userId = (user as { _id?: unknown })._id;
  const currentEmail = (user as { email?: string }).email;
  const currentPhone = (user as { phone?: string }).phone;

  const onboardingPayload = {
    userId,
    age,
    gender: body.gender!,
    relationshipStatus: body.relationshipStatus!,
    mainInterests: body.mainInterests!,
    sexualExperience: body.sexualExperience!,
    whyImprove: body.whyImprove!.trim(),
    primaryConcern: body.primaryConcern!.trim(),
    intimacyGoals: body.intimacyGoals!.trim(),
    currentChallenges: body.currentChallenges!.trim(),
    whatBroughtYouHere: body.whatBroughtYouHere!.trim(),
    hopesFromPlatform: body.hopesFromPlatform!.trim(),
    anythingElseWeShouldKnow: body.anythingElseWeShouldKnow!.trim(),
  };

  await Onboarding.findOneAndUpdate({ userId }, onboardingPayload, { upsert: true, new: true });

  const userSetUpdate: Record<string, unknown> = {
    hasOnboarded: true,
    username: usernameLower,
    nickname,
    age,
  };
  const pushProviders: { provider: string; providerId: string; identifier: string; linkedAt: Date }[] = [];

  if (body.email !== undefined && body.email !== null && String(body.email).trim() !== '') {
    const emailStr = (body.email as string).trim().toLowerCase();
    if (!isValidEmail(emailStr)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }
    if (!currentEmail) {
      userSetUpdate.email = emailStr;
      pushProviders.push({
        provider: 'otp',
        providerId: `otp:${emailStr}:${Date.now()}`,
        identifier: emailStr,
        linkedAt: new Date(),
      });
    }
  }
  if (body.phone !== undefined && body.phone !== null && String(body.phone).trim() !== '') {
    const phoneStr = normalizePhone(body.phone as string);
    if (!isValidPhone(phoneStr)) {
      res.status(400).json({ error: 'Invalid phone format (at least 10 digits)' });
      return;
    }
    if (!currentPhone) {
      userSetUpdate.phone = phoneStr;
      pushProviders.push({
        provider: 'otp',
        providerId: `otp:${phoneStr}:${Date.now()}`,
        identifier: phoneStr,
        linkedAt: new Date(),
      });
    }
  }

  const userUpdateDoc: Record<string, unknown> = { $set: userSetUpdate };
  if (pushProviders.length > 0)
    (userUpdateDoc as { $push?: { authProviders: { $each: object[] } } }).$push = {
      authProviders: { $each: pushProviders },
    };

  const updatedUser = await User.findByIdAndUpdate(userId, userUpdateDoc, { new: true }).lean();
  if (!updatedUser) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const onboardingDoc = await Onboarding.findOne({ userId }).lean();

  res.status(200).json({
    user: {
      id: (updatedUser as { _id?: unknown })._id,
      email: (updatedUser as { email?: string }).email,
      phone: (updatedUser as { phone?: string }).phone,
      username: (updatedUser as { username?: string }).username,
      nickname: (updatedUser as { nickname?: string }).nickname,
      displayName: (updatedUser as { displayName?: string }).displayName,
      avatarUrl: (updatedUser as { avatarUrl?: string }).avatarUrl,
      age: (updatedUser as { age?: number }).age,
      hasOnboarded: (updatedUser as { hasOnboarded?: boolean }).hasOnboarded,
      preferences: (updatedUser as { preferences?: unknown }).preferences,
    },
    onboarding: onboardingDoc
      ? {
          age: (onboardingDoc as { age?: number }).age,
          gender: (onboardingDoc as { gender?: string }).gender,
          relationshipStatus: (onboardingDoc as { relationshipStatus?: string }).relationshipStatus,
          mainInterests: (onboardingDoc as { mainInterests?: string[] }).mainInterests,
          sexualExperience: (onboardingDoc as { sexualExperience?: string }).sexualExperience,
          whyImprove: (onboardingDoc as { whyImprove?: string }).whyImprove,
          primaryConcern: (onboardingDoc as { primaryConcern?: string }).primaryConcern,
          intimacyGoals: (onboardingDoc as { intimacyGoals?: string }).intimacyGoals,
          currentChallenges: (onboardingDoc as { currentChallenges?: string }).currentChallenges,
          whatBroughtYouHere: (onboardingDoc as { whatBroughtYouHere?: string }).whatBroughtYouHere,
          hopesFromPlatform: (onboardingDoc as { hopesFromPlatform?: string }).hopesFromPlatform,
          anythingElseWeShouldKnow: (onboardingDoc as { anythingElseWeShouldKnow?: string }).anythingElseWeShouldKnow,
        }
      : null,
  });
});

export const profileRoutes = router;
