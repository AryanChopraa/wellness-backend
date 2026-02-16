import { Router, Response } from 'express';
import { User } from '../models/User';
import { Onboarding } from '../models/Onboarding';
import { UserSavedPost } from '../models/UserSavedPost';
import { Post } from '../models/Post';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import type {
  Gender,
  RelationshipStatus,
  MainInterest,
  SexualExperience,
  PhysicalActivityLevel,
  SelfRatedInBed,
  WhatToImprove,
  IntimacyComfortLevel,
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
const PHYSICAL_ACTIVITY_LEVELS: PhysicalActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'prefer-not-to-say'];
const SELF_RATED_IN_BED: SelfRatedInBed[] = ['beginner', 'somewhat-confident', 'confident', 'prefer-not-to-say'];
const WHAT_TO_IMPROVE: WhatToImprove[] = ['stamina', 'technique', 'communication', 'confidence', 'exploration', 'prefer-not-to-say'];
const INTIMACY_COMFORT_LEVELS: IntimacyComfortLevel[] = ['shy', 'getting-comfortable', 'comfortable', 'very-open', 'prefer-not-to-say'];

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
    message: 'Profile loaded',
    user: {
      id: (user as { _id?: unknown })._id,
      email: (user as { email?: string }).email,
      phone: (user as { phone?: string }).phone,
      username: (user as { username?: string }).username,
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
          physicalActivityLevel: (onboarding as { physicalActivityLevel?: string }).physicalActivityLevel,
          selfRatedInBed: (onboarding as { selfRatedInBed?: string }).selfRatedInBed,
          whatToImproveChat: (onboarding as { whatToImproveChat?: string }).whatToImproveChat,
          intimacyComfortLevel: (onboarding as { intimacyComfortLevel?: string }).intimacyComfortLevel,
        }
      : null,
  });
});

/**
 * PATCH /profile — Protected. Update only profile page fields: username, age, avatarUrl.
 * All fields optional; only provided fields are updated. Use for the "Edit profile" page.
 */
router.patch('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = (user as { _id?: unknown })._id;
  const body = (req.body ?? {}) as { username?: string; age?: number; avatarUrl?: string };
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
    res.status(400).json({ error: 'Provide at least one field to update: username, age, avatarUrl' });
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
    message: 'Profile updated',
    user: {
      id: (updatedUser as { _id?: unknown })._id,
      email: (updatedUser as { email?: string }).email,
      phone: (updatedUser as { phone?: string }).phone,
      username: (updatedUser as { username?: string }).username,
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

  if (
    body.physicalActivityLevel !== undefined &&
    body.physicalActivityLevel !== null &&
    !PHYSICAL_ACTIVITY_LEVELS.includes(body.physicalActivityLevel)
  ) {
    res.status(400).json({ error: 'Invalid physicalActivityLevel' });
    return;
  }
  if (
    body.selfRatedInBed !== undefined &&
    body.selfRatedInBed !== null &&
    !SELF_RATED_IN_BED.includes(body.selfRatedInBed)
  ) {
    res.status(400).json({ error: 'Invalid selfRatedInBed' });
    return;
  }
  if (
    body.whatToImproveChat !== undefined &&
    body.whatToImproveChat !== null &&
    !WHAT_TO_IMPROVE.includes(body.whatToImproveChat)
  ) {
    res.status(400).json({ error: 'Invalid whatToImproveChat' });
    return;
  }
  if (
    body.intimacyComfortLevel !== undefined &&
    body.intimacyComfortLevel !== null &&
    !INTIMACY_COMFORT_LEVELS.includes(body.intimacyComfortLevel)
  ) {
    res.status(400).json({ error: 'Invalid intimacyComfortLevel' });
    return;
  }

  const userId = (user as { _id?: unknown })._id;
  const currentEmail = (user as { email?: string }).email;
  const currentPhone = (user as { phone?: string }).phone;

  const onboardingPayload: Record<string, unknown> = {
    userId,
    age,
    gender: body.gender!,
    relationshipStatus: body.relationshipStatus!,
    mainInterests: body.mainInterests!,
    sexualExperience: body.sexualExperience!,
  };
  if (body.physicalActivityLevel !== undefined && body.physicalActivityLevel !== null) {
    onboardingPayload.physicalActivityLevel = body.physicalActivityLevel;
  }
  if (body.selfRatedInBed !== undefined && body.selfRatedInBed !== null) {
    onboardingPayload.selfRatedInBed = body.selfRatedInBed;
  }
  if (body.whatToImproveChat !== undefined && body.whatToImproveChat !== null) {
    onboardingPayload.whatToImproveChat = body.whatToImproveChat;
  }
  if (body.intimacyComfortLevel !== undefined && body.intimacyComfortLevel !== null) {
    onboardingPayload.intimacyComfortLevel = body.intimacyComfortLevel;
  }

  await Onboarding.findOneAndUpdate({ userId }, { $set: onboardingPayload }, { upsert: true, new: true });

  const userSetUpdate: Record<string, unknown> = {
    hasOnboarded: true,
    username: usernameLower,
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
    message: 'Onboarding saved',
    user: {
      id: (updatedUser as { _id?: unknown })._id,
      email: (updatedUser as { email?: string }).email,
      phone: (updatedUser as { phone?: string }).phone,
      username: (updatedUser as { username?: string }).username,
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
          physicalActivityLevel: (onboardingDoc as { physicalActivityLevel?: string }).physicalActivityLevel,
          selfRatedInBed: (onboardingDoc as { selfRatedInBed?: string }).selfRatedInBed,
          whatToImproveChat: (onboardingDoc as { whatToImproveChat?: string }).whatToImproveChat,
          intimacyComfortLevel: (onboardingDoc as { intimacyComfortLevel?: string }).intimacyComfortLevel,
        }
      : null,
  });
});

/**
 * GET /profile/saved-posts — List current user's saved posts (auth required).
 */
router.get('/saved-posts', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = (req.user as { _id?: unknown })?._id;
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const saved = await UserSavedPost.find({ userId }).sort({ createdAt: -1 }).lean();
  const postIds = saved.map((s) => (s as { postId: unknown }).postId);
  const posts = await Post.find({ _id: { $in: postIds } }).lean();
  const postMap = new Map(posts.map((p) => [String((p as { _id: unknown })._id), p]));

  const list = saved
    .map((s) => {
      const post = postMap.get(String((s as { postId: unknown }).postId));
      if (!post) return null;
      return {
        id: (post as { _id: unknown })._id,
        title: (post as { title: string }).title,
        content: (post as { content: string }).content,
        postType: (post as { postType?: string }).postType ?? 'story',
        likeCount: (post as { likeCount?: number }).likeCount ?? 0,
        commentCount: (post as { commentCount?: number }).commentCount ?? 0,
        savedAt: (s as { createdAt?: Date }).createdAt,
      };
    })
    .filter(Boolean);

  res.status(200).json({ savedPosts: list });
});

export const profileRoutes = router;
