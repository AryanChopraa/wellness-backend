import OpenAI from 'openai';
import { env } from '../config/env';

const TITLE_INSTRUCTIONS = `Your job is to give a title to a chat based on the first message given by the user and the response from the assistant. Give a short title to the conversation (a few words, 2–8 words). Reply with only the title, no quotes or extra punctuation.`;

/**
 * Generate a conversation title from the first user message and first assistant response.
 * Uses OpenAI Responses API (gpt-4.1-nano). Returns trimmed title or empty string on failure.
 */
export async function generateConversationTitle(
  firstUserMessage: string,
  firstAssistantMessage: string
): Promise<string> {
  const { apiKey, titleModel } = env.openai;
  if (!apiKey) {
    return '';
  }

  const userBlurb = `user: ${firstUserMessage.slice(0, 500)}\nassistant: ${firstAssistantMessage.slice(0, 500)}`;

  const openai = new OpenAI({ apiKey });

  const response = await openai.responses.create({
    model: titleModel,
    instructions: TITLE_INSTRUCTIONS,
    input: userBlurb,
    text: { format: { type: 'text' } },
    reasoning: {},
    tools: [],
    temperature: 1,
    max_output_tokens: 2048,
    top_p: 1,
    store: true,
  });

  const title = (response.output_text ?? '').trim();
  return title.slice(0, 120) || '';
}
