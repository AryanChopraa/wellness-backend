# Chat feature — Version 2

This document describes **Version 2**: the **updated MCQ-only onboarding questionnaire** and **chat advances** (personalized AI, user profile, rate limit, history, titles). Use this for frontend integration.

---

## 1. Updated questionnaire (MCQ-only)

Onboarding is **MCQ-only**. No free-text questions. The same questionnaire is submitted via **PUT /profile** and feeds into the **chat user profile** for personalization.

### Required fields (always in onboarding)

| Field                | Type     | Values |
|----------------------|----------|--------|
| `username`           | string   | 3–30 chars, `a-z` `0-9` `_` |
| `age`                | number   | ≥ 18 |
| `gender`             | string   | `male` \| `female` \| `non-binary` \| `prefer-not-to-say` |
| `relationshipStatus` | string   | `single` \| `dating` \| `married` \| `complicated` |
| `mainInterests`      | string[] | At least one: `relationship-advice`, `intimacy-techniques`, `product-knowledge`, `general-education` |
| `sexualExperience`   | string   | `virgin` \| `some-experience` \| `experienced` \| `prefer-not-to-say` |

### Optional fields (chat personalization; all skippable via `prefer-not-to-say`)

| Field                  | Type   | Values |
|------------------------|--------|--------|
| `physicalActivityLevel`| string | `sedentary` \| `light` \| `moderate` \| `active` \| `prefer-not-to-say` |
| `selfRatedInBed`       | string | `beginner` \| `somewhat-confident` \| `confident` \| `prefer-not-to-say` |
| `whatToImproveChat`    | string | `stamina` \| `technique` \| `communication` \| `confidence` \| `exploration` \| `prefer-not-to-say` |
| `intimacyComfortLevel` | string | `shy` \| `getting-comfortable` \| `comfortable` \| `very-open` \| `prefer-not-to-say` |

- **PUT /profile** — Request body includes the required fields above; optional fields can be omitted or set to `prefer-not-to-say` to skip.
- **GET /profile** — Returns `onboarding` with the same MCQ fields (no string/question fields).

These answers are used to build a **user profile string** that is injected into the chat AI’s system prompt (see below).

---

## 2. Chat advances (Version 2)

### Personalized AI (Venice + user profile)

- **Chat replies:** **Venice AI** (chat completions). Full conversation history is sent with each request.
- **System prompt:** GenZ wellness assistant (sexual intimacy and wellness). It includes a **User Profile** block that is built from the onboarding MCQs above (e.g. “User is a female, age 25. Sexual experience: some experience. Relationship: dating. Main interests: … Physical activity level: moderate. Self-rated in bed: somewhat confident. Wants to improve: confidence. Intimacy comfort level: comfortable.”). Any field set to `prefer-not-to-say` or not provided is omitted.
- **Personalization:** The model is instructed to tailor tone, depth, and examples to this profile (e.g. more foundational for beginners, more direct for experienced users).

### Conversation title (OpenAI)

- After the **first** user message and first AI reply in a conversation, the backend calls **OpenAI** (Responses API, gpt-4.1-nano) to generate a short title from that exchange.
- The title is stored on the conversation and returned in list/history; the first **POST .../messages** success may include `conversationTitle` so the client can update the list without refetching.
- If title generation fails or OpenAI is not configured, the conversation keeps “New conversation”.

### History

- **GET /chat/conversations/:id** — Returns the conversation (with title) and **all messages** in chronological order. Use this to load chat history.
- Messages are stored in order and sent to Venice in that order so the AI keeps full context.

### Rate limit (100 messages per conversation)

- **Limit:** 100 messages **total** per conversation (user + assistant combined).
- **When:** On **POST /chat/conversations/:id/messages** (send message).
- **If at/over limit:** Backend **does not** call the AI and **does not** save the new user message. It returns **HTTP 429** with `rateLimitReached: true` and a `content`/`message` for the user (e.g. “Rate limit reached. This conversation has reached the maximum number of messages.”).
- **Frontend:** On 429 or `rateLimitReached === true`, show the message and do not add the last user input to the thread (nothing was stored).

---

## 3. API summary (chat)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/chat/conversations` | Bearer | Create conversation (body: `{ title?: string }`). |
| GET | `/chat/conversations` | Bearer | List current user’s conversations. |
| GET | `/chat/conversations/:id` | Bearer | Get one conversation (title + full message history). |
| POST | `/chat/conversations/:id/messages` | Bearer | Send message (body: `{ content: string }`). Returns user + assistant messages; or **429** with `rateLimitReached: true` when at 100 messages. |

---

## 4. Response shapes (chat)

**Success (201) — message sent, AI replied:**

- `userMessage`: `{ id, role: "user", content, createdAt }`
- `assistantMessage`: `{ id, role: "assistant", content, createdAt }`
- `rateLimitReached`: `false`
- `conversationTitle`: (optional) Only on first message in conversation; AI-generated title.

**Rate limit (429):**

- `rateLimitReached`: `true`, `error` / `content`: user-facing message. Do not add the user’s last message to the UI.

**Success (200) — GET /chat/conversations/:id (history):**

- `conversation`: `{ id, title, createdAt, updatedAt, messageCount }`
- `messages`: `[{ id, role, content, createdAt }, ...]` in chronological order
