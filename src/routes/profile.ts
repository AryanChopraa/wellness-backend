import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Asset } from '../models/Asset';
import { Assessment } from '../models/Assessment';
import { UserSavedPost } from '../models/UserSavedPost';
import { Post } from '../models/Post';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { getDefaultAvatarUrl } from '../utils/defaultAvatar';
import type { Gender } from '../types/user';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PHONE_DIGITS = 10;
const MIN_AGE = 18;

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
 * GET /profile — Protected. Returns current user (with hasOnboarded).
 * When avatarUrl is null, returns a default pixelated avatar URL (DiceBear) based on userId and gender.
 */
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = (user as { _id?: unknown })._id;
  const uid = new mongoose.Types.ObjectId(String(userId));
  const assessment = await Assessment.findOne({ userId: uid }).select('gender age').lean();

  const gender = (assessment as { gender?: string } | null)?.gender ?? null;
  const age = (user as { age?: number }).age ?? (assessment as { age?: number } | null)?.age;

  const rawAvatarUrl = (user as { avatarUrl?: string }).avatarUrl;
  const avatarUrl = rawAvatarUrl ?? getDefaultAvatarUrl(String(userId), gender);

  res.status(200).json({
    message: 'Profile loaded',
    user: {
      id: (user as { _id?: unknown })._id,
      email: (user as { email?: string }).email,
      phone: (user as { phone?: string }).phone,
      username: (user as { username?: string }).username,
      avatarUrl,
      age: age,
      hasOnboarded: (user as { hasOnboarded?: boolean }).hasOnboarded,
      preferences: (user as { preferences?: unknown }).preferences,
    },
  });
});

/**
 * PATCH /profile — Protected. Update only profile page fields: username, age, avatarUrl, or avatarAssetId.
 * Use avatarAssetId when frontend has uploaded an image via POST /assets — backend resolves Asset.url and sets avatarUrl.
 * All fields optional; only provided fields are updated.
 */
router.patch('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = (user as { _id?: unknown })._id;
  const uid = new mongoose.Types.ObjectId(String(userId));
  const body = (req.body ?? {}) as { username?: string; age?: number; avatarUrl?: string; avatarAssetId?: string };
  const updates: Record<string, unknown> = {};

  if (body.avatarAssetId !== undefined) {
    if (body.avatarAssetId === null || body.avatarAssetId === '') {
      updates.avatarUrl = null;
    } else if (mongoose.Types.ObjectId.isValid(body.avatarAssetId)) {
      const asset = await Asset.findOne({
        _id: new mongoose.Types.ObjectId(body.avatarAssetId),
        userId: uid,
      }).select('url').lean();
      if (!asset) {
        res.status(400).json({ error: 'Asset not found or you do not own this asset. Upload via POST /assets first.' });
        return;
      }
      updates.avatarUrl = (asset as { url: string }).url;
    }
  }

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

  if (body.avatarUrl !== undefined && body.avatarAssetId === undefined) {
    updates.avatarUrl = typeof body.avatarUrl === 'string' ? body.avatarUrl.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'Provide at least one field to update: username, age, avatarUrl, or avatarAssetId' });
    return;
  }

  const updatedUser = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true }).lean();
  if (!updatedUser) {
    res.status(404).json({ error: 'User not found' });
    return;
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
