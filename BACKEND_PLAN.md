# Wellness Platform — Backend Plan

## Stack

- **Runtime:** Node.js
- **Language:** TypeScript
- **Database:** MongoDB (via Mongoose)
- **Auth:** OTP-only (email or phone). No passwords, no social login.

## Authentication Model

- **Only way to sign up / sign in:** User provides **email** OR **phone** → we send an OTP → user submits OTP → we verify and log them in (create user if new).
- **Signup = Signin:** Same flow. If identifier (email/phone) is new, we create the user and send OTP. If existing, we just send OTP. After OTP verification, we issue a JWT.

## High-Level Flow

1. **Request OTP (signup/signin):**  
   `POST /auth/otp/send` with `{ email }` **or** `{ phone }`.  
   - Validate that exactly one of `email` or `phone` is provided.  
   - If user doesn’t exist → create user (signup).  
   - Generate OTP, store in DB (Otp model), send via email/SMS (stub in dev).  
   - Return `{ message, expiresAt }`.

2. **Verify OTP (login):**  
   `POST /auth/otp/verify` with `{ email? or phone?, code }`.  
   - Verify OTP from DB, then delete or mark used.  
   - Find user by email or phone, issue JWT.  
   - Return `{ token, user }`.

3. **Protected routes:**  
   Use `Authorization: Bearer <token>`. Middleware loads user and attaches to `req.user`.

## Project Structure

```
src/
├── config/
│   ├── db.ts        # MongoDB connect/disconnect
│   └── env.ts       # Env vars (PORT, MONGODB_URI, JWT, OTP expiry)
├── models/
│   ├── User.ts      # User document (email?, phone?, authProviders, onboarding, preferences)
│   └── Otp.ts       # OTP document (identifier, code, expiresAt, type: email|phone)
├── services/
│   ├── otp.ts       # createOtp, verifyOtp (MongoDB-backed)
│   └── jwt.ts       # signToken, verifyToken
├── middleware/
│   └── auth.ts      # requireAuth, optionalAuth
├── routes/
│   └── auth.ts      # signup, signin, otp/send, otp/verify, me
├── types/
│   ├── user.ts      # User-related types
│   └── auth.ts      # Auth payload / request types
├── app.ts           # Express app (JSON, routes)
└── index.ts         # connect DB, start server
```

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST   | `/auth/signup`     | Alias for “request OTP” — body: `{ email? }` or `{ phone? }`. Creates user if new, sends OTP. |
| POST   | `/auth/signin`     | Same as signup — body: `{ email? }` or `{ phone? }`. Sends OTP. |
| POST   | `/auth/otp/send`   | Same — body: `{ email? }` or `{ phone? }`. Single entry point for “send OTP”. |
| POST   | `/auth/otp/verify` | Body: `{ email? or phone?, code }`. Verifies OTP, returns JWT + user. |
| GET    | `/auth/me`         | Protected. Returns current user. |
| GET    | `/health`          | Health check. |

## Models (MongoDB)

### User

- `email`: string, optional, sparse unique, lowercase.
- `phone`: string, optional, sparse unique, normalized (e.g. E.164 or digits).
- `displayName`: string, default from email local part or “User”.
- `avatarUrl`: string, optional.
- `authProviders`: array of `{ provider: 'otp', identifier, linkedAt }` (no passwords).
- `onboarding`: age, gender, relationshipStatus, mainInterests (per product.md).
- `preferences`: anonymousInCommunity, notifications.
- `timestamps`: true.

At least one of `email` or `phone` must be set. Both can exist (e.g. user added phone later).

### OTP

- `identifier`: string (normalized email or phone).
- `code`: string (6-digit).
- `expiresAt`: Date.
- `type`: `'email' | 'phone'` (for future sending logic).
- Optional: `usedAt` or delete on verify.

Index: `identifier` + `expiresAt` for TTL or cleanup.

## Validation

- **Email:** Valid format, required if no phone. Normalize: trim, lowercase.
- **Phone:** Required if no email. Normalize: digits only, min length (e.g. 10), optional E.164. Store consistently (e.g. with country code).
- **OTP:** 6 digits, single use, expiry (e.g. 10 minutes).

## Security Notes

- OTP stored hashed or at least not logged in production.
- In dev: log OTP to console or expose a dev-only route to read last OTP for testing.
- Rate-limit OTP send and verify in production (to be added later).
- JWT secret from env; never commit.

## Env Variables

- `PORT` — server port (default 4000).
- `MONGODB_URI` — MongoDB connection string.
- `JWT_SECRET` — secret for signing JWTs.
- `JWT_EXPIRES_IN` — e.g. `7d`.
- `OTP_EXPIRY_MINUTES` — e.g. 10.

## Next Steps (Later)

- Email provider (e.g. SendGrid, Resend) to send OTP to email.
- SMS provider (e.g. Twilio) to send OTP to phone.
- Rate limiting on `/auth/otp/send` and `/auth/otp/verify`.
- Optional: TTL index on Otp collection for auto-delete of expired OTPs.
