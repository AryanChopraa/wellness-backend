# Wellness Platform — Frontend API & Integration Guide

This document describes all API endpoints, auth flow, and initial onboarding for the frontend. Use it to implement login/signup (OTP), token handling, and the onboarding questionnaire.

---

## Base URL & Headers

- **Base URL:** `http://localhost:4000` (dev) or your deployed API URL.
- **JSON:** All request bodies are `Content-Type: application/json`. All responses are JSON.
- **Auth:** For protected routes, send: `Authorization: Bearer <token>`.

---

## Standard response structure (every request)

**Every API response** (success or error) includes these three fields so the frontend can show a message and handle blocked users:

```ts
// Top-level fields on every response
{
  success: boolean;   // true if request succeeded, false otherwise
  message: string;   // Description for the frontend — show in UI / toast
  isBlocked: boolean; // If the current user is blocked; when true, frontend must block access (e.g. logout, show "Account blocked")
}
```

Plus endpoint-specific payload (e.g. `user`, `token`, `posts`, `error`). For errors, `error` is also present and equals the user-facing message (same as `message`).

**Examples:**
- Success: `{ "success": true, "message": "Logged in successfully", "isBlocked": false, "token": "...", "user": { ... } }`
- Error: `{ "success": false, "message": "Valid email is required", "isBlocked": false, "error": "Valid email is required" }`
- Blocked user: `{ "success": false, "message": "Account is blocked", "isBlocked": true, "error": "Account is blocked" }`

**Frontend:**
1. Parse JSON on every response.
2. Show `body.message` (or `body.error` for errors) to the user — do not hardcode strings; use what the backend returns.
3. If `body.isBlocked === true`, clear token and block the user (e.g. redirect to a “Account blocked” screen).

---

## 1. Auth Overview

- **No passwords.** Auth is OTP-only: user enters **email** OR **phone** → backend sends OTP → user enters OTP → backend returns **JWT**.
- **Signup and signin use the same flow:** same endpoints; if the user doesn’t exist, an account is created.
- **Token:** After OTP verification you receive a `token`. Store it (e.g. secure storage / cookie) and send it on every request to protected routes.
- **OTP is single-use:** The backend marks the OTP as used (it is not deleted) after successful verification so the same code cannot be used again. OTPs are kept in the collection for rate-limit tracking.
- **OTP limit per email/phone:** A given email or phone number can request at most **5 OTPs in 2 hours**. After that, the API returns **429** with a message asking to try again after 2 hours. Frontend should show the returned `message` or `error`.

---

## 2. API Reference

### 2.1 Health

| Method | Path       | Auth | Description   |
|--------|------------|------|---------------|
| GET    | `/health`  | No   | Health check. |

**Response (200):**
```json
{ "success": true, "message": "OK", "isBlocked": false, "status": "ok", "timestamp": "2025-02-07T12:00:00.000Z" }
```

---

### 2.2 Auth — Request OTP (Signup / Signin)

Use one of these; they behave the same (send OTP to email or phone). Provide **either** `email` **or** `phone`, not both.

| Method | Path              | Auth | Rate limit      |
|--------|-------------------|------|-----------------|
| POST   | `/auth/signup`    | No   | 5 per 15 min/IP |
| POST   | `/auth/signin`    | No   | 5 per 15 min/IP |
| POST   | `/auth/otp/send`  | No   | 5 per 15 min/IP |

**Request body (email):**
```json
{ "email": "user@example.com" }
```

**Request body (phone):**
```json
{ "phone": "+1234567890" }
```
Phone: at least 10 digits; non-digits are stripped. E.164 or digits-only both work.

**Success (200 or 201):**
```json
{
  "message": "OTP sent",
  "expiresAt": "2025-02-07T12:10:00.000Z"
}
```
- **201** = new account created. **200** = existing user; OTP sent.

**Errors:**
- **400** — `{ "error": "Provide either email or phone, not both" }`
- **400** — `{ "error": "Valid email is required" }` or `"Valid phone number is required (at least 10 digits)"`
- **403** — `{ "error": "Account is blocked" }`
- **429** — `{ "error": "Too many OTP requests. Please try again later." }` (IP rate limit)
- **429** — `{ "error": "Too many OTP requests for this email. For your security, please try again after 2 hours." }` (same for phone; per-email/phone limit: 5 in 2 hours)

---

### 2.3 Auth — Verify OTP (Login)

