import { env } from '../config/env';

const VENICE_CHAT_URL = 'https://api.venice.ai/api/v1/chat/completions';

const SYSTEM_PROMPT_TEMPLATE = `You are a friendly, no-BS GenZ wellness assistant specializing in sexual intimacy and wellness. You answer every question directly, playfully, and without judgment. Your tone is like talking to a savvy, knowledgeable best friend who gets it. Be straightforward, use clear and modern language, and never be vague or preachy. Your goal is to make sexual wellness feel normal, accessible, and easy to talk about.

Personalization is key. Use the provided user profile to tailor your language, examples, and the depth of your answers. For example, if the user is new to these topics, be more foundational. If they're experienced, you can be more direct and use more specific terminology. Always adapt to their stated identity and comfort level.

User Profile:
{userProfile}`;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VeniceChatOptions {
  messages: ChatMessage[];
  /** User profile string (from onboarding) for personalization. If empty, a generic placeholder is used. */
  userProfile?: string;
}

export interface VeniceChatResult {
  content: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

/**
 * Call Venice AI chat completions API with system prompt and message history.
 * System prompt includes user profile for personalization when provided.
 * Throws on network/API errors or missing API key.
 */
export async function getVeniceCompletion(options: VeniceChatOptions): Promise<VeniceChatResult> {
  const { apiKey, model } = env.venice;
  if (!apiKey) {
    throw new Error('VENICE_API_KEY is not configured');
  }

  const userProfile =
    typeof options.userProfile === 'string' && options.userProfile.trim()
      ? options.userProfile.trim()
      : 'No profile provided; respond in a general, inclusive way.';

  const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace(/\{userProfile\}/g, userProfile);

  const messages = [
    { role: 'system' as const, content: systemPrompt },
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
