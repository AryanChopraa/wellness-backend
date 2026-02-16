# Frontend Integration Guide — Enhanced Wellness Workflow

This document describes all **data schemas**, **API routes**, **request/response shapes**, and **screen-level changes** needed to implement the enhanced wellness workflow on the frontend.

**Base URL:** Your API base (e.g. `https://api.example.com`).  
**Auth:** Send JWT in header: `Authorization: Bearer <token>` for protected routes.

---

## Table of contents

1. [Auth](#1-auth)
2. [Seeding (sample / mock data)](#2-seeding-sample--mock-data)
3. [Data schemas (TypeScript)](#3-data-schemas-typescript)
4. [API routes reference](#4-api-routes-reference)
5. [Screens and flows](#5-screens-and-flows)
6. [Enums and constants](#6-enums-and-constants)

---

## 1. Auth

- **Login/signup:** Unchanged (OTP flow; store JWT).
- **Protected routes:** Send `Authorization: Bearer <token>`.
- **401:** No/invalid token → redirect to login.
- **403:** User blocked or not found → show blocked message; response may include `isBlocked: true`.

---

## 2. Seeding (sample / mock data)

Some features **require seeded data** or they will return empty results:

| Data | Used by | Needed for |
|------|--------|------------|
| **Exercises** | `GET /assessment/plan`, `GET /exercises`, dashboard “Today’s exercise” | 7-day plan and exercise library must have documents with `tags`, `goalTags`, `severityLevels` matching assessment values. |
| **Videos** | `GET /videos`, `GET /videos?recommended=true` | Video library and “Recommended for you” need `Video` documents (can use `source: 'youtube'` + `externalId` for sample vlogs). |
| **Communities** | `GET /communities` (topic boards) | Seed creates topic-board communities (Performance & Confidence, Communication & Relationships, etc.). |

**Run the wellness seed (backend):**

```bash
cd backend
npm run seed:wellness
```

- Inserts **~18 sample exercises** (journaling, breathing, communication, body confidence, sexual health, grounding, etc.) and **~12 sample videos** (YouTube placeholders covering all primary fears and tags).
- Creates **topic-board communities** if missing: General, Performance & Confidence, Communication & Relationships, Body Image & Self-Love, Sexual Health Q&A, Wins & Progress, Managing Anxiety.
- Idempotent: if exercises/videos already exist, it skips insert unless you pass `--reset`.
- Options: `--skip-exercises`, `--skip-videos`, `--skip-communities`, `--reset` (deletes existing exercises/videos before inserting; communities and posts are never deleted).

**Optional sample posts:** Set env `SEED_USER_ID` to a valid user MongoDB ObjectId. The seed will create a few sample posts in the "general" community so the feed has content.

**Optional:** Replace the placeholder YouTube `externalId` values in the seed script with real wellness vlog IDs, or add more exercises/videos via an admin flow.

---

## 3. Data schemas (TypeScript)

Use these types for request bodies and response parsing.

### 3.1 Assessment (10-question wellness questionnaire)

**POST body — submit assessment**

```ts
interface AssessmentSubmitBody {
  concerns: string[];           // 1–3 items; see CONCERN_TAGS
  duration: string;             // 'recently' | 'few_months' | 'over_a_year' | 'years'
  severity: string;             // 'occasionally' | 'think_regularly' | 'affecting_confidence' | 'impacting_relationships' | 'avoiding_situations'
  relationshipStatus: string;   // 'yes_they_know' | 'yes_havent_shared' | 'no_single' | 'complicated'
  goals: string[];              // 1–3 items; see GOAL_TAGS
  supportHistory: string;       // 'yes_therapist' | 'yes_friends_family' | 'no_first_time' | 'tried_not_helpful'
  stressLevel: number;          // 1–10
  primaryFear: string;          // 'never_get_better' | 'broken_abnormal' | 'partner_will_leave' | 'never_confident' | 'alone_in_this' | 'all_in_my_head'
  learningStyle: string;        // 'videos' | 'reading' | 'interactive' | 'talking' | 'mix'
  preferredTime: string;        // 'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'varies'
}
```

**Response — GET /assessment, POST /assessment**

```ts
interface AssessmentResponse {
  assessment: {
    id: string;
    concerns: string[];
    urgencyScore: number;       // 1–4
    severityScore: number;      // 1–5
    relationshipStatus: string;
    goals: string[];
    supportHistory: string;
    stressLevel: number;
    primaryFear: string;
    learningStyle: string;
    preferredTime: string;
    completedAt: string;        // ISO date
  } | null;
  wellnessProfile?: WellnessProfile;
}

interface WellnessProfile {
  concerns: string[];
  urgencyScore: number;
  severityScore: number;
  relationshipStatus: string;
  goals: string[];
  supportHistory: string;
  stressLevel: number;
  primaryFear: string;
  learningStyle: string;
  preferredTime: string;
}
```

### 3.2 Plan (7-day journey)

**GET /assessment/plan response**

```ts
interface PlanDay {
  dayNumber: number;      // 1–7
  exerciseId: string;
  title: string;
  durationMinutes: number;
}

interface PlanResponse {
  plan: PlanDay[];
}
```

### 3.3 Exercises

**GET /exercises response**

```ts
interface ExerciseItem {
  id: string;
  title: string;
  description: string;
  type: 'journaling' | 'guided_audio' | 'interactive' | 'micro_lesson' | 'challenge';
  durationMinutes: number;
  tags: string[];
  goalTags: string[];
  phase: number;
  order: number;
}

interface ExercisesResponse {
  exercises: ExerciseItem[];
}
```

### 3.4 Progress

**GET /progress response**

```ts
interface ProgressResponse {
  streak: number;
  completedCount: number;
  completed: Array<{
    dayNumber: number;
    exerciseId: string;
    moodRating: number | null;
    completedAt: string | null;
  }>;
  plan: PlanDay[];
  todayExercise: PlanDay | null;   // next exercise to do
  totalDaysInPlan: number;
  memberSince: string | null;      // ISO date; for "Member since X"
  currentWeekNumber: number;       // use for POST /progress/check-in weekNumber
  suggestCheckIn: boolean;        // true = show check-in on dashboard this week
  latestCheckIn: {
    weekNumber: number;
    goalProximityPercent: number | null;
    feeling: string | null;
    whatHelped: string[];
    createdAt: string;
  } | null;
}
```

**GET /progress/dashboard response (home feed)**

```ts
interface DashboardResponse {
  progress: {
    streak: number;
    completedCount: number;
    totalDaysInPlan: number;
    todayExercise: PlanDay | null;
    plan: PlanDay[];
    memberSince: string | null;
    currentWeekNumber: number;
    suggestCheckIn: boolean;
    latestCheckIn: { weekNumber: number; goalProximityPercent: number | null; feeling: string | null; whatHelped: string[]; createdAt: string } | null;
  };
  wellnessProfile: {
    concerns: string[];
    goals: string[];
    learningStyle: string;
    primaryFear: string;
  } | null;
  recommendedContent: Array<{
    id: string;
    title: string;
    description: string;
    duration: string;
    thumbnailUrl: string;
    source: string;
    playUrl: string | null;
    tags: string[];
  }>;
}
```

**POST /progress body — record completion**

```ts
interface ProgressSubmitBody {
  exerciseId: string;
  dayNumber: number;      // 1–30
  moodRating?: number;    // 1–5, optional
}
```

**POST /progress/check-in body**

```ts
interface CheckInSubmitBody {
  weekNumber: number;           // 1–52, required
  goalProximityPercent?: number; // 0–100
  feeling?: 'much_better' | 'somewhat_better' | 'same' | 'struggling_more';
  whatHelped?: string[];       // ['daily_exercises','chatbot','community','videos','having_plan']
  noteForAlly?: string;        // max 1000 chars
}
```

### 3.5 Videos

**GET /videos and GET /videos/:id — video item**

```ts
type VideoSource = 'youtube' | 'vimeo' | 'url' | 'asset';

interface VideoItem {
  id: string;
  title: string;
  description: string;
  duration: string;           // e.g. "8:32"
  thumbnailUrl: string;
  source: VideoSource;
  externalId: string | null;  // YouTube/Vimeo video ID when source is youtube/vimeo
  videoUrl: string | null;     // direct URL when source is url
  assetId: string | null;     // when source is asset
  playUrl: string | null;      // ready-to-use URL for embed/play (use this for playback)
  tags: string[];
  viewCount: number;
}
```

- **Playback:** Prefer `playUrl` for iframe or `<video src>`. For YouTube/Vimeo you can also build embed from `source` + `externalId` if needed.

### 3.6 Posts (community)

**Create post body — POST /communities/:idOrSlug/posts**

```ts
interface CreatePostBody {
  title: string;
  content: string;
  postType?: 'question' | 'story' | 'progress_update' | 'resource_share' | 'seeking_support'; // default 'story'
  tags?: string[];        // concern tags for "For You"; max 10
  severityLevel?: number; // 1–5, optional
  triggerWarnings?: string[]; // optional; max 5
}
```

**Post object in list/detail (includes existing + new fields)**

```ts
interface PostItem {
  id: string;
  communityId: string;
  authorId: string;
  author: { id: string; username: string; avatarUrl: string | null } | null;
  title: string;
  content: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  postType: string;           // 'question' | 'story' | ...
  tags: string[];
  severityLevel: number | null;
  triggerWarnings: string[];
  createdAt: string;
  updatedAt: string;
}
```

### 3.7 Reactions and saved posts

**POST /posts/:id/reaction body**

```ts
interface ReactionBody {
  type: 'relate' | 'support' | 'celebrate' | 'helpful';
}
```

**GET /profile/saved-posts response**

```ts
interface SavedPostItem {
  id: string;
  title: string;
  content: string;
  postType: string;
  likeCount: number;
  commentCount: number;
  savedAt: string;
}

interface SavedPostsResponse {
  savedPosts: SavedPostItem[];
}
```

### 3.8 Chat

**POST /chat/conversations/:id/messages body**

```ts
interface SendMessageBody {
  content: string;
}
```

**Response (normal)**

```ts
interface SendMessageResponse {
  userMessage: { id: string; role: 'user'; content: string; createdAt: string };
  assistantMessage: { id: string; role: 'assistant'; content: string; createdAt: string };
  rateLimitReached: false;
  conversationTitle?: string;  // on first exchange
}
```

**Response (crisis detection)**

When the backend detects crisis-related content it does **not** call the AI and returns:

```ts
interface CrisisResponse {
  userMessage: { id: string; role: 'user'; content: string; createdAt: string };
  assistantMessage: { id: string; role: 'assistant'; content: string; createdAt: string };
  rateLimitReached: false;
  crisisRedirect: true;   // show crisis message; consider showing crisis resources UI
}
```

---

## 4. API routes reference

### 4.1 Assessment

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/assessment` | Yes | Submit 10-question assessment. Body: `AssessmentSubmitBody`. Returns assessment + wellnessProfile. |
| GET | `/assessment` | Yes | Get current user's assessment + wellnessProfile. `assessment` null if not done. |
| GET | `/assessment/wellness-profile` | Yes | Get computed wellness profile only. 404 if no assessment. |
| GET | `/assessment/plan` | Yes | Get personalized 7-day plan. 404 if no assessment. |

### 4.2 Exercises

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/exercises` | No | List exercises. Query: `tags` (comma), `goalTags` (comma), `severity` (1–5), `limit`. |

### 4.3 Progress

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/progress` | Yes | Streak, completed days, plan, today's exercise, latest check-in. |
| POST | `/progress` | Yes | Record exercise completion. Body: `exerciseId`, `dayNumber`, optional `moodRating` (1–5). |
| POST | `/progress/check-in` | Yes | Weekly check-in. Body: `CheckInSubmitBody`. |

### 4.4 Videos

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/videos` | Optional | List videos. Query: `recommended=true` (personalized when logged in), `tags` (comma), `limit`. |
| GET | `/videos/:id` | No | Single video by id. |

### 4.5 Communities and posts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/communities` | No | List communities (unchanged). |
| GET | `/communities/:idOrSlug` | No | One community (unchanged). |
| GET | `/communities/:idOrSlug/posts` | No | Posts. Query: `filter`, `page`, `limit` (unchanged). Response now includes `postType`, `tags`, `severityLevel`, `triggerWarnings`. |
| GET | `/communities/:idOrSlug/feed/for-you` | Yes | **New.** Personalized feed by user's assessment tags. Query: `page`, `limit`. |
| POST | `/communities/:idOrSlug/posts` | Yes | Create post. Body now accepts `postType`, `tags`, `severityLevel`, `triggerWarnings`. |

### 4.6 Posts — reactions and save

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/posts/:id/reaction` | Yes | Set reaction. Body: `{ type: 'relate'|'support'|'celebrate'|'helpful' }`. |
| DELETE | `/posts/:id/reaction` | Yes | Remove your reaction. |
| POST | `/posts/:id/save` | Yes | Save post. |
| DELETE | `/posts/:id/save` | Yes | Unsave post. |

### 4.7 Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/profile` | Yes | User + onboarding (unchanged). |
| PATCH | `/profile` | Yes | Update username, age, avatarUrl (unchanged). |
| PUT | `/profile` | Yes | Full onboarding questionnaire (legacy; use Assessment for new flow). |
| GET | `/profile/saved-posts` | Yes | **New.** List saved posts. |

### 4.8 Chat

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/chat/conversations` | Yes | Create conversation (unchanged). |
| GET | `/chat/conversations` | Yes | List conversations (unchanged). |
| GET | `/chat/conversations/:id` | Yes | Conversation + messages (unchanged). |
| POST | `/chat/conversations/:id/messages` | Yes | Send message. Response may include `crisisRedirect: true`. |

---

## 5. Screens and flows

### 5.1 Replace initial questionnaire with Assessment

**The first-time onboarding is the 10-question wellness assessment, not the old profile questionnaire.**

- **New users:** After signup/login, if the user has **not** completed the assessment, show the **10-question assessment** flow (see [Enums](#6-enums-and-constants)). Do **not** show the old profile questionnaire (PUT /profile with gender, mainInterests, sexualExperience, etc.) as the main onboarding.
- **Submit:** **POST /assessment** with `AssessmentSubmitBody`. The backend sets `hasOnboarded: true`. Use the response `wellnessProfile` for the results screen.
- **Check if onboarded:** **GET /assessment** — if `assessment` is null, user has not completed onboarding; show the assessment flow. If present, user can go to the home feed.
- **Legacy:** PUT /profile (old questionnaire) remains for backward compatibility; new flows should use Assessment only.

**Assessment flow steps:**

1. **Screen: 10-question assessment** — Collect all 10 answers (concerns, duration, severity, relationship, goals, support history, stress 1–10, primary fear, learning style, preferred time). Submit **POST /assessment**.
2. **Screen: Processing / loading** — Short wait (e.g. 5–8 s). Use `wellnessProfile` from POST response or **GET /assessment/wellness-profile**.
3. **Screen: Results / “Your Wellness Profile”** — Show concerns, goals, “Good news” copy, 7-day plan preview. **GET /assessment/plan** for Day 1–7. CTA: “Start Day 1” → go to **Home Feed**.

### 5.2 Home Feed / Dashboard (main screen)

**One screen that gives users everything: progress, streak, today’s exercise, check-in, focus areas, goals, and content cards.** Like a typical wellness/productivity app — they open the app and see what to do next without hunting.

**Single API for the home feed:** **GET /progress/dashboard** (auth required). It returns:

- **progress** — streak, completedCount, totalDaysInPlan, **todayExercise** (today’s practice: day number, exerciseId, title, durationMinutes), plan (first 7 days), memberSince, **currentWeekNumber**, **suggestCheckIn**, latestCheckIn
- **wellnessProfile** — concerns (focus areas), goals, learningStyle, primaryFear (for personalization)
- **recommendedContent** — up to 8 videos/content cards (id, title, description, duration, thumbnailUrl, source, playUrl, tags) for “blogs/articles” style cards

**Layout (suggested):**

1. **Hero / Today’s practice**  
   - Streak (e.g. “7 day streak” with icon).  
   - “Today’s practice: Day X — [title]” + duration.  
   - One clear **primary CTA: “Start”** or “Do now” → open today’s exercise (use `todayExercise.exerciseId` and plan or GET /exercises for content).  
   - Progress bar: completedCount / totalDaysInPlan.

2. **Quick check-in (do it for them)**  
   - **Do not** rely on users going to a separate “check-in” page. Show check-in **on the dashboard** when `progress.suggestCheckIn === true` (backend tells you they haven’t checked in this week).  
   - Card or inline block: “How’s your week? 2 min check-in” with:  
     - Feeling: much_better | somewhat_better | same | struggling_more  
     - Optional: goal proximity slider (0–100%).  
     - Optional: what helped (multi-select).  
   - On submit: **POST /progress/check-in** with `weekNumber: progress.currentWeekNumber`, plus feeling, goalProximityPercent, whatHelped.  
   - Use `progress.currentWeekNumber` so you don’t ask the user for “week number” — the app does it for them.

3. **Focus & goals**  
   - From `wellnessProfile.concerns` → show as “Your focus” tags or small cards.  
   - From `wellnessProfile.goals` → show as “Your goals” (e.g. 1–3 goal labels).

4. **Content cards (blogs / articles / videos)**  
   - Use `recommendedContent` from the same dashboard response.  
   - Render as **multiple cards** (image, title, description, duration, “Watch” or “Read”).  
   - Use `playUrl` for playback or link to video detail.  
   - This replaces a separate “blogs and articles” feed on the home — one feed, multiple cards.

5. **Member since**  
   - `progress.memberSince` (ISO date) — e.g. “Member since Jan 2026”.

**After user completes today’s exercise:**  
- **POST /progress** with `exerciseId`, `dayNumber`, and optional `moodRating` (1–5).  
- Refresh dashboard (GET /progress/dashboard or GET /progress) and show “Day X complete” and tomorrow’s exercise.

**Summary:** One home feed API (**GET /progress/dashboard**), one screen: streak, today’s exercise (with one tap to start), in-dashboard check-in when suggested, focus/goals, and content cards. Check-in and exercises are “done for them” by surfacing them on the dashboard.

### 5.3 Video library

- **List:**  
  - **GET /videos?recommended=true** when logged in; otherwise **GET /videos**.  
  - Render each item using `playUrl` for embed/play (or `thumbnailUrl` + navigate to detail).

- **Detail:**  
  - **GET /videos/:id** → use `playUrl` for player; show title, description, duration, tags.

### 5.4 Community

- **Tabs / feeds:**  
  - “For You”: **GET /communities/:idOrSlug/feed/for-you** (auth required).  
  - “All”: **GET /communities/:idOrSlug/posts** (existing).

- **Create post:**  
  - **POST /communities/:idOrSlug/posts** with `title`, `content`, and optionally `postType`, `tags`, `severityLevel`, `triggerWarnings`.

- **Post UI:**  
  - Show `postType` (icon/label).  
  - Reactions: buttons for relate / support / celebrate / helpful; **POST /posts/:id/reaction** with `type`; **DELETE /posts/:id/reaction** to remove.  
  - Save: **POST /posts/:id/save** and **DELETE /posts/:id/save**; show “Saved” state.

- **Saved posts:**  
  - **GET /profile/saved-posts** and render list (e.g. under Profile or a “Saved” tab).

### 5.5 Chat (Ally)

- Backend uses **Ally** (wellness tone) when user has an assessment; otherwise existing persona.  
  - No frontend change required for persona.

- **Crisis:**  
  - If response has `crisisRedirect: true`, show the assistant message and consider a persistent crisis resources block (e.g. hotline number).

### 5.6 Progress / My Progress

- **GET /progress** → show:  
  - Current streak.  
  - Completed count and list.  
  - “Confidence over time” (e.g. from `moodRating` over time if you store it client-side or add an endpoint later).  
  - Goal progress from `latestCheckIn.goalProximityPercent`.

- **Weekly check-in modal/page:**  
  - **POST /progress/check-in** with `weekNumber`, optional `goalProximityPercent`, `feeling`, `whatHelped`, `noteForAlly`.  
  - Trigger when `weekNumber` advances (e.g. every 7 days from signup or first exercise).

### 5.7 Profile

- **Saved posts:**  
  - Link/button to “Saved posts” → **GET /profile/saved-posts** and display `savedPosts`.

---

## 6. Enums and constants

Use these values in forms and when calling APIs.

### Assessment — concerns (Q1, 1–3)

```
'performance', 'anxiety', 'communication', 'relationships', 'body_image', 'confidence',
'sexual_health', 'education', 'loneliness', 'social_wellness', 'stress', 'mental_health', 'exploring'
```

### Duration (Q2)

```
'recently' | 'few_months' | 'over_a_year' | 'years'
```

### Severity (Q3)

```
'occasionally' | 'think_regularly' | 'affecting_confidence' | 'impacting_relationships' | 'avoiding_situations'
```

### Relationship status (Q4)

```
'yes_they_know' | 'yes_havent_shared' | 'no_single' | 'complicated'
```

### Goals (Q5, 1–3)

```
'confident_intimate', 'better_communication', 'body_confidence', 'less_anxiety',
'enjoying_without_overthinking', 'feeling_normal', 'healthy_habits'
```

### Support history (Q6)

```
'yes_therapist' | 'yes_friends_family' | 'no_first_time' | 'tried_not_helpful'
```

### Primary fear (Q8)

```
'never_get_better', 'broken_abnormal', 'partner_will_leave', 'never_confident', 'alone_in_this', 'all_in_my_head'
```

### Learning style (Q9)

```
'videos' | 'reading' | 'interactive' | 'talking' | 'mix'
```

### Preferred time (Q10)

```
'morning' | 'midday' | 'afternoon' | 'evening' | 'night' | 'varies'
```

### Post type

```
'question' | 'story' | 'progress_update' | 'resource_share' | 'seeking_support'
```

### Reaction type

```
'relate' | 'support' | 'celebrate' | 'helpful'
```

### Check-in feeling

```
'much_better' | 'somewhat_better' | 'same' | 'struggling_more'
```

### Check-in whatHelped

```
'daily_exercises' | 'chatbot' | 'community' | 'videos' | 'having_plan'
```

### Video source

```
'youtube' | 'vimeo' | 'url' | 'asset'
```

---

## Error responses

- **400:** Validation error; body has `{ error: string }`.  
- **401:** Missing or invalid token.  
- **403:** User blocked or not found; may include `isBlocked: true`.  
- **404:** Resource not found; `{ error: string }`.  
- **429:** Rate limit (e.g. chat); response may include `rateLimitReached: true`.

Use the schemas and routes above for all frontend integration with the enhanced workflow.
