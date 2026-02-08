/**
 * Insert product (and optional category) data from a JSON file.
 *
 * Expected format: see PRODUCT_DATA_FORMAT.md at project root.
 *
 * Usage:
 *   npx ts-node -r dotenv/config src/scripts/insert-product-data.ts [path/to/data.json]
 *
 * Default path: data/product-data.json
 */

import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { connectDb, disconnectDb } from '../config/db';
import { Category } from '../models/Category';
import { Product } from '../models/Product';

// ---------------------------------------------------------------------------
// Types matching PRODUCT_DATA_FORMAT.md
// ---------------------------------------------------------------------------
interface CategoryInput {
  name: string;
  slug: string;
  description?: string;
  parentSlug?: string | null;
  level?: number;
  order?: number;
}

interface ProductLinkInput {
  url: string;
  retailerName?: string;
  linkType?: 'buy' | 'info' | 'prescription';
  isAffiliate?: boolean;
  isPrimary?: boolean;
}

interface ProductInput {
  name: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  imageUrls?: string[];
  categorySlugs?: string[];
  productType: string;
  subTypes?: string[];
  attributes?: Record<string, unknown>;
  tags?: string[];
  keywords?: string[];
  links: ProductLinkInput[];
  targetGender?: string;
  targetAgeGroup?: string;
  isActive?: boolean;
  isAdult?: boolean;
  requiresPrescription?: boolean;
}

interface DataFile {
  categories?: CategoryInput[];
  products?: ProductInput[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function loadSlugToId(): Promise<Record<string, mongoose.Types.ObjectId>> {
  const map: Record<string, mongoose.Types.ObjectId> = {};
  const cats = await Category.find({}).select('slug').lean();
  for (const c of cats) {
    const slug = (c as { slug: string }).slug;
    map[slug] = (c as { _id: mongoose.Types.ObjectId })._id;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const filePath = process.argv[2] ?? path.join(process.cwd(), 'data', 'product-data.json');
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error('File not found:', absolutePath);
    console.error('Usage: npx ts-node -r dotenv/config src/scripts/insert-product-data.ts [path/to/data.json]');
    process.exit(1);
  }

  let data: DataFile;
  try {
    const raw = fs.readFileSync(absolutePath, 'utf-8');
    data = JSON.parse(raw) as DataFile;
  } catch (e) {
    console.error('Invalid JSON:', (e as Error).message);
    process.exit(1);
  }

  const categories = data.categories ?? [];
  const products = data.products ?? [];

  if (products.length === 0 && categories.length === 0) {
    console.log('No categories or products in file. Exiting.');
    process.exit(0);
  }

  await connectDb();
  const slugToId = await loadSlugToId();

  // ---------- Categories ----------
  if (categories.length > 0) {
    const byLevel = [...categories].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
    for (const cat of byLevel) {
      const parentSlug = cat.parentSlug?.trim() || null;
      let parentId: mongoose.Types.ObjectId | null = null;
      if (parentSlug) {
        parentId = slugToId[parentSlug] ?? null;
        if (!parentId) {
          console.warn('Category "%s": parentSlug "%s" not found, using root.', cat.slug, parentSlug);
        }
      }

      const doc = await Category.findOneAndUpdate(
        { slug: cat.slug },
        {
          $set: {
            name: cat.name.trim(),
            description: (cat.description ?? '').trim() || undefined,
            parentId,
            level: cat.level ?? 0,
            order: cat.order ?? 0,
            isActive: true,
          },
        },
        { upsert: true, new: true }
      );
      slugToId[cat.slug] = doc._id;
    }
    console.log('Categories: %d processed (upserted by slug).', categories.length);
  }

  // ---------- Products ----------
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const p of products) {
    if (!p.name?.trim() || !p.slug?.trim() || !p.productType) {
      console.warn('Product skipped (missing name, slug, or productType):', p.slug || p.name);
      skipped++;
      continue;
    }

    const categoryIds: mongoose.Types.ObjectId[] = [];
    for (const slug of p.categorySlugs ?? []) {
      const id = slugToId[slug];
      if (id) categoryIds.push(id);
      else console.warn('Product "%s": category slug "%s" not found.', p.slug, slug);
    }

    const links = (p.links ?? []).map((l) => ({
      url: (l.url ?? '').replace(/\s+/g, ' ').trim(),
      retailerName: l.retailerName?.trim(),
      linkType: l.linkType ?? 'buy',
      isAffiliate: l.isAffiliate ?? false,
      isPrimary: l.isPrimary ?? false,
    }));

    if (links.length === 0) {
      console.warn('Product "%s": no links, skipped.', p.slug);
      skipped++;
      continue;
    }

    const payload = {
      name: p.name.trim(),
      slug: p.slug.trim().toLowerCase(),
      shortDescription: p.shortDescription?.trim(),
      description: p.description?.trim(),
      imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : [],
      categoryIds,
      productType: p.productType,
      subTypes: Array.isArray(p.subTypes) ? p.subTypes : [],
      attributes: p.attributes ?? {},
      tags: Array.isArray(p.tags) ? p.tags : [],
      keywords: Array.isArray(p.keywords) ? p.keywords : [],
      links,
      targetGender: p.targetGender ?? undefined,
      targetAgeGroup: p.targetAgeGroup ?? undefined,
      isActive: p.isActive !== false,
      isAdult: p.isAdult ?? false,
      requiresPrescription: p.requiresPrescription ?? false,
    };

    const existing = await Product.findOne({ slug: payload.slug });
    if (existing) {
      await Product.updateOne({ slug: payload.slug }, { $set: payload });
      updated++;
    } else {
      await Product.create(payload);
      inserted++;
    }
  }

  console.log('Products: %d inserted, %d updated, %d skipped.', inserted, updated, skipped);
  await disconnectDb();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