| Method | Path              | Auth | Rate limit       |
|--------|-------------------|------|------------------|
| POST   | `/auth/otp/verify` | No   | 10 per 15 min/IP |

**Request body (email):**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Request body (phone):**
```json
{
  "phone": "+1234567890",
  "code": "123456"
}
```
- Provide **exactly one** of `email` or `phone`, and `code` (string, min 4 chars, typically 6 digits).

**Success (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "phone": null,
    "username": "jane_doe",
    "avatarUrl": null,
    "hasOnboarded": false,
    "preferences": { "anonymousInCommunity": false, "notifications": true }
  }
}
```
- **Store `token`** and use it for all protected routes.
- **`user.hasOnboarded`** — `false` = first-time user → show onboarding; `true` = returning user → go to app.

**Errors:**
- **400** — `{ "error": "Provide exactly one of email or phone" }` or `"Valid OTP code is required"`
- **401** — `{ "error": "Invalid or expired OTP" }` or `"User not found"`
- **403** — `{ "error": "Account is blocked" }`
- **429** — `{ "error": "Too many verification attempts. Please try again later." }`

---

### 2.4 Auth — Current User (Protected)

| Method | Path        | Auth        |
|--------|-------------|-------------|
| GET    | `/auth/me`  | Bearer token|

**Headers:** `Authorization: Bearer <token>`

**Success (200):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "phone": null,
    "username": "jane_doe",
    "avatarUrl": null,
    "hasOnboarded": true,
    "preferences": { "anonymousInCommunity": false, "notifications": true }
  }
}
```

**Errors:**
- **401** — `{ "error": "Missing or invalid authorization" }` or `"Invalid or expired token"` or `"User not found"`
- **403** — `{ "error": "Account is blocked" }`

---

### 2.5 Auth — Dev OTP (Development Only)

Only when backend is **not** in production. Use to get the current OTP for testing (e.g. email or phone).

| Method | Path                      | Auth |
|--------|---------------------------|------|
| GET    | `/auth/otp/dev/:identifier` | No   |

**Example:** `GET /auth/otp/dev/user@example.com` or `GET /auth/otp/dev/1234567890`

**Success (200):**
```json
{ "code": "123456" }
```

**Errors:** 400 (bad identifier), 404 (no OTP or production).

---

### 2.6 Profile — Get (Protected)

Returns current user and their onboarding answers (if any). Use for the profile page and to prefill onboarding. **Profile page** should display and allow editing only: `username`, `age`, `avatarUrl` (display picture; for future use).

| Method | Path        | Auth        |
|--------|-------------|-------------|
| GET    | `/profile`  | Bearer token |

