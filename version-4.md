# Frontend changes — Version 4 (simplified home: actionable content, no check-in)

This document replaces the **check-in, streak, and day-by-day progress** flow with a **single home screen** that shows **actionable insights** (exercises, breathing, reads) and **how to display each one**. Use **GET /progress/dashboard** as the main home API. Assumes Version 2 and 3 still apply where relevant.

**Base URL:** Your API base. **Auth:** `Authorization: Bearer <token>` on protected routes.

---

## 1. What was removed (do not use on frontend)

- **Check-in** — No weekly check-in. Do not show check-in UI or call **POST /progress/check-in** in the main flow.
- **Streak** — No streak counter. Do not display "X day streak" from progress.
- **Day plan / today’s exercise** — No "Day 1", "Day 2", or "today’s exercise". Do not use `plan`, `todayExercise`, `completedCount`, `totalDaysInPlan`, `currentWeekNumber`, `suggestCheckIn`, or `latestCheckIn`.

---

## 2. Home screen: one API

**GET /progress/dashboard** (auth required)

**Response:**

```ts
{
  wellnessProfile: {
    concerns: string[];   // focus areas, e.g. ["anxiety", "stress"]
    goals: string[];
    primaryFear: string | null;
  } | null;
  actionableContent: Array<{
    id: string;
    displayType: 'breathing' | 'exercise' | 'read';
    title: string;
    description: string;
    content: string | null;      // actual body/instructions (blog text, exercise steps)
    contentUrl: string | null;  // link to external article/audio/video if any
    durationMinutes: number;
    durationLabel: string;       // e.g. "5 min", "8 min"
    type: string;
  }>;
  recommendedContent: Array<{
    id: string;
    title: string;
    description: string;
    duration: string;
    thumbnailUrl: string;
    format: string;
    playUrl: string | null;      // use this URL to play the video (actual video content)
    tags: string[];
  }>;
}
```

Use this as the **only** home payload. No other progress or check-in calls are needed for the main experience.

---

## 2b. How the actual content is sent to the frontend

| Content type | Where it lives | What the API sends | How the frontend uses it |
|--------------|----------------|--------------------|---------------------------|
| **Exercise / blog / breathing (body text)** | Exercise `content` or `contentUrl` | In **actionableContent** (and **GET /exercises**): **`content`** (string or null) = inline body/instructions; **`contentUrl`** (string or null) = link to external page/audio. | **Read / blog:** If `content` is set → render it as the article body. If `contentUrl` is set → open in WebView or browser, or embed. If both null → show only title + description. **Exercise / breathing:** Use `content` as the instructions/steps to show when user taps Start; or use `contentUrl` for guided audio. |
| **Videos** | Asset URL stored on Video | In **recommendedContent**: **`playUrl`** = the actual playable video URL (e.g. GCS/CDN). | Use **`playUrl`** in `<video src={playUrl}>` or a reel player. That is the video content. |

So:

- **Exercises and reads:** The actual text/instructions are in **`content`**. If the backend stores a link instead, it’s in **`contentUrl`**. Both are in each **actionableContent** item and in **GET /exercises**.
- **Videos:** The actual video is at **`playUrl`** in each **recommendedContent** item. No separate “content” field — the URL is the content.

---

## 3. How to display each item (exact rules)

Backend sends **displayType** so the frontend knows exactly which UI to use.

### 3.1 `displayType === 'breathing'`

- **What it is:** A short breathing or calming exercise (e.g. 4-7-8 breathing, grounding).
- **How to show:**
  - **Card label:** Use **durationLabel** in the copy, e.g. **"5 min breathing"** or **"8 min breathing"**.
  - **Title:** Show `title` (e.g. "4-7-8 Breathing", "Grounding in the Moment").
  - **Subtitle/description:** Show `description`.
  - **Primary action:** One button, e.g. **"Start"** or **"Begin"** → open the breathing flow. Use **`content`** as the instructions/steps to show, or **`contentUrl`** if it points to guided audio. If both null, use a generic timer for `durationMinutes`.
