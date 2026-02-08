import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Post } from '../models/Post';
import { Comment } from '../models/Comment';
import { PostVote } from '../models/PostVote';
import { User } from '../models/User';
import { requireAuth, type AuthRequest } from '../middleware/auth';

const router = Router();
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

/**
 * GET /posts/:id — Get a single post with author.
 */
router.get('/:id', async (req, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  const post = await Post.findById(id).lean();
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  const author = await User.findById((post as { authorId: unknown }).authorId)
    .select('username avatarUrl preferences.anonymousInCommunity')
    .lean();
  const showAnonymous = (author as { preferences?: { anonymousInCommunity?: boolean } })?.preferences?.anonymousInCommunity === true;

  res.status(200).json({
    message: 'OK',
    post: {
      id: (post as { _id: unknown })._id,
      communityId: (post as { communityId: unknown }).communityId,
      authorId: (post as { authorId: unknown }).authorId,
      author: author
        ? {
            id: (author as { _id: unknown })._id,
            username: showAnonymous ? 'Anonymous' : (author as { username?: string }).username,
            avatarUrl: showAnonymous ? null : (author as { avatarUrl?: string }).avatarUrl,
          }
        : null,
      title: (post as { title: string }).title,
      content: (post as { content: string }).content,
      likeCount: (post as { likeCount?: number }).likeCount ?? 0,
      commentCount: (post as { commentCount?: number }).commentCount ?? 0,
      shareCount: (post as { shareCount?: number }).shareCount ?? 0,
      createdAt: (post as { createdAt?: Date }).createdAt,
      updatedAt: (post as { updatedAt?: Date }).updatedAt,
    },
  });
});

/**
 * POST /posts/:id/like — Toggle like (auth required). One like per user; sending again removes like.
 */
router.post('/:id/like', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = (user as { _id?: unknown })._id;
  const { id: postId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  const post = await Post.findById(postId);
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  const existing = await PostVote.findOne({ userId, postId });
  let liked: boolean;
  if (existing) {
    await PostVote.deleteOne({ _id: existing._id });
    if (existing.value === 1) post.likeCount = Math.max(0, post.likeCount - 1);
    else if (existing.value === -1) post.likeCount += 1;
    await post.save();
    liked = false;
  } else {
    await PostVote.create({ userId, postId, value: 1 });
    post.likeCount += 1;
    await post.save();
    liked = true;
  }

  res.status(200).json({
    liked,
    likeCount: post.likeCount,
  });
});

/**
 * GET /posts/:id/comments — List comments (paginated).
 */
