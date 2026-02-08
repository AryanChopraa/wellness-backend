# Wellness Platform — Frontend API & Integration Guide

This document describes all API endpoints, auth flow, and initial onboarding for the frontend. Use it to implement login/signup (OTP), token handling, and the onboarding questionnaire.

---

## Base URL & Headers

- **Base URL:** `http://localhost:4000` (dev) or your deployed API URL.
- **JSON:** All request bodies are `Content-Type: application/json`. All responses are JSON.
- **Auth:** For protected routes, send: `Authorization: Bearer <token>`.

---

## 1. Auth Overview

- **No passwords.** Auth is OTP-only: user enters **email** OR **phone** → backend sends OTP → user enters OTP → backend returns **JWT**.
- **Signup and signin use the same flow:** same endpoints; if the user doesn’t exist, an account is created.
- **Token:** After OTP verification you receive a `token`. Store it (e.g. secure storage / cookie) and send it on every request to protected routes.

---

## 2. API Reference

### 2.1 Health

| Method | Path       | Auth | Description   |
|--------|------------|------|---------------|
| GET    | `/health`  | No   | Health check. |

**Response (200):**
```json
{ "status": "ok", "timestamp": "2025-02-07T12:00:00.000Z" }
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
- **429** — `{ "error": "Too many OTP requests. Please try again later." }`

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
    "displayName": "user",
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
    "displayName": "user",
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

Returns current user and their onboarding answers (if any). Use after login to prefill onboarding or profile screens.

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
    "displayName": "user",
    "avatarUrl": null,
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

### 2.7 Profile — Update (Onboarding Questionnaire) (Protected)

Submit or update the onboarding questionnaire. All questionnaire fields are **required**. Optionally add the **other** contact: if user signed up with **email**, they can send **phone** here (and vice versa). Sets `hasOnboarded: true` after success.

| Method | Path       | Auth        |
|--------|------------|-------------|
| PUT    | `/profile` | Bearer token|

**Request body:** All of the following are required except `email` and `phone` (optional, for adding the missing contact).

| Field                     | Type     | Required | Notes |
|---------------------------|----------|----------|--------|
| `age`                     | number   | Yes      | Must be ≥ 18 |
| `gender`                  | string   | Yes      | `male` \| `female` \| `non-binary` \| `prefer-not-to-say` |
| `relationshipStatus`      | string   | Yes      | `single` \| `dating` \| `married` \| `complicated` |
| `mainInterests`           | string[] | Yes      | At least one: `relationship-advice`, `intimacy-techniques`, `product-knowledge`, `general-education` |
| `sexualExperience`         | string   | Yes      | `virgin` \| `some-experience` \| `experienced` \| `prefer-not-to-say` |
| `whyImprove`              | string   | Yes      | Non-empty text |
| `primaryConcern`          | string   | Yes      | Non-empty text |
| `intimacyGoals`           | string   | Yes      | Non-empty text |
| `currentChallenges`        | string   | Yes      | Non-empty text |
| `whatBroughtYouHere`       | string   | Yes      | Non-empty text |
| `hopesFromPlatform`        | string   | Yes      | Non-empty text |
| `anythingElseWeShouldKnow` | string   | Yes      | Non-empty text |
| `email`                   | string   | No       | Only used if user has no email (e.g. signed up with phone) |
| `phone`                   | string   | No       | Only used if user has no phone (e.g. signed up with email) |

**Example:**
```json
{
  "age": 25,
  "gender": "female",
  "relationshipStatus": "dating",
  "mainInterests": ["relationship-advice", "general-education"],
  "sexualExperience": "some-experience",
  "whyImprove": "I want to feel more confident and informed.",
  "primaryConcern": "Communication with my partner.",
  "intimacyGoals": "Better understanding and comfort.",
  "currentChallenges": "Lack of reliable information.",
  "whatBroughtYouHere": "Recommendation from a friend.",
  "hopesFromPlatform": "Non-judgmental guidance and community.",
  "anythingElseWeShouldKnow": "Prefer anonymous in community.",
  "phone": "+1234567890"
}
```

**Success (200):**
Same shape as GET `/profile`: `{ "user": { ... }, "onboarding": { ... } }`. `user.hasOnboarded` will be `true`.

**Errors:**
- **400** — Validation (e.g. `"Age is required and must be at least 18"`, invalid enum, empty text field, invalid email/phone).
- **401** / **403** — Unauthorized or blocked.

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
2. **Show questionnaire:** Single or multi-step form with all required fields (see PUT `/profile` table). Optional: add email or phone if the user only had one.
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

## 8. Quick Reference — All Endpoints

| Method | Path                     | Auth   | Purpose |
|--------|--------------------------|--------|---------|
| GET    | `/health`                | No     | Health check |
| POST   | `/auth/signup`           | No     | Request OTP (signup/signin) |
| POST   | `/auth/signin`           | No     | Request OTP (signup/signin) |
| POST   | `/auth/otp/send`         | No     | Request OTP (signup/signin) |
| POST   | `/auth/otp/verify`       | No     | Verify OTP, get token + user |
| GET    | `/auth/me`               | Bearer | Current user |
| GET    | `/auth/otp/dev/:identifier` | No  | Dev: get OTP for testing |
| GET    | `/profile`               | Bearer | User + onboarding data |
| PUT    | `/profile`               | Bearer | Submit/update onboarding questionnaire |

---

## 9. Enums (for dropdowns / validation)

- **gender:** `male` | `female` | `non-binary` | `prefer-not-to-say`
- **relationshipStatus:** `single` | `dating` | `married` | `complicated`
- **mainInterests:** `relationship-advice` | `intimacy-techniques` | `product-knowledge` | `general-education` (multi-select)
- **sexualExperience:** `virgin` | `some-experience` | `experienced` | `prefer-not-to-say`

Use these exact values in request bodies and when comparing to API responses.
