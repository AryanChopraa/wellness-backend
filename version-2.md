# Frontend changes — Version 2

This document lists **all changes for the frontend** in Version 2. Use it alongside `FRONTEND_INTEGRATION.md` for full request/response shapes and enums.

**Base URL:** Your API base. **Auth:** `Authorization: Bearer <token>` on protected routes.

---

## 1. First-time flow = Assessment only

- **No separate “onboarding” or old questionnaire.** New users do a single **assessment flow**.
- **When:** After signup/login, call **GET /assessment**. If `assessment` is `null`, show the assessment flow.
- **What to collect:** **username** (3–30 chars, a-z 0-9 _), **age** (min 18), **gender** (male | female | non-binary | prefer-not-to-say), plus the **10 assessment questions** (concerns, duration, severity, relationship, goals, support history, stress 1–10, primary fear, learning style, preferred time).
- **Submit:** **POST /assessment** with body `AssessmentSubmitBody` (username, age, gender + all 10 fields). Backend sets `hasOnboarded: true` and updates User (username, age).
- **Do not use** PUT /profile questionnaire for new users (deprecated).

---

## 2. Assessment request and response

**POST /assessment body** must include:

- `username` (string, required)
- `age` (number, required, min 18)
- `gender` (string: `'male' | 'female' | 'non-binary' | 'prefer-not-to-say'`)
- Plus all 10 assessment fields (see enums in FRONTEND_INTEGRATION.md).

**GET /assessment** and **POST /assessment** response:

- `assessment`: object or `null`. When present, includes `id`, `username`, `age`, `gender`, `concerns`, `urgencyScore`, `severityScore`, `relationshipStatus`, `goals`, `supportHistory`, `stressLevel`, `primaryFear`, `learningStyle`, `preferredTime`, `completedAt`.
- `wellnessProfile`: optional; includes `age`, `gender`, and all profile fields.

---

## 3. Home Feed / Dashboard (main screen)

- **One API for the home screen:** **GET /progress/dashboard** (auth).
- **Response:** `progress`, `wellnessProfile`, `recommendedContent` (videos/cards).
- **Use it to show:**
  - **Hero:** `progress.streak`, `progress.todayExercise` (title, duration, exerciseId, dayNumber), one primary CTA “Start”, progress bar (`completedCount` / `totalDaysInPlan`).
  - **Check-in:** When `progress.suggestCheckIn === true`, show a short check-in block. Submit with **POST /progress/check-in**; body can be empty or minimal (weekNumber optional — backend infers current week). Simple yes/no to advance.
  - **Focus & goals:** From `wellnessProfile.concerns` and `wellnessProfile.goals`.
  - **Content cards / reels:** From `recommendedContent` (id, title, description, duration, thumbnailUrl, **format**, playUrl, tags). Render as reel-style vertical cards; use **GET /videos?reels=true** for full reel feed.
  - **Member since:** `progress.memberSince` (ISO date).

---

## 4. Progress and check-in

- **GET /progress** now returns: `memberSince`, `currentWeekNumber`, `suggestCheckIn` (true when user should do a check-in this week).
- **POST /progress/check-in** — simple yes/no: body can be empty or minimal. **weekNumber is optional** (backend infers current week). Optional: `goalProximityPercent`, `feeling`, `whatHelped`, `noteForAlly`.
- **Check-in on dashboard:** Surface check-in in the home feed when `suggestCheckIn` is true; do not rely on a separate “check-in” page.

---

## 5. New and updated API routes

| Method | Path | Purpose |
|--------|------|--------|
| POST | `/assessment` | Submit demographics + 10 questions (first-time flow). |
| GET | `/assessment` | Get assessment + wellnessProfile; null if not done. |
| GET | `/assessment/wellness-profile` | Get wellness profile only. |
| GET | `/assessment/plan` | Get 7-day plan. |
| GET | `/progress/dashboard` | Home feed: progress + wellnessProfile + recommendedContent. |
| GET | `/progress` | Progress + memberSince, currentWeekNumber, suggestCheckIn. |
| POST | `/progress` | Record exercise completion (+ optional moodRating). |
| POST | `/progress/check-in` | Weekly check-in. |
| GET | `/exercises` | List exercises (query: tags, goalTags, severity, limit). |
| GET | `/videos` | List videos (asset-only). Query: `recommended=true`, **`reels=true`** (short-form only), `tags`, `limit`. |
| GET | `/videos/:id` | One video (includes `playUrl`, `format`, `durationSeconds`). |
| GET | `/communities/:idOrSlug/feed/for-you` | Personalized feed (auth). |
| POST | `/communities/:idOrSlug/posts` | Create post (body can include postType, tags, severityLevel, triggerWarnings). |
| POST / DELETE | `/posts/:id/reaction` | Set or remove reaction (type: relate | support | celebrate | helpful). |
| POST / DELETE | `/posts/:id/save` | Save or unsave post. |
| GET | `/profile/saved-posts` | List saved posts. |

---

## 6. Chat (Ally)

- When user has an assessment, chat uses **Ally** (wellness tone) and wellness profile.
- If response has **`crisisRedirect: true`**, show the assistant message and crisis resources; do not treat as a normal reply.

---

## 7. Community and posts

- **Post create:** Body can include `postType`, `tags`, `severityLevel`, `triggerWarnings`. List/detail responses include these fields.
- **Reactions:** Use type `relate` | `support` | `celebrate` | `helpful` (not just like).
- **Saved posts:** **GET /profile/saved-posts** for the current user’s saved list.

---

## 8. Videos (reels, asset-only)

- **Videos are asset-only.** All videos are stored as assets (e.g. GCS); backend returns a ready **`playUrl`** for playback. No YouTube/Vimeo/URL — use `playUrl` in a `<video>` or reel-style vertical player.
- **Reel feed:** Use **GET /videos?reels=true** to list only short-form reels (vertical, reel-style). Also: **GET /videos?recommended=true** when logged in for personalized reels.
- **Response fields:** Each video has `id`, `title`, `description`, `duration`, `durationSeconds`, `thumbnailUrl`, **`format`** (`reel` | `standard`), `assetId`, **`playUrl`**, `tags`, `viewCount`. Use `playUrl` for playback; use `format === 'reel'` to render in a reel-style UI.
- **Seed:** Run **npm run seed:wellness** (optionally with **--reset** to replace). Seed creates **~40 reel videos** (asset-only). Set **SEED_REEL_BASE_URL** if you use your own storage base URL.

---

## 9. Terminology

- **Assessment** = the only first-time flow (demographics + 10 questions). No “onboarding” flow.
- **Legacy questionnaire** = PUT /profile (old questionnaire). Do not use for new users.
- **hasOnboarded** = set to `true` after **POST /assessment** succeeds; use only to know “has completed assessment.”

---

## 10. Seeding

- Run **`npm run seed:wellness`** in the backend so **GET /assessment/plan**, dashboard, and **GET /videos** have data (exercises, videos, topic communities).
- Optional: set **SEED_USER_ID** to create sample posts.

For full TypeScript types, enums, and error handling, see **FRONTEND_INTEGRATION.md**.
