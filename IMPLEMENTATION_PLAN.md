# Enhanced Workflow Implementation Plan

## Current Backend Structure (Already Implemented)

| Area | Status | Notes |
|------|--------|--------|
| **Auth** | ✅ | OTP (email/phone), JWT, requireAuth |
| **User** | ✅ | email, phone, username, avatarUrl, age, hasOnboarded, preferences (anonymousInCommunity, notifications) |
| **Legacy profile** | ✅ | Onboarding model: old questionnaire schema (PUT /profile). Not used for new users; use Assessment. |
| **Profile** | ✅ | GET/PATCH/PUT; PUT = legacy questionnaire (deprecated for new flow) |
| **Chat** | ✅ | Conversations, messages, Venice AI; uses Assessment for Ally, falls back to legacy profile for Eva if no assessment |
| **Communities** | ✅ | List, get by slug, default "general" |
| **Posts** | ✅ | CRUD, like (PostVote), comments, share; filter trending/hot/newest |
| **Comments** | ✅ | Nested (parentId), likeCount |
| **Assets** | ✅ | GCS upload, userId-scoped |
| **Products** | ✅ | Categories, product data |

## Gap vs Enhanced Workflow (What to Build)

### 1. 10-Question Assessment (Wellness Questionnaire)
- **Current:** Legacy PUT /profile has different questions (mainInterests, sexualExperience, etc.).
- **Needed:** New **Assessment** model storing the doc’s 10 questions:
  - Q1: concerns (multi-select) → tags
  - Q2: duration → urgency_score (1–4)
  - Q3: daily life impact → severity_score (1–5)
  - Q4: relationship_status (yes_they_know | yes_havent_shared | no_single | complicated)
  - Q5: goals (multi-select, max 3)
  - Q6: support_history (therapist | friends_family | first_time | tried_not_helpful)
  - Q7: stress_level (1–10)
  - Q8: primary_fear
  - Q9: learning_style (videos | reading | interactive | talking | mix)
  - Q10: preferred_time (morning | midday | afternoon | evening | night | varies)
- **Routes:** `POST /assessment` (submit), `GET /assessment` (current user’s assessment), `GET /assessment/wellness-profile` (computed profile for results page & personalization).

### 2. Wellness Profile & Processing
- **Service:** `getWellnessProfile(assessment)` → `{ concerns, urgency, severity, relationship_status, goals, support_history, stress_level, primary_fear, learning_style, preferred_time }`.
- Used by: results page, chat (Ally), exercise recommendations, video recommendations, community “For You”, notifications (preferred_time).

### 3. Chat (Ally)
- **Current:** Eva, flirty tone, profile from legacy questionnaire when no Assessment.
- **Needed:** Ally persona (empathetic wellness companion), system prompt from **wellness profile** (concerns, primary_fear, severity → tone), crisis detection (self-harm → redirect to hotline), optional daily message limit (e.g. 10) for free tier.
- **Changes:** Use Assessment when present for `buildUserProfile` / new `buildWellnessProfileForChat`; add crisis keyword check before calling AI.

### 4. Exercises & Daily Journey
- **New models:**
  - **Exercise:** title, description, type (journaling | guided_audio | interactive | micro_lesson | challenge), durationMinutes, tags[], severityLevels[], goalTags[], content or contentUrl, order/phase.
  - **UserProgress:** userId, dayNumber, exerciseId, completed, moodRating (1–5 or emoji), completedAt.
- **Routes:** `GET /exercises` (filter by tags/goals/severity; for library), `GET /progress` (current user: streak, completed exercises, mood over time), `POST /progress` (complete exercise + mood), `GET /plan` or `GET /assessment/plan` (7-day or 30-day personalized plan from wellness profile).

### 5. Video Library
- **New model:** **Video** (title, description, duration, thumbnailUrl, tags[], fearAddressed?, severityLevels[], relationshipFilter?, viewCount).
- **Route:** `GET /videos` (recommended for user from assessment tags/severity); optional `GET /videos/:id`.

### 6. Community Enhancements
- **Post:** Add `postType` (question | story | progress_update | resource_share | seeking_support), `tags[]` (for “For You” by concerns), optional `severityLevel`, optional `triggerWarnings[]`.
- **Reactions:** Replace or extend like with reaction types: `relate` | `support` | `celebrate` | `helpful`. New **PostReaction** (userId, postId, type) or extend PostVote with type.
- **Topic boards:** Either multiple communities (slug = topic) or single community + post tags; “For You” feed = filter by user’s assessment tags.
- **Anonymous display names:** Generate e.g. Hopeful_Phoenix_2847 (store `anonymousDisplayName` on User or in preferences).
- **Saved posts:** **UserSavedPost** (userId, postId). Route: POST/DELETE /posts/:id/save, GET /profile/saved-posts.

### 7. Progress & Streak
- **Streak:** Compute from UserProgress (consecutive days with at least one completed exercise).
- **Route:** `GET /progress` already returns streak; ensure completedAt dates are used for “last 7 days” etc.
- **Weekly check-in:** New **CheckIn** (userId, weekNumber, goalProximityPercent, feeling, whatHelped[], noteForAlly). Route: `POST /progress/check-in`, `GET /progress` includes latest check-in.

### 8. User Preferences Extension
- **User.preferences:** Add `preferredTime` (from Q10, for notifications), `learningStyle` (from Q9). Or keep these only on Assessment and read from there when building profile/notifications.

---

## Implementation Order

1. **Assessment** – types, model, routes, wellness profile service. ✅
2. **Chat (Ally)** – use wellness profile in prompt, crisis detection. ✅
3. **Exercise + UserProgress** – models, routes, plan generation (rule-based from profile). ✅
4. **Video** – model, route, recommend by tags/severity. ✅
5. **Community** – post types, tags, reactions, saved posts, “For You” feed.
6. **Progress** – streak logic, weekly check-in model and route. ✅

---

## New API Endpoints (Implemented)

- **POST/GET /assessment**, **GET /assessment/wellness-profile**, **GET /assessment/plan** — 10-Q assessment and 7-day plan.
- **GET/POST /progress**, **POST /progress/check-in** — Streak, completion, weekly check-in.
- **GET /exercises**, **GET /videos**, **GET /videos/:id** — Exercises and videos (videos support `?recommended=true` when auth).
- **GET /communities/:idOrSlug/feed/for-you** — Personalized feed (auth).
- **POST/DELETE /posts/:id/reaction**, **POST/DELETE /posts/:id/save**, **GET /profile/saved-posts** — Reactions and saved posts.
- **Post create** accepts `postType`, `tags`, `severityLevel`, `triggerWarnings`. **Chat** uses Ally when assessment exists; crisis detection for self-harm.

---

## Backward Compatibility

- **Legacy:** PUT /profile still writes to legacy questionnaire model. New flow uses **Assessment** only; chat uses Assessment when present, else falls back to legacy profile for Eva.
- **Communities/Posts:** New fields (postType, tags) optional; existing posts work with defaults.