**Success (200):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "phone": null,
    "username": "jane_doe",
    "avatarUrl": null,
    "age": 25,
    "hasOnboarded": true,
    "preferences": { "anonymousInCommunity": false, "notifications": true }
  },
  "onboarding": {
    "age": 25,
    "gender": "female",
    "relationshipStatus": "dating",
    "mainInterests": ["relationship-advice", "general-education"],
    "sexualExperience": "some-experience",
    "whyImprove": "...",
    "primaryConcern": "...",
    "intimacyGoals": "...",
    "currentChallenges": "...",
    "whatBroughtYouHere": "...",
    "hopesFromPlatform": "...",
    "anythingElseWeShouldKnow": "..."
  }
}
```
- If the user has never submitted the questionnaire, `onboarding` is `null`.

**Errors:** 401 / 403 same as other protected routes.

---

### 2.7 Profile — Update (Edit profile page) (Protected)

Update only the fields shown on the **profile edit page**: username, age, and display picture (`avatarUrl`). All fields are optional; send only the ones you want to change.

| Method | Path        | Auth        |
|--------|-------------|-------------|
| PATCH  | `/profile`  | Bearer token|

**Request body (all optional):**

| Field       | Type   | Notes |
|-------------|--------|--------|
| `username`  | string | 3–30 chars, only `a-z`, `0-9`, `_`; unique; stored lowercase |
| `age`       | number | Must be ≥ 18 |
| `avatarUrl` | string | URL for display picture (for future use); empty string clears it |

**Example:** `PATCH /profile` with `{ "age": 26 }` updates only age.

**Success (200):** `{ "user": { id, email, phone, username, avatarUrl, age, hasOnboarded, preferences } }`.

**Errors:**
- **400** — Validation (e.g. username taken, age &lt; 18) or no fields provided.
- **401** / **403** — Unauthorized or blocked.

---

### 2.8 Profile — Onboarding questionnaire (Protected, MCQ-only)

Submit or update the onboarding questionnaire (first-time or replace). All fields are **MCQ only** (no free-text). Optionally add the other contact (email/phone) if the user signed up with only one. Sets `hasOnboarded: true` after success.

| Method | Path       | Auth        |
|--------|------------|-------------|
| PUT    | `/profile` | Bearer token|

**Request body:** Required fields below; optional fields are for chat personalization (all have `prefer-not-to-say` to skip).

| Field                     | Type     | Required | Notes |
|---------------------------|----------|----------|--------|
| `username`                | string   | Yes      | 3–30 chars, only `a-z`, `0-9`, `_` (unique; stored lowercase) |
| `age`                     | number   | Yes      | Must be ≥ 18 |
| `gender`                  | string   | Yes      | `male` \| `female` \| `non-binary` \| `prefer-not-to-say` |
| `relationshipStatus`      | string   | Yes      | `single` \| `dating` \| `married` \| `complicated` |
| `mainInterests`           | string[] | Yes      | At least one: `relationship-advice`, `intimacy-techniques`, `product-knowledge`, `general-education` |
| `sexualExperience`        | string   | Yes      | `virgin` \| `some-experience` \| `experienced` \| `prefer-not-to-say` |
| `physicalActivityLevel`   | string   | No       | `sedentary` \| `light` \| `moderate` \| `active` \| `prefer-not-to-say` |
| `selfRatedInBed`          | string   | No       | `beginner` \| `somewhat-confident` \| `confident` \| `prefer-not-to-say` |
| `whatToImproveChat`       | string   | No       | `stamina` \| `technique` \| `communication` \| `confidence` \| `exploration` \| `prefer-not-to-say` |
| `intimacyComfortLevel`    | string   | No       | `shy` \| `getting-comfortable` \| `comfortable` \| `very-open` \| `prefer-not-to-say` |
| `email`                   | string   | No       | Only used if user has no email (e.g. signed up with phone) |
| `phone`                   | string   | No       | Only used if user has no phone (e.g. signed up with email) |

**Example:**
```json
{
  "username": "jane_doe",
  "age": 25,
  "gender": "female",
  "relationshipStatus": "dating",
  "mainInterests": ["relationship-advice", "general-education"],
  "sexualExperience": "some-experience",
  "physicalActivityLevel": "moderate",
  "selfRatedInBed": "somewhat-confident",
  "whatToImproveChat": "confidence",
  "intimacyComfortLevel": "comfortable",
  "phone": "+1234567890"
}
```

**Success (200):**
Same shape as GET `/profile`: `{ "user": { ... }, "onboarding": { ... } }`. `user.hasOnboarded` will be `true`.

**Errors:**
- **400** — Validation (e.g. `"Age is required and must be at least 18"`, invalid enum, invalid email/phone).
- **401** / **403** — Unauthorized or blocked.

**GET /profile** returns `onboarding` with the same MCQ fields (no free-text fields).

---

## 3. Rate Limits

- **`/auth/*` (general):** 100 requests per 15 minutes per IP.
- **OTP send** (signup, signin, otp/send): **5** per 15 min per IP.
- **OTP verify:** **10** per 15 min per IP.

On limit exceeded you get **429** and a JSON `error` message. Response may include `RateLimit-*` headers.

---

## 4. Frontend Auth Flow

1. **Entry:** User enters email **or** phone.
2. **Request OTP:**  
   `POST /auth/signup` or `POST /auth/signin` or `POST /auth/otp/send` with `{ email }` or `{ phone }`.  
   Show “OTP sent” and the `expiresAt` if you want a countdown.
3. **Enter OTP:** User types the code.
4. **Verify:**  
   `POST /auth/otp/verify` with `{ email | phone, code }`.  
   On success, store `token` and `user`.
5. **Next step:**  
   - If `user.hasOnboarded === false` → redirect to **onboarding** (questionnaire).  
   - If `user.hasOnboarded === true` → go to main app (e.g. home).

---

## 5. Initial Onboarding Flow

1. **After first login:** You have `token` and `user.hasOnboarded === false`.
2. **Show questionnaire:** Single or multi-step form with required MCQ fields (see PUT `/profile` table). Optional: additional MCQs and email or phone if the user only had one.
3. **Submit:**  
   `PUT /profile` with `Authorization: Bearer <token>` and the full body.
4. **On success:** Update local state with returned `user` (now `hasOnboarded: true`) and optional `onboarding`. Redirect to main app.
5. **Prefill (e.g. “Edit profile”):**  
   `GET /profile` and use `onboarding` to prefill the form. Submit again with `PUT /profile` to update.

---

## 6. Token Usage

- **Storage:** Store the JWT securely (e.g. httpOnly cookie or secure storage). Do not put it in localStorage if you care about XSS.
- **Sending:** For every request to a protected route (`/auth/me`, `/profile`):  
  `Authorization: Bearer <token>`.
- **Expiry:** Token has a server-side expiry (e.g. 7 days). On **401** from a protected route, clear token and redirect to login.
- **Blocked:** On **403** “Account is blocked”, clear token and show a blocked message.

---

## 7. Error Response Shape

All error responses use a single message when possible:

```json
{ "error": "Human-readable message" }
```

Use `error` for toasts or inline validation. Use HTTP status for flow (e.g. 401 → logout, 403 → blocked, 429 → “Try again later”).

---

## 8. Community & Posts (Reddit-style)

There is one default community (`slug: "general"`). Users can post, comment, like, and share. Schema supports multiple communities later.

### 8.1 List communities

| Method | Path            | Auth |
|--------|-----------------|------|
| GET    | `/communities`  | No   |

**Response (200):**
```json
{
  "communities": [
    { "id": "...", "name": "General", "slug": "general", "description": "..." }
  ]
}
```

### 8.2 Get one community

| Method | Path                  | Auth |
|--------|-----------------------|------|
| GET    | `/communities/:idOrSlug` | No   |

`:idOrSlug` = community ID or slug (e.g. `general`).

### 8.3 List posts (with filters & pagination)

| Method | Path                            | Auth |
|--------|----------------------------------|------|
| GET    | `/communities/:idOrSlug/posts`   | No   |

**Query:**

| Param   | Type   | Default    | Description |
|---------|--------|------------|-------------|
| `filter`| string | `trending` | One of: `trending`, `hot`, `newest`, `most_liked`, `most_commented` |
| `page`  | number | 1          | Page number |
| `limit` | number | 20         | Items per page (max 50) |

**Scoring formulas:**

- **newest** — Sort by `createdAt` descending.
- **most_liked** — Sort by `likeCount` descending.
- **most_commented** — Sort by `commentCount` descending.
- **trending** — Score = `likeCount + commentCount×2 + shareCount`; sort by score descending. **Default when no filter.**
- **hot** — Score = `(likeCount + commentCount×2) / (1 + hoursSinceCreation)^1.5`; sort by score descending (newer posts rank higher).

**Response (200):**
```json
{
  "posts": [
    {
      "id": "...",
      "communityId": "...",
      "authorId": "...",
      "author": {
        "id": "...",
        "username": "jane_doe",
        "avatarUrl": null
      },
      "title": "...",
      "content": "...",
      "likeCount": 0,
      "commentCount": 0,
      "shareCount": 0,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 },
  "filter": "trending"
}
```
If user has `preferences.anonymousInCommunity: true`, `author` shows `username: "Anonymous"` and `avatarUrl: null`.

### 8.4 Create post

| Method | Path                            | Auth   |
|--------|----------------------------------|--------|
| POST   | `/communities/:idOrSlug/posts`  | Bearer |

**Body:** `{ "title": "string", "content": "string" }` (both required, non-empty).

**Response (201):** `{ "post": { ... } }` (same shape as list).

### 8.5 Get single post

| Method | Path        | Auth |
|--------|-------------|------|
| GET    | `/posts/:id`| No   |

**Response (200):** `{ "post": { ... } }`.

### 8.6 Like / unlike post

| Method | Path            | Auth   |
|--------|-----------------|--------|
| POST   | `/posts/:id/like` | Bearer |

Toggles like. One like per user; calling again removes the like.

**Response (200):**
```json
{ "liked": true, "likeCount": 5 }
```

### 8.7 List comments

| Method | Path                | Auth |
|--------|---------------------|------|
| GET    | `/posts/:id/comments` | No   |

**Query:** `page`, `limit` (same as posts; default limit 20).

Comments are returned in a flat list. Top-level comments have `parentId: null`; replies have `parentId` set to the parent comment’s id. Only one level of replies is supported (no reply-to-reply).

**Response (200):**
```json
{
  "comments": [
    {
      "id": "...",
      "postId": "...",
      "authorId": "...",
      "author": { "id": "...", "username": "...", "avatarUrl": null },
      "parentId": null,
      "content": "...",
      "likeCount": 0,
      "createdAt": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 10, "totalPages": 1 }
}
```

### 8.8 Create comment

| Method | Path                | Auth   |
|--------|---------------------|--------|
| POST   | `/posts/:id/comments` | Bearer |

**Body:** `{ "content": "string", "parentId": "optional-comment-id" }`. `content` is required and non-empty. `parentId` is optional: when present, the comment is a reply to that comment. Only one level of replies is allowed — you can only reply to a **top-level** comment (one with `parentId: null`). Replying to a reply returns **400** with message `"You can only reply to a top-level comment, not to a reply"`.

**Response (201):** `{ "comment": { ... } }`.

### 8.9 Delete post

| Method | Path        | Auth   |
|--------|-------------|--------|
| DELETE | `/posts/:id` | Bearer |

Only the post author can delete the post. Deletes the post, all comments on it, and all likes. **403** with `"You can only delete your own post"` if the user is not the author.

**Response (200):** `{ "message": "Post deleted" }` (or similar).

### 8.10 Delete comment

| Method | Path                          | Auth   |
|--------|-------------------------------|--------|
| DELETE | `/posts/:id/comments/:commentId` | Bearer |

Only the comment author can delete the comment. If the comment is top-level, all replies to it are also deleted, and the post’s `commentCount` is updated accordingly. **403** with `"You can only delete your own comment"` if the user is not the author.

**Response (200):** `{ "message": "Comment deleted" }` (or similar).

### 8.11 Share (increment share count)

| Method | Path             | Auth   |
|--------|------------------|--------|
| POST   | `/posts/:id/share` | Bearer |

**Response (200):** `{ "shareCount": 3 }`.

---

## 9. Quick Reference — All Endpoints

| Method | Path                          | Auth   | Purpose |
|--------|-------------------------------|--------|---------|
| GET    | `/health`                     | No     | Health check |
| POST   | `/auth/signup`                | No     | Request OTP |
| POST   | `/auth/signin`                | No     | Request OTP |
| POST   | `/auth/otp/send`              | No     | Request OTP |
| POST   | `/auth/otp/verify`            | No     | Verify OTP, get token + user |
| GET    | `/auth/me`                    | Bearer | Current user |
| GET    | `/auth/otp/dev/:identifier`   | No     | Dev: get OTP |
| GET    | `/profile`                    | Bearer | User + onboarding (profile page data) |
| PATCH  | `/profile`                    | Bearer | Update username, age, avatarUrl only |
| PUT    | `/profile`                    | Bearer | Full onboarding questionnaire |
| GET    | `/communities`                | No     | List communities |
| GET    | `/communities/:idOrSlug`      | No     | Get community |
| GET    | `/communities/:idOrSlug/posts` | No     | List posts (filter, page, limit) |
| POST   | `/communities/:idOrSlug/posts` | Bearer | Create post |
| GET    | `/posts/:id`                  | No     | Get post |
| DELETE | `/posts/:id`                  | Bearer | Delete post (author only) |
| POST   | `/posts/:id/like`             | Bearer | Like/unlike |
| GET    | `/posts/:id/comments`         | No     | List comments |
| POST   | `/posts/:id/comments`         | Bearer | Create comment (optional parentId, one-level replies only) |
| DELETE | `/posts/:id/comments/:commentId` | Bearer | Delete comment (author only) |
| POST   | `/posts/:id/share`            | Bearer | Increment share count |

---

## 10. Enums (for dropdowns / validation)

**Required onboarding (PUT /profile):**
- **gender:** `male` | `female` | `non-binary` | `prefer-not-to-say`
- **relationshipStatus:** `single` | `dating` | `married` | `complicated`
- **mainInterests:** `relationship-advice` | `intimacy-techniques` | `product-knowledge` | `general-education` (multi-select)
- **sexualExperience:** `virgin` | `some-experience` | `experienced` | `prefer-not-to-say`

**Optional onboarding (chat personalization; all include `prefer-not-to-say` to skip):**
- **physicalActivityLevel:** `sedentary` | `light` | `moderate` | `active` | `prefer-not-to-say`
- **selfRatedInBed:** `beginner` | `somewhat-confident` | `confident` | `prefer-not-to-say`
- **whatToImproveChat:** `stamina` | `technique` | `communication` | `confidence` | `exploration` | `prefer-not-to-say`
- **intimacyComfortLevel:** `shy` | `getting-comfortable` | `comfortable` | `very-open` | `prefer-not-to-say`

Use these exact values in request bodies and when comparing to API responses.
