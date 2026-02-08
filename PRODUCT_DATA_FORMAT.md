# Product data — formal JSON format for Data AI

Use this exact structure when producing product (and optional category) data. The insert script expects this format.

---

## Root object

The file must be a **single JSON object** with two optional top-level keys:

```json
{
  "categories": [ ... ],
  "products": [ ... ]
}
```

- **categories** (optional): array of category objects. Inserted/updated first; products can reference them by `categorySlugs`.
- **products** (required for product insert): array of product objects.

You can omit `categories` if categories already exist in the DB (products then use `categorySlugs` that match existing category `slug` values).

---

## Category object

| Field        | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `name`      | string | Yes      | Display name (e.g. `"Lubricants"`). |
| `slug`      | string | Yes      | Unique URL-safe id (lowercase, no spaces). E.g. `"lubricants"`. |
| `description` | string | No    | Short description. |
| `parentSlug` | string | No     | Slug of parent category (must exist in DB or in same file). Root if omitted. |
| `level`     | number | No       | 0 = root, 1 = child, etc. Default `0`. |
| `order`     | number | No       | Sort order. Default `0`. |

**Example:**

```json
{
  "name": "Lubricants",
  "slug": "lubricants",
  "description": "Water-based, silicone, and oil-based lubricants",
  "parentSlug": null,
  "level": 0,
  "order": 1
}
```

---

## Product object

| Field                | Type   | Required | Description |
|----------------------|--------|----------|-------------|
| `name`               | string | Yes      | Product name. |
| `slug`               | string | Yes      | Unique URL-safe id (lowercase, no spaces). E.g. `"product-name-123"`. |
| `shortDescription`   | string | No       | One or two lines for cards. |
| `description`        | string | No       | Full description. |
| `imageUrls`          | string[] | No     | List of image URLs. |
| `categorySlugs`      | string[] | No     | Category slugs this product belongs to (must exist in DB or in `categories` in same file). |
| `productType`        | string | Yes      | One of: `sexual_wellness`, `general_wellness`, `intimacy`, `medication`, `condoms`, `lubricants`, `toys`, `oils`, `other`. |
| `subTypes`           | string[] | No     | E.g. `["water_based", "silicone_free"]`. |
| `attributes`         | object | No       | Free-form key-value (e.g. `{"base": "water", "volumeMl": 100}`). |
| `tags`               | string[] | No     | E.g. `["sensitive", "long-lasting", "organic"]`. |
| `keywords`           | string[] | No     | Extra search terms. |
| `links`              | object[] | Yes*   | At least one link. See Link object below. |
| `targetGender`       | string | No       | One of: `male`, `female`, `unisex`, `couples`. |
| `targetAgeGroup`     | string | No       | One of: `18-25`, `26-35`, `36-45`, `45+`, `all`. |
| `isActive`           | boolean | No      | Default `true`. |
| `isAdult`            | boolean | No      | Default `false`. |
| `requiresPrescription` | boolean | No    | Default `false`. |

**Link object** (each item in `links`):

| Field           | Type    | Required | Description |
|-----------------|---------|----------|-------------|
| `url`           | string  | Yes      | Full URL to retailer or info page. |
| `retailerName`  | string  | No       | E.g. `"Amazon"`, `"Pharmacy X"`. |
| `linkType`      | string  | No       | `buy` \| `info` \| `prescription`. Default `buy`. |
| `isAffiliate`   | boolean | No       | Default `false`. |
| `isPrimary`     | boolean | No       | One link should be `true` for main CTA. Default `false`. |

---

## Full example (minimal)

```json
{
  "categories": [
    {
      "name": "Lubricants",
      "slug": "lubricants",
      "description": "Personal lubricants",
      "level": 0,
      "order": 1
    }
  ],
  "products": [
    {
      "name": "Example Water-Based Lube",
      "slug": "example-water-based-lube",
      "shortDescription": "Gentle, water-based lubricant for sensitive skin.",
      "description": "Longer description for the product page. Safe with condoms. Paraben-free.",
      "imageUrls": ["https://example.com/image1.jpg"],
      "categorySlugs": ["lubricants"],
      "productType": "lubricants",
      "subTypes": ["water_based"],
      "attributes": {
        "base": "water",
        "volumeMl": 100,
        "flavor": "unscented"
      },
      "tags": ["sensitive", "paraben-free", "condom-safe"],
      "keywords": ["lube", "water based", "gentle"],
      "links": [
        {
          "url": "https://retailer.com/product/123",
          "retailerName": "Example Retailer",
          "linkType": "buy",
          "isPrimary": true
        }
      ],
      "targetGender": "unisex",
      "targetAgeGroup": "all",
      "isAdult": false,
      "requiresPrescription": false
    }
  ]
}
```

---

## Full example (multiple products and links)

```json
{
  "categories": [
    { "name": "Condoms", "slug": "condoms", "level": 0, "order": 1 },
    { "name": "Lubricants", "slug": "lubricants", "level": 0, "order": 2 }
  ],
  "products": [
    {
      "name": "Sensitive Skin Condoms 12-Pack",
      "slug": "sensitive-skin-condoms-12",
      "shortDescription": "Latex-free condoms for sensitive skin.",
      "description": "Full product description here.",
      "imageUrls": ["https://cdn.example.com/condom.jpg"],
      "categorySlugs": ["condoms"],
      "productType": "condoms",
      "subTypes": ["non_latex"],
      "attributes": { "material": "non-latex", "count": 12 },
      "tags": ["sensitive", "latex-free", "beginner-friendly"],
      "keywords": ["condom", "sensitive", "non latex"],
      "links": [
        { "url": "https://amazon.com/dp/XXX", "retailerName": "Amazon", "linkType": "buy", "isPrimary": true },
        { "url": "https://brand.com/product", "retailerName": "Brand", "linkType": "info", "isPrimary": false }
      ],
      "targetGender": "unisex",
      "targetAgeGroup": "all"
    }
  ]
}
```

---

## Rules for Data AI

1. **Slugs:** Unique per product and per category. Use lowercase, hyphens, no spaces (e.g. `water-based-lube-100ml`).
2. **productType:** Use exactly one of the enum values above.
3. **targetGender / targetAgeGroup:** Use exactly the enum values above or omit.
4. **categorySlugs:** Must match a `slug` from `categories` (in the same file or already in the DB).
5. **links:** At least one entry; one link should have `isPrimary: true` for the main buy button.
6. **attributes:** Any flat key-value pairs; the DB accepts any object (e.g. `volumeMl`, `base`, `material`, `count`).

Save the output as a single `.json` file and run the insert script with that file path.
