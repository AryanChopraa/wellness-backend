import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Community } from '../models/Community';
import { Post } from '../models/Post';
import { User } from '../models/User';
import { requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();

const DEFAULT_COMMUNITY_SLUG = 'general';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type PostFilter = 'trending' | 'hot' | 'newest' | 'most_liked' | 'most_commented';

/** Ensure default community exists. */
async function ensureDefaultCommunity() {
  let community = await Community.findOne({ slug: DEFAULT_COMMUNITY_SLUG });
  if (!community) {
    community = await Community.create({
      name: 'General',
      slug: DEFAULT_COMMUNITY_SLUG,
      description: 'The main community for everyone. Share, discuss, and connect.',
    });
  }
  return community;
}

/**
 * GET /communities — List communities (for now returns the single default one).
 */
router.get('/', async (_req, res: Response) => {
  const community = await ensureDefaultCommunity();
  const list = await Community.find({}).lean().sort({ createdAt: 1 });
  res.status(200).json({
    communities: list.map((c) => ({
      id: (c as { _id: unknown })._id,
      name: (c as { name: string }).name,
      slug: (c as { slug: string }).slug,
      description: (c as { description?: string }).description,
    })),
  });
});

/**
 * GET /communities/:idOrSlug — Get one community by id or slug.
 */
router.get('/:idOrSlug', async (req, res: Response) => {
  await ensureDefaultCommunity();
  const { idOrSlug } = req.params;
  const isId = mongoose.Types.ObjectId.isValid(idOrSlug) && String(new mongoose.Types.ObjectId(idOrSlug)) === idOrSlug;
  const community = isId
    ? await Community.findById(idOrSlug).lean()
    : await Community.findOne({ slug: idOrSlug.toLowerCase() }).lean();
  if (!community) {
    res.status(404).json({ error: 'Community not found' });
    return;
  }
  res.status(200).json({
    community: {
      id: (community as { _id: unknown })._id,
      name: (community as { name: string }).name,
      slug: (community as { slug: string }).slug,
      description: (community as { description?: string }).description,
    },
  });
});

/**
 * GET /communities/:idOrSlug/posts — List posts with filter and pagination.
 * Query: filter=trending|hot|newest|most_liked|most_commented (default: trending), page=1, limit=20
 *
 * Scoring:
 * - newest: sort by createdAt desc
 * - most_liked: sort by likeCount desc
 * - most_commented: sort by commentCount desc
 * - trending: score = likeCount + commentCount*2 + shareCount, sort by score desc
 * - hot: score = (likeCount + commentCount*2) / (1 + hoursSinceCreation)^1.5, sort by hotScore desc
 */
router.get('/:idOrSlug/posts', async (req, res: Response) => {
  await ensureDefaultCommunity();
  const { idOrSlug } = req.params;
  const isId = mongoose.Types.ObjectId.isValid(idOrSlug) && String(new mongoose.Types.ObjectId(idOrSlug)) === idOrSlug;
  const community = isId
    ? await Community.findById(idOrSlug)
    : await Community.findOne({ slug: idOrSlug.toLowerCase() });
  if (!community) {
    res.status(404).json({ error: 'Community not found' });
    return;
  }
  const communityId = community._id;

  const filter = (req.query.filter as string) || 'trending';
  const validFilters: PostFilter[] = ['trending', 'hot', 'newest', 'most_liked', 'most_commented'];
  const sortFilter: PostFilter = validFilters.includes(filter as PostFilter) ? (filter as PostFilter) : 'trending';

  const page = Math.max(1, parseInt(String(req.query.page), 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit), 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  let posts: Array<Record<string, unknown>>;
  let total: number;

  if (sortFilter === 'newest') {
    const [result, countResult] = await Promise.all([
      Post.find({ communityId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments({ communityId }),
    ]);
    posts = result as Array<Record<string, unknown>>;
    total = countResult;
  } else if (sortFilter === 'most_liked') {
    const [result, countResult] = await Promise.all([
      Post.find({ communityId })
        .sort({ likeCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments({ communityId }),
    ]);
    posts = result as Array<Record<string, unknown>>;
    total = countResult;
  } else if (sortFilter === 'most_commented') {
    const [result, countResult] = await Promise.all([
      Post.find({ communityId })
        .sort({ commentCount: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments({ communityId }),
    ]);
    posts = result as Array<Record<string, unknown>>;
    total = countResult;
  } else if (sortFilter === 'trending') {
    const [result, countResult] = await Promise.all([
      Post.aggregate([
        { $match: { communityId: new mongoose.Types.ObjectId(communityId as unknown as string) } },
        {
          $addFields: {
            trendingScore: {
              $add: [
                '$likeCount',
                { $multiply: ['$commentCount', 2] },
                '$shareCount',
              ],
            },
          },
        },
        { $sort: { trendingScore: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]),
      Post.countDocuments({ communityId }),
    ]);
    posts = result;
    total = countResult;
  } else {
    // hot: (likeCount + commentCount*2) / (1 + hours)^1.5
    const [result, countResult] = await Promise.all([
      Post.aggregate([
        { $match: { communityId: new mongoose.Types.ObjectId(communityId as unknown as string) } },
        {
          $addFields: {
            hoursSince: {
              $divide: [{ $subtract: [new Date(), '$createdAt'] }, 3600000],
            },
          },
        },
        {
          $addFields: {
            hotScore: {
              $divide: [
                { $add: ['$likeCount', { $multiply: ['$commentCount', 2] }] },
                { $pow: [{ $add: [1, '$hoursSince'] }, 1.5] },
              ],
            },
          },
        },
        { $sort: { hotScore: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        { $project: { hoursSince: 0 } },
      ]),
      Post.countDocuments({ communityId }),
    ]);
    posts = result;
    total = countResult;
  }

  const authorIds = [...new Set(posts.map((p) => String((p as { authorId: unknown }).authorId)))];
  const authors = await User.find({ _id: { $in: authorIds } })
    .select('username nickname displayName avatarUrl preferences.anonymousInCommunity')
    .lean();

  const authorMap = new Map(
    authors.map((a) => [
      String((a as { _id: unknown })._id),
      {
        id: (a as { _id: unknown })._id,
        username: (a as { username?: string }).username,
        nickname: (a as { nickname?: string }).nickname,
        displayName: (a as { displayName?: string }).displayName,
        avatarUrl: (a as { avatarUrl?: string }).avatarUrl,
        anonymousInCommunity: (a as { preferences?: { anonymousInCommunity?: boolean } }).preferences?.anonymousInCommunity,
      },
    ])
  );

  const postsWithAuthors = posts.map((p) => {
    const authorId = String((p as { authorId: unknown }).authorId);
    const author = authorMap.get(authorId);
    const showAnonymous = author?.anonymousInCommunity === true;
    return {
      id: (p as { _id: unknown })._id,
      communityId: (p as { communityId: unknown }).communityId,
      authorId: (p as { authorId: unknown }).authorId,
      author: author
        ? {
            id: author.id,
            username: showAnonymous ? null : author.username,
            nickname: showAnonymous ? 'Anonymous' : author.nickname ?? author.displayName,
            avatarUrl: showAnonymous ? null : author.avatarUrl,
          }
        : null,
      title: (p as { title: string }).title,
      content: (p as { content: string }).content,
      likeCount: (p as { likeCount?: number }).likeCount ?? 0,
      commentCount: (p as { commentCount?: number }).commentCount ?? 0,
      shareCount: (p as { shareCount?: number }).shareCount ?? 0,
      createdAt: (p as { createdAt?: Date }).createdAt,
      updatedAt: (p as { updatedAt?: Date }).updatedAt,
    };
  });

  res.status(200).json({
    posts: postsWithAuthors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    filter: sortFilter,
  });
});

/**
 * POST /communities/:idOrSlug/posts — Create a post (auth required).
 */
router.post('/:idOrSlug/posts', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  await ensureDefaultCommunity();
  const { idOrSlug } = req.params;
  const isId = mongoose.Types.ObjectId.isValid(idOrSlug) && String(new mongoose.Types.ObjectId(idOrSlug)) === idOrSlug;
  const community = isId
    ? await Community.findById(idOrSlug)
    : await Community.findOne({ slug: idOrSlug.toLowerCase() });
  if (!community) {
    res.status(404).json({ error: 'Community not found' });
    return;
  }

  const body = (req.body ?? {}) as { title?: string; content?: string };
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';

  if (!title || title.length < 1) {
    res.status(400).json({ error: 'title is required and must be non-empty' });
    return;
  }
  if (!content || content.length < 1) {
    res.status(400).json({ error: 'content is required and must be non-empty' });
    return;
  }

  const post = await Post.create({
    communityId: community._id,
    authorId: (user as { _id?: unknown })._id,
    title,
    content,
  });

  const author = await User.findById((user as { _id?: unknown })._id)
    .select('username nickname displayName avatarUrl preferences.anonymousInCommunity')
    .lean();

  const showAnonymous = (author as { preferences?: { anonymousInCommunity?: boolean } })?.preferences?.anonymousInCommunity === true;

  res.status(201).json({
    post: {
      id: post._id,
      communityId: post.communityId,
      authorId: post.authorId,
      author: author
        ? {
            id: (author as { _id: unknown })._id,
            username: showAnonymous ? null : (author as { username?: string }).username,
            nickname: showAnonymous ? 'Anonymous' : (author as { nickname?: string }).nickname ?? (author as { displayName?: string }).displayName,
            avatarUrl: showAnonymous ? null : (author as { avatarUrl?: string }).avatarUrl,
          }
        : null,
      title: post.title,
      content: post.content,
      likeCount: 0,
      commentCount: 0,
      shareCount: 0,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    },
  });
});

export const communityRoutes = router;