- **Example:** Card with "8 min breathing", title "4-7-8 Breathing", short description, [Start] button.

### 3.2 `displayType === 'exercise'`

- **What it is:** An exercise to do (journaling, interactive, challenge, guided audio that isn’t “breathing”).
- **How to show:**
  - **Card label:** Show **durationLabel** + "exercise", e.g. **"5 min exercise"** or just the **title** and **durationLabel**.
  - **Title:** Show `title`.
  - **Description:** Show `description`.
  - **Primary action:** **"Start"** or **"Do it"** → open the exercise screen. Show **`content`** as the instructions/body (e.g. journal prompt, steps). If **`contentUrl`** is set, use it for audio or external resource. If both null, show title + description only.
- **Example:** Card with title "Name Your Fear", "5 min", description, [Start] button.

### 3.3 `displayType === 'read'`

- **What it is:** A short read / micro-lesson (blog-style).
- **How to show:**
  - **Card label:** **"Read"** or **durationLabel + " read"** (e.g. "5 min read").
  - **Title:** Show `title`.
  - **Description:** Show `description`.
  - **Primary action:** **"Read"** or **"Open"** → show the **actual content**: if **`content`** is set, render it as the article body (HTML or plain text); if **`contentUrl`** is set, open that URL in WebView or browser. If both are null, show only title + description.
- **Example:** Card with "Read", title "Week 1 Integration", description, [Read] → open screen that displays `content` or `contentUrl`.

---

## 4. Suggested home screen layout

1. **Focus (optional)**  
   - Use `wellnessProfile.concerns` and `wellnessProfile.goals` as small tags or one line, e.g. "Your focus: Anxiety, Stress".

2. **Actionable content (main list)**  
   - For each item in `actionableContent`:
     - If `displayType === 'breathing'` → render a **breathing card** (e.g. "X min breathing", title, description, [Start]).
     - If `displayType === 'exercise'` → render an **exercise card** (title, durationLabel, description, [Start]).
     - If `displayType === 'read'` → render a **read card** (title, description, [Read]).
   - Order: use the order of the array; no "day" or "step" number.

3. **Recommended videos (reels)**  
   - Use `recommendedContent` as a horizontal list or reel feed. The **actual video** is at **`playUrl`** — use it in `<video src={playUrl}>` or your reel player. No separate content field; the URL is the video.

No streak, no check-in block, no "today’s exercise" or day plan.

---

## 5. GET /exercises (optional)

For full exercise details (e.g. when user taps [Start]), use **GET /exercises**. Each exercise includes:

- `id`, `title`, `description`, **`content`**, **`contentUrl`**, `type`, **displayType**, **durationMinutes**, **durationLabel**, `tags`, `goalTags`, `phase`, `order`.

**`content`** = actual body/instructions to render. **`contentUrl`** = link to external article/audio. Use them the same way as in actionableContent (render `content` as body, or open `contentUrl`).

---

## 6. What to call from the frontend (summary)

| Purpose              | Call                         | Use |
|----------------------|------------------------------|-----|
| Home screen          | **GET /progress/dashboard**   | wellnessProfile, actionableContent, recommendedContent. Render each item by **displayType** as above. |
| Exercise list/detail | **GET /exercises** (optional)| Same displayType/durationLabel rules. |

Do **not** use for the main flow:

- GET /progress (old payload with streak/plan/check-in).
- POST /progress/check-in.
- Any UI that shows streak, "today’s exercise", or weekly check-in.

---

## 7. Backend changes in Version 4

- **GET /progress/dashboard** now returns only **wellnessProfile**, **actionableContent**, **recommendedContent**. No `progress`, streak, check-in, or day plan.
- **GET /progress** returns only **wellnessProfile** and **actionableContent** (no streak, no completed, no check-in).
- **Exercise model** has **displayType**: `'breathing' | 'exercise' | 'read'`. Backend sets this so the frontend can render the right card.
- Every actionable item includes **durationLabel** (e.g. "5 min", "8 min") so the frontend can show "5 min breathing" or "5 min read" without logic.

For full types and error handling, see **FRONTEND_INTEGRATION.md**.
