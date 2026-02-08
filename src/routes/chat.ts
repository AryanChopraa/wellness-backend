import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { sendError } from '../utils/response';
import { getVeniceCompletion, type ChatMessage } from '../services/veniceChat';
import { generateConversationTitle } from '../services/openaiTitle';

const router = Router();

/** Max total messages (user + assistant) per conversation. */
const MAX_MESSAGES_PER_CONVERSATION = 100;

// ---------------------------------------------------------------------------
// POST /chat/conversations – create a new conversation
// Body: { title?: string }
// ---------------------------------------------------------------------------
router.post('/conversations', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : 'New conversation';

  const conversation = await Conversation.create({
    userId: new mongoose.Types.ObjectId(userId),
    title: title || 'New conversation',
  });

  res.status(201).json({
    conversation: {
      id: conversation._id.toString(),
      title: conversation.title,
      createdAt: (conversation as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString(),
    },
  });
});

// ---------------------------------------------------------------------------
// GET /chat/conversations – list current user's conversations
// ---------------------------------------------------------------------------
router.get('/conversations', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  const conversations = await Conversation.find({ userId: new mongoose.Types.ObjectId(userId) })
    .sort({ updatedAt: -1 })
    .lean();

  const list = conversations.map((c) => ({
    id: (c._id as mongoose.Types.ObjectId).toString(),
    title: (c as { title?: string }).title ?? 'New conversation',
    createdAt: (c as { createdAt?: Date }).createdAt?.toISOString?.() ?? '',
    updatedAt: (c as { updatedAt?: Date }).updatedAt?.toISOString?.() ?? '',
  }));

  res.json({ conversations: list });
});

// ---------------------------------------------------------------------------
// GET /chat/conversations/:id – get one conversation with messages (for history)
// ---------------------------------------------------------------------------
router.get('/conversations/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    sendError(res, 400, 'Invalid conversation id');
    return;
  }

  const conversation = await Conversation.findOne({
    _id: new mongoose.Types.ObjectId(id),
    userId: new mongoose.Types.ObjectId(userId),
  }).lean();

  if (!conversation) {
    sendError(res, 404, 'Conversation not found');
    return;
  }

  const messages = await Message.find({ conversationId: new mongoose.Types.ObjectId(id) })
    .sort({ createdAt: 1 })
    .lean();

  const messageList = messages.map((m) => ({
    id: (m._id as mongoose.Types.ObjectId).toString(),
    role: (m as { role: string }).role,
    content: (m as { content: string }).content,
    createdAt: (m as { createdAt?: Date }).createdAt?.toISOString?.() ?? '',
  }));

  res.json({
    conversation: {
      id: (conversation._id as mongoose.Types.ObjectId).toString(),
      title: (conversation as { title?: string }).title ?? 'New conversation',
      createdAt: (conversation as { createdAt?: Date }).createdAt?.toISOString?.() ?? '',
      updatedAt: (conversation as { updatedAt?: Date }).updatedAt?.toISOString?.() ?? '',
      messageCount: messageList.length,
    },
    messages: messageList,
  });
});

// ---------------------------------------------------------------------------
// POST /chat/conversations/:id/messages – send a message, get AI reply
// Body: { content: string }
// Rate limit: 100 total messages (user + assistant) per conversation.
// If at or over limit, returns { content: "Rate limit reached", rateLimitReached: true }.
// ---------------------------------------------------------------------------
router.post('/conversations/:id/messages', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { id: conversationId } = req.params;
  const content = typeof req.body?.content === 'string' ? req.body.content.trim() : '';

  if (!content) {
    sendError(res, 400, 'Message content is required');
    return;
  }

  if (!mongoose.isValidObjectId(conversationId)) {
    sendError(res, 400, 'Invalid conversation id');
    return;
  }

  const conversation = await Conversation.findOne({
    _id: new mongoose.Types.ObjectId(conversationId),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!conversation) {
    sendError(res, 404, 'Conversation not found');
    return;
  }

  const currentCount = await Message.countDocuments({ conversationId: new mongoose.Types.ObjectId(conversationId) });

  // Rate limit: 100 total messages (user + assistant) per conversation.
  // If at or over limit: return 429 without calling the AI and without saving the user message.
  if (currentCount + 2 > MAX_MESSAGES_PER_CONVERSATION) {
    res.status(429).json({
      error: 'Rate limit reached',
      message: 'Rate limit reached',
      rateLimitReached: true,
      content: 'Rate limit reached. This conversation has reached the maximum number of messages.',
    });
    return;
  }

  const convId = new mongoose.Types.ObjectId(conversationId);

  // Load history for context (all messages in order)
  const history = await Message.find({ conversationId: convId }).sort({ createdAt: 1 }).lean();
  const apiMessages: ChatMessage[] = history.map((m) => ({
    role: (m as { role: 'user' | 'assistant' }).role,
    content: (m as { content: string }).content,
  }));
  apiMessages.push({ role: 'user', content });

  let assistantContent: string;
  try {
    const result = await getVeniceCompletion({ messages: apiMessages });
    assistantContent = result.content;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI service error';
    sendError(res, 502, message);
    return;
  }

  const [userMsg, assistantMsg] = await Promise.all([
    Message.create({
      conversationId: convId,
      role: 'user',
      content,
    }),
    Message.create({
      conversationId: convId,
      role: 'assistant',
      content: assistantContent,
    }),
  ]);

  let conversationTitle: string | undefined;
  const isFirstExchange = history.length === 0;
  if (isFirstExchange) {
    try {
      const generatedTitle = await generateConversationTitle(content, assistantContent);
      if (generatedTitle) {
        await Conversation.updateOne(
          { _id: conversation._id },
          { $set: { title: generatedTitle, updatedAt: new Date() } }
        );
        conversationTitle = generatedTitle;
      } else {
        await Conversation.updateOne(
          { _id: conversation._id },
          { $set: { updatedAt: new Date() } }
        );
      }
    } catch {
      await Conversation.updateOne(
        { _id: conversation._id },
        { $set: { updatedAt: new Date() } }
      );
    }
  } else {
    await Conversation.updateOne(
      { _id: conversation._id },
      { $set: { updatedAt: new Date() } }
    );
  }

  const payload: Record<string, unknown> = {
    userMessage: {
      id: userMsg._id.toString(),
      role: 'user',
      content: userMsg.content,
      createdAt: (userMsg as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString(),
    },
    assistantMessage: {
      id: assistantMsg._id.toString(),
      role: 'assistant',
      content: assistantMsg.content,
      createdAt: (assistantMsg as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString(),
    },
    rateLimitReached: false,
  };
  if (conversationTitle !== undefined) {
    payload.conversationTitle = conversationTitle;
  }
  res.status(201).json(payload);
});

export const chatRoutes = router;
