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

