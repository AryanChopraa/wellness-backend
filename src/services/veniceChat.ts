import { env } from '../config/env';

const VENICE_CHAT_URL = 'https://api.venice.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `You are a helpful, friendly wellness and lifestyle assistant. You help users with questions about health, wellness, fitness, nutrition, mental well-being, and related topics. Be supportive, accurate, and concise. If you're unsure about medical or safety-related advice, suggest consulting a healthcare professional. Maintain context from the conversation history and respond in a consistent, helpful tone.`;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VeniceChatOptions {
  messages: ChatMessage[];
}

export interface VeniceChatResult {
  content: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * Call Venice AI chat completions API with system prompt and message history.
 * Throws on network/API errors or missing API key.
 */
export async function getVeniceCompletion(options: VeniceChatOptions): Promise<VeniceChatResult> {
  const { apiKey, model } = env.venice;
  if (!apiKey) {
    throw new Error('VENICE_API_KEY is not configured');
  }

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...options.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const res = await fetch(VENICE_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  const data = (await res.json()) as {
    error?: string;
    choices?: Array<{
      message?: { role?: string; content?: string };
    }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };

  if (!res.ok || data.error) {
    const errMsg = typeof data.error === 'string' ? data.error : 'Venice API request failed';
    throw new Error(errMsg);
  }

  const content = data.choices?.[0]?.message?.content ?? '';
  return {
    content,
    usage: data.usage,
  };
}

const TITLE_SYSTEM_PROMPT = `Your job is to give a short title to a chat based on the first message from the user and the first response from the assistant. Reply with only the title: a few words (2–8 words), no quotes, no punctuation at the end. Do not explain.`;

/**
 * Generate a conversation title from the first user message and first assistant response.
 * Uses the same Venice API. Returns trimmed title or empty string on failure.
 */
export async function generateConversationTitle(
  firstUserMessage: string,
  firstAssistantMessage: string
): Promise<string> {
  const { apiKey, model } = env.venice;
  if (!apiKey) {
    return '';
  }

  const userBlurb = `User: ${firstUserMessage.slice(0, 500)}\nAssistant: ${firstAssistantMessage.slice(0, 500)}`;

  const messages = [
    { role: 'system' as const, content: TITLE_SYSTEM_PROMPT },
    { role: 'user' as const, content: userBlurb },
  ];

  const res = await fetch(VENICE_CHAT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  const data = (await res.json()) as {
    error?: string;
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!res.ok || data.error) {
    return '';
  }

  const title = (data.choices?.[0]?.message?.content ?? '').trim();
  return title.slice(0, 120) || '';
}
