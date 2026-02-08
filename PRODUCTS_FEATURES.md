# Products & Catalog — Features Implemented (This Version)

This document describes the **product catalog** and **product search** features added in this release. It is intended for the frontend team to integrate product listing, search, and detail views.

---

## Overview

- **Catalog only:** The backend does not sell products. It stores product metadata and **links** to external retailers. The frontend displays products and sends users to the `links[].url` for purchase.
- **Auth:** All product endpoints require a valid JWT. Send `Authorization: Bearer <token>` on every request.
- **Response shape:** Every response follows the platform standard: `success`, `message`, `isBlocked`, plus endpoint-specific fields (`products`, `product`, `total`, etc.). Use `message` / `error` for toasts; if `isBlocked === true`, clear token and block the user.

---

## 1. Data Model (for reference)

### Categories

- **Hierarchical:** Categories can have a `parentId` and `level` for tree UIs.
- **Fields:** `id`, `name`, `slug`, `description`, `parentId`, `level`, `order`, `isActive`, `createdAt`, `updatedAt`.
- *Note: Category list/create/update endpoints are not part of this release; categories are used as filter options and can be added later.*

### Products

- **No brand** in this version (catalog is scraped; brand can be added later).
- **Fields used in API responses:**
  - **Summary (list/search):** `id`, `name`, `slug`, `shortDescription`, `imageUrls`, `productType`, `subTypes`, `tags`, `links`, `targetGender`, `targetAgeGroup`.
  - **Detail (get by id):** All of the above plus `description`, `categoryIds`, `attributes`, `keywords`, `isAdult`, `requiresPrescription`, `createdAt`, `updatedAt`.
- **Links:** Each product has `links[]`: `url`, `retailerName`, `linkType` (`buy` | `info` | `prescription`), `isAffiliate`, `isPrimary`. Use the primary buy link for “Buy” / “View deal” buttons.

---

## 2. Endpoints

Base path: **`/products`**. All require **Bearer** auth.

### 2.1 Search products

| Method | Path               | Auth   | Description                          |
|--------|--------------------|--------|--------------------------------------|
| GET    | `/products/search` | Bearer | Search by query; `type` = normal or ai |

**Query parameters (required):**

| Param  | Type   | Required | Description                                      |
|--------|--------|----------|--------------------------------------------------|
| `q`    | string | Yes      | Search query (e.g. "water based lube sensitive") |
| `type` | string | Yes      | `normal` = regex/text search; `ai` = AI search (same response shape; AI logic can be added later) |

**Optional query parameters:**

| Param  | Type   | Description                    |
|--------|--------|--------------------------------|
| `page` | number | Page number (default: 1)      |
| `limit`| number | Items per page (default: 20, max: 50) |

**Success (200):**

```json
{
  "success": true,
  "message": "OK",
  "isBlocked": false,
  "type": "normal",
  "products": [
    {
      "id": "...",
      "name": "...",
      "slug": "...",
      "shortDescription": "...",
      "imageUrls": ["https://..."],
      "productType": "lubricants",
      "subTypes": ["water_based"],
      "tags": ["sensitive", "long-lasting"],
      "links": [
        {
          "url": "https://retailer.com/...",
          "retailerName": "Retailer Name",
          "linkType": "buy",
          "isAffiliate": false,
          "isPrimary": true
        }
      ],
      "targetGender": "unisex",
      "targetAgeGroup": "all"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

**Errors:**

- **400** — Missing `q`: `"Search query (q) is required"`.
- **400** — Invalid `type`: `"Search type (type) must be \"normal\" or \"ai\""`.
- **401** — Missing or invalid token.

---

### 2.2 List products (with filters)

| Method | Path         | Auth   | Description                |
|--------|--------------|--------|----------------------------|
| GET    | `/products`  | Bearer | List products with filters |

**Query parameters (all optional):**

| Param            | Type   | Description                                                                 |
|------------------|--------|-----------------------------------------------------------------------------|
| `categoryId`     | string | MongoDB ObjectId of a category; only products in that category are returned |
| `productType`    | string | One of the product type enums (see below)                                  |
| `targetGender`   | string | One of the target gender enums                                             |
| `targetAgeGroup` | string | One of the target age group enums                                          |
| `tags`           | string | Comma-separated tags (e.g. `sensitive,organic`); product must have at least one match |
| `page`           | number | Page number (default: 1)                                                   |
| `limit`          | number | Items per page (default: 20, max: 50)                                     |

**Success (200):**

```json
{
  "success": true,
  "message": "OK",
  "isBlocked": false,
  "products": [ /* same ProductSummary shape as in search */ ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

**Errors:**

- **401** — Missing or invalid token.

---

### 2.3 Get product by ID

| Method | Path            | Auth   | Description        |
|--------|-----------------|--------|--------------------|
| GET    | `/products/:id` | Bearer | Single product by id |

**Success (200):**

```json
{
  "success": true,
  "message": "OK",
  "isBlocked": false,
  "product": {
    "id": "...",
    "name": "...",
    "slug": "...",
    "shortDescription": "...",
    "description": "...",
    "imageUrls": ["..."],
    "categoryIds": ["..."],
    "productType": "lubricants",
    "subTypes": ["water_based"],
    "attributes": { },
    "tags": ["..."],
    "keywords": ["..."],
    "links": [ /* same as summary */ ],
    "targetGender": "unisex",
    "targetAgeGroup": "all",
    "isAdult": false,
    "requiresPrescription": false,
    "createdAt": "2025-02-08T...",
    "updatedAt": "2025-02-08T..."
  }
}
```

**Errors:**

- **404** — `"Product not found"` (invalid id or inactive product).
- **401** — Missing or invalid token.

---

## 3. Enums (for filters and UI)

Use these exact values when calling the API and when building filter dropdowns.

### productType

- `sexual_wellness`
- `general_wellness`
- `intimacy`
- `medication`
- `condoms`
- `lubricants`
- `toys`
- `oils`
- `other`

### targetGender

- `male`
- `female`
- `unisex`
- `couples`

### targetAgeGroup

- `18-25`
- `26-35`
- `36-45`
- `45+`
- `all`

### linkType (inside `links[]`)

- `buy`
- `info`
- `prescription`

---

## 4. Quick reference — Product endpoints

| Method | Path                 | Auth   | Purpose                          |
|--------|----------------------|--------|-----------------------------------|
| GET    | `/products/search`   | Bearer | Search by `q` and `type` (normal/ai) |
| GET    | `/products`          | Bearer | List with filters + pagination    |
| GET    | `/products/:id`      | Bearer | Get single product                |

---

## 5. Frontend integration checklist

1. **Auth:** Ensure the user is logged in before calling any product endpoint; attach the stored JWT to every request.
2. **Search:** Build a search bar that calls `GET /products/search?q=<query>&type=normal` (use `type=ai` when backend supports it).
3. **Listing:** Use `GET /products` with optional `categoryId`, `productType`, `targetGender`, `targetAgeGroup`, `tags`, `page`, `limit` for category/filter pages.
4. **Detail:** Use `GET /products/:id` for the product detail page; use `product.links` (prefer `isPrimary` and `linkType: "buy"`) for “Buy” / “View deal” buttons.
5. **Errors:** Show `message` or `error` from the response; if `isBlocked === true`, clear token and redirect to a blocked/account screen.
6. **Enums:** Use the enums above for filter chips, dropdowns, and URL query params so they match the API.

---

*This version implements: Category and Product schemas (no brand), product search (normal + ai response shape), product list with filters, and product get-by-id. All product routes are authorized.*
