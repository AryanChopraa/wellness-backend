import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { sendError } from '../utils/response';
import { getVeniceCompletion, type ChatMessage } from '../services/veniceChat';
import { generateConversationTitle } from '../services/openaiTitle';
import { buildWellnessProfileForChat } from '../utils/chatProfile';
import { Assessment } from '../models/Assessment';
import { getWellnessProfile } from '../services/wellnessProfile';
import { ALLY_CHAT_SYSTEM_PROMPT_TEMPLATE } from '../prompts/chatSystemPrompt';
import { getPersonasForGender, getPersonaById } from '../config/personas';

const router = Router();

/** Default max total messages (user + assistant) per conversation if not set for user. */
const DEFAULT_MAX_MESSAGES_PER_CONVERSATION = 100;


// ---------------------------------------------------------------------------
// GET /chat/config – get available personas based on user gender
// ---------------------------------------------------------------------------
router.get('/config', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;

  // Fetch assessment for gender, defaulting to female set if not found/specified (safe default)
  const assessment = await Assessment.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
  const gender = assessment?.gender || 'female';

  const personas = getPersonasForGender(gender);

  res.json({
    personas: personas.map(p => ({
      id: p.id,
      name: p.name,
      role: p.role,
      description: p.description,
      avatarUrl: p.avatarUrl
    }))
  });
});

// ---------------------------------------------------------------------------
// POST /chat/conversations – create a new conversation
// Body: { title?: string, personaId?: string }
// ---------------------------------------------------------------------------
router.post('/conversations', requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : 'New conversation';
  const personaId = typeof req.body?.personaId === 'string' ? req.body.personaId.trim() : undefined;

  // Validate persona if provided
  if (personaId) {
    const assessment = await Assessment.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();
    const gender = assessment?.gender || 'female';
    const allowedPersonas = getPersonasForGender(gender);
    if (!allowedPersonas.some(p => p.id === personaId)) {
      sendError(res, 400, 'Invalid persona for user');
      return;
    }
  }

  const conversation = await Conversation.create({
    userId: new mongoose.Types.ObjectId(userId),
    title: title || 'New conversation',
    persona: personaId
  });

  res.status(201).json({
    conversation: {
      id: conversation._id.toString(),
      title: conversation.title,
      persona: conversation.persona,
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
    persona: (c as { persona?: string }).persona,
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
      persona: (conversation as { persona?: string }).persona,
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

  // Rate limit: using user-specific limit (or fallback to default)
  const userMessageLimit = (req.user as { messageLimit?: number })?.messageLimit ?? DEFAULT_MAX_MESSAGES_PER_CONVERSATION;
  if (currentCount + 2 > userMessageLimit) {

    res.status(429).json({
      error: 'Rate limit reached',
      message: 'Rate limit reached',
      rateLimitReached: true,
      content: 'Rate limit reached. This conversation has reached the maximum number of messages.',
    });
    return;
  }

  const convId = new mongoose.Types.ObjectId(conversationId);

  // Crisis detection: if user message suggests self-harm, return fixed response and do not call AI
  const crisisPattern = /\b(suicide|kill myself|self[- ]harm|end (it|my life)|want to die)\b/i;
  if (crisisPattern.test(content)) {
    const crisisMessage = "I'm really concerned about you. Please reach out to a crisis helpline—they're there 24/7. In the US: 988 (Suicide & Crisis Lifeline). I care, but I can't provide emergency support. Please talk to someone who can help right now.";
    const [userMsg, assistantMsg] = await Promise.all([
      Message.create({ conversationId: convId, role: 'user', content }),
      Message.create({ conversationId: convId, role: 'assistant', content: crisisMessage }),
    ]);
    await Conversation.updateOne({ _id: conversation._id }, { $set: { updatedAt: new Date() } });
    res.status(201).json({
      userMessage: { id: userMsg._id.toString(), role: 'user', content, createdAt: (userMsg as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString() },
      assistantMessage: { id: assistantMsg._id.toString(), role: 'assistant', content: crisisMessage, createdAt: (assistantMsg as { createdAt?: Date }).createdAt?.toISOString?.() ?? new Date().toISOString() },
      rateLimitReached: false,
      crisisRedirect: true,
    });
    return;
  }

  // Load history for context (all messages in order)
  const history = await Message.find({ conversationId: convId }).sort({ createdAt: 1 }).lean();
  const apiMessages: ChatMessage[] = history.map((m) => ({
    role: (m as { role: 'user' | 'assistant' }).role,
    content: (m as { content: string }).content,
  }));
  apiMessages.push({ role: 'user', content });

  // Use wellness profile (Assessment) for AI context
  const assessment = await Assessment.findOne({ userId: new mongoose.Types.ObjectId(userId) }).lean();

  // Determine System Prompt
  let systemPrompt: string | undefined;

  const personaId = (conversation as { persona?: string }).persona;
  if (personaId) {
    // 1. Persona-based conversation
    const persona = getPersonaById(personaId);
    if (persona) {
      systemPrompt = persona.systemPrompt;
    }
  }

  // 2. Fallback to standard "Ally" (Wellness Profile) or "Eva" (Legacy) logic if no persona
  if (!systemPrompt) {
    const wellnessProfile = getWellnessProfile(assessment);
    const useAlly = !!wellnessProfile;
    systemPrompt = ALLY_CHAT_SYSTEM_PROMPT_TEMPLATE.replace(/\{userProfile\}/g, buildWellnessProfileForChat(wellnessProfile));
  }

  const userProfile = undefined;

  let assistantContent: string;
  try {
    const result = await getVeniceCompletion(
      systemPrompt ? { messages: apiMessages, systemPrompt } : { messages: apiMessages, userProfile }
    );
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