router.get('/:id/comments', async (req, res: Response) => {
  const { id: postId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  const post = await Post.findById(postId);
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  const page = Math.max(1, parseInt(String(req.query.page), 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit), 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find({ postId }).sort({ createdAt: 1 }).skip(skip).limit(limit).lean(),
    Comment.countDocuments({ postId }),
  ]);

  const authorIds = [...new Set(comments.map((c) => String((c as { authorId: unknown }).authorId)))];
  const authors = await User.find({ _id: { $in: authorIds } })
    .select('username avatarUrl preferences.anonymousInCommunity')
    .lean();
  const authorMap = new Map(
    authors.map((a) => [
      String((a as { _id: unknown })._id),
      {
        id: (a as { _id: unknown })._id,
        username: (a as { username?: string }).username,
        avatarUrl: (a as { avatarUrl?: string }).avatarUrl,
        anonymousInCommunity: (a as { preferences?: { anonymousInCommunity?: boolean } }).preferences?.anonymousInCommunity,
      },
    ])
  );

  const commentsWithAuthors = comments.map((c) => {
    const author = authorMap.get(String((c as { authorId: unknown }).authorId));
    const showAnonymous = author?.anonymousInCommunity === true;
    return {
      id: (c as { _id: unknown })._id,
      postId: (c as { postId: unknown }).postId,
      authorId: (c as { authorId: unknown }).authorId,
      author: author
        ? {
            id: author.id,
            username: showAnonymous ? 'Anonymous' : author.username,
            avatarUrl: showAnonymous ? null : author.avatarUrl,
          }
        : null,
      parentId: (c as { parentId?: unknown }).parentId,
      content: (c as { content: string }).content,
      likeCount: (c as { likeCount?: number }).likeCount ?? 0,
      createdAt: (c as { createdAt?: Date }).createdAt,
    };
  });

  res.status(200).json({
    comments: commentsWithAuthors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

/**
 * POST /posts/:id/comments — Create a comment (auth required).
 */
router.post('/:id/comments', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const authorId = (user as { _id?: unknown })._id;
  const { id: postId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  const post = await Post.findById(postId);
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }

  const body = (req.body ?? {}) as { content?: string; parentId?: string };
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  if (!content) {
    res.status(400).json({ error: 'content is required and must be non-empty' });
    return;
  }

  let parentId: mongoose.Types.ObjectId | null = null;
  if (body.parentId !== undefined && body.parentId !== null && String(body.parentId).trim() !== '') {
    const parentIdStr = String(body.parentId).trim();
    if (!mongoose.Types.ObjectId.isValid(parentIdStr)) {
      res.status(400).json({ error: 'Invalid parentId' });
      return;
    }
    const parent = await Comment.findOne({
      _id: parentIdStr,
      postId,
    }).lean();
    if (!parent) {
      res.status(400).json({ error: 'Parent comment not found or does not belong to this post' });
      return;
    }
    const parentParentId = (parent as { parentId?: unknown }).parentId;
    if (parentParentId !== null && parentParentId !== undefined) {
      res.status(400).json({ error: 'You can only reply to a top-level comment, not to a reply' });
      return;
    }
    parentId = new mongoose.Types.ObjectId(parentIdStr);
  }

  const comment = await Comment.create({
    postId,
    authorId,
    parentId,
    content,
  });
  post.commentCount += 1;
  await post.save();

  const author = await User.findById(authorId)
    .select('username avatarUrl preferences.anonymousInCommunity')
    .lean();
  const showAnonymous = (author as { preferences?: { anonymousInCommunity?: boolean } })?.preferences?.anonymousInCommunity === true;

  res.status(201).json({
    message: 'Comment added',
    comment: {
      id: comment._id,
      postId: comment.postId,
      authorId: comment.authorId,
      author: author
        ? {
            id: (author as { _id: unknown })._id,
            username: showAnonymous ? 'Anonymous' : (author as { username?: string }).username,
            avatarUrl: showAnonymous ? null : (author as { avatarUrl?: string }).avatarUrl,
          }
        : null,
      parentId: comment.parentId,
      content: comment.content,
      likeCount: 0,
      createdAt: comment.createdAt,
    },
  });
});

/**
 * DELETE /posts/:id — Delete a post (auth required, author only).
 */
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = (user as { _id?: unknown })._id;
  const { id: postId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  const post = await Post.findById(postId);
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  if (String((post as { authorId: unknown }).authorId) !== String(userId)) {
    res.status(403).json({ error: 'You can only delete your own post' });
    return;
  }
  await Comment.deleteMany({ postId });
  await PostVote.deleteMany({ postId });
  await Post.findByIdAndDelete(postId);
  res.status(200).json({ message: 'Post deleted' });
});

/**
 * DELETE /posts/:id/comments/:commentId — Delete a comment (auth required, author only).
 * If the comment is top-level, any replies to it are also deleted.
 */
router.delete('/:id/comments/:commentId', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const userId = (user as { _id?: unknown })._id;
  const { id: postId, commentId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(postId) || !mongoose.Types.ObjectId.isValid(commentId)) {
    res.status(404).json({ error: 'Post or comment not found' });
    return;
  }
  const comment = await Comment.findOne({ _id: commentId, postId });
  if (!comment) {
    res.status(404).json({ error: 'Comment not found' });
    return;
  }
  if (String((comment as { authorId: unknown }).authorId) !== String(userId)) {
    res.status(403).json({ error: 'You can only delete your own comment' });
    return;
  }
  const replies = await Comment.find({ postId, parentId: commentId });
  const deletedCount = 1 + replies.length;
  await Comment.deleteMany({ _id: { $in: [commentId, ...replies.map((r) => r._id)] } });
  await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -deletedCount } });
  res.status(200).json({ message: 'Comment deleted' });
});

/**
 * POST /posts/:id/share — Increment share count (auth required).
 */
router.post('/:id/share', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const { id: postId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  const post = await Post.findByIdAndUpdate(postId, { $inc: { shareCount: 1 } }, { new: true });
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  res.status(200).json({
    shareCount: post.shareCount,
  });
});

export const postRoutes = router;
