# Frontend changes — Version 3

This document lists **changes added in Version 3** on top of Version 2. Assume everything in **version-2.md** still applies. Use **FRONTEND_INTEGRATION.md** for full request/response shapes and enums.

**Base URL:** Your API base. **Auth:** `Authorization: Bearer <token>` on protected routes.

---

## 1. Assets: common flow (upload first, then use id)

All user-uploaded media (profile picture, post attachments) go through **POST /assets**.

1. **Frontend** uploads a file: **POST /assets** (multipart/form-data, field `file`). Optional: `note` (string).
2. **Response:** `{ asset: { id, url, name, note } }`.
3. Use **`asset.id`** in:
   - **PATCH /profile** as `avatarAssetId` (profile picture), or
   - **POST /communities/:idOrSlug/posts** as `assetIds` (array of ids) for attached media.

Only assets owned by the current user can be used. Backend validates ownership when you send `avatarAssetId` or `assetIds`.

---

## 2. Profile picture (avatar)

- **Update avatar:** Send the asset id from **POST /assets** in **PATCH /profile**:
  - Body: `{ avatarAssetId: "<asset-id>" }`. Backend resolves the asset’s URL and sets `user.avatarUrl`.
  - To clear avatar: `{ avatarAssetId: null }` or `""`.
- **Existing field:** You can still send `avatarUrl` (string) directly if you have a URL.
- **Default avatar:** When the user has no `avatarUrl`, **GET /profile** (and author objects in posts/comments) return a **default pixelated avatar URL** (DiceBear pixel-art), so the frontend always gets a displayable URL. The default is deterministic by user id and optional gender (from assessment/onboarding) so it can differ for male/female when no photo is set.

**Summary:** Use **POST /assets** → get `id` → **PATCH /profile** with `avatarAssetId: id`. If you don’t set an avatar, the API still returns a default avatar URL.

---

## 3. Community posts: attach assets

- **Create post:** **POST /communities/:idOrSlug/posts** body can include **`assetIds`** (array of asset ids).
  - Each id must be from **POST /assets** and belong to the current user.
  - Same flow: upload file(s) with **POST /assets**, collect `asset.id`, then send those ids in `assetIds`.
- **Response:** Every post (create, list, detail) now includes **`assets`**: `[{ id, url }, ...]` so you can render images/links. Order matches the order of `assetIds` on create.

**Summary:** Use **POST /assets** for each file → get `id`s → **POST .../posts** with `assetIds: [id1, id2]`. Responses include `assets: [{ id, url }, ...]`.

---

## 4. New/updated routes (Version 3)

| Method | Path | Change in v3 |
|--------|------|----------------|
| POST | `/assets` | **Use for all uploads.** Returns `{ asset: { id, url, name, note } }`. Use `id` as `avatarAssetId` or in `assetIds` for posts. |
| PATCH | `/profile` | Accepts **`avatarAssetId`** (string or null). Resolves asset URL and sets profile picture. |
| POST | `/communities/:idOrSlug/posts` | Accepts **`assetIds`** (array of strings). Attached media; response includes **`assets`** (`[{ id, url }]`). |

Post list/detail (GET posts, GET post by id, for-you feed) and comment authors now also include:
- **`assets`** on each post (when present).
- **Default avatar URL** for authors/comments when they have no `avatarUrl`.

---

## 5. Summary

- **Assets:** One flow — **POST /assets** → use returned **`id`** in profile or posts.
- **Profile picture:** **PATCH /profile** with **`avatarAssetId`** (or `avatarUrl`). Default pixelated avatar when none set.
- **Posts:** **POST .../posts** with **`assetIds`**; responses include **`assets`** with `id` and `url`.

For full types and error handling, see **FRONTEND_INTEGRATION.md**.
