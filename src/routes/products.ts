import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Product } from '../models/Product';
import { requireAuth, type AuthRequest } from '../middleware/auth';
import { sendError } from '../utils/response';
import type { ProductSummaryPayload, ProductDetailPayload } from '../types/product';

const router = Router();
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const SEARCH_TYPES = ['normal', 'ai'] as const;
type SearchType = (typeof SEARCH_TYPES)[number];

// ---------------------------------------------------------------------------
// Response mappers – change here when you need different payload shapes
// ---------------------------------------------------------------------------
function mapLinks(links: unknown): ProductSummaryPayload['links'] {
  if (!Array.isArray(links)) return [];
  return links.map((l) => {
    const x = l as Record<string, unknown>;
    return {
      url: (x.url as string) ?? '',
      retailerName: x.retailerName as string | undefined,
      linkType: (x.linkType as 'buy' | 'info' | 'prescription') ?? 'buy',
      isAffiliate: (x.isAffiliate as boolean) ?? false,
      isPrimary: (x.isPrimary as boolean) ?? false,
    };
  });
}

function toProductSummary(doc: Record<string, unknown>): ProductSummaryPayload {
  return {
    id: String(doc._id),
    name: (doc.name as string) ?? '',
    slug: (doc.slug as string) ?? '',
    shortDescription: doc.shortDescription as string | undefined,
    imageUrls: Array.isArray(doc.imageUrls) ? (doc.imageUrls as string[]) : [],
    productType: (doc.productType as string) ?? '',
    subTypes: Array.isArray(doc.subTypes) ? (doc.subTypes as string[]) : [],
    tags: Array.isArray(doc.tags) ? (doc.tags as string[]) : [],
    links: mapLinks(doc.links),
    targetGender: doc.targetGender as string | undefined,
    targetAgeGroup: doc.targetAgeGroup as string | undefined,
  };
}

function toProductDetail(doc: Record<string, unknown>): ProductDetailPayload {
  const base = toProductSummary(doc);
  return {
    ...base,
    description: doc.description as string | undefined,
    categoryIds: Array.isArray(doc.categoryIds)
      ? (doc.categoryIds as mongoose.Types.ObjectId[]).map((id) => String(id))
      : [],
    attributes: (doc.attributes as Record<string, unknown>) ?? {},
    keywords: Array.isArray(doc.keywords) ? (doc.keywords as string[]) : [],
    isAdult: (doc.isAdult as boolean) ?? false,
    requiresPrescription: (doc.requiresPrescription as boolean) ?? false,
    createdAt: (doc.createdAt as Date)?.toISOString?.() ?? '',
    updatedAt: (doc.updatedAt as Date)?.toISOString?.() ?? '',
  };
}

// ---------------------------------------------------------------------------
// GET /products/search?q=...&type=normal|ai
// Auth: required. q and type required. normal = regex search; ai = same shape (impl later).
// ---------------------------------------------------------------------------
router.get('/search', requireAuth, async (req: AuthRequest, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const type = (req.query.type as string)?.toLowerCase();

  if (!q) {
    sendError(res, 400, 'Search query (q) is required');
    return;
  }
  if (!SEARCH_TYPES.includes(type as SearchType)) {
    sendError(res, 400, 'Search type (type) must be "normal" or "ai"');
    return;
  }

  const searchType = type as SearchType;
  const page = Math.max(1, parseInt(String(req.query.page), 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit), 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const baseFilter = { isActive: true };

  let products: Array<Record<string, unknown>>;
  let total: number;

  if (searchType === 'normal') {
    const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const filter = {
      ...baseFilter,
      $or: [
        { name: searchRegex },
        { shortDescription: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { keywords: searchRegex },
      ],
    };
    const [result, countResult] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    products = result as Array<Record<string, unknown>>;
    total = countResult;
  } else {
    // AI search: same response shape; replace with vector/agent later
    const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const filter = {
      ...baseFilter,
      $or: [
        { name: searchRegex },
        { shortDescription: searchRegex },
        { description: searchRegex },
        { tags: searchRegex },
        { keywords: searchRegex },
      ],
    };
    const [result, countResult] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);
    products = result as Array<Record<string, unknown>>;
    total = countResult;
  }

  res.status(200).json({
    message: 'OK',
    type: searchType,
    products: products.map(toProductSummary),
    total,
    page,
    limit,
  });
});

// ---------------------------------------------------------------------------
// GET /products — List products with filters. Auth: required.
// Query: categoryId, productType, targetGender, targetAgeGroup, tags (comma), page, limit
// ---------------------------------------------------------------------------
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const filter: Record<string, unknown> = { isActive: true };

  const categoryId = req.query.categoryId as string;
  if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
    filter.categoryIds = new mongoose.Types.ObjectId(categoryId);
  }

  const productType = req.query.productType as string;
  if (productType) filter.productType = productType;

  const targetGender = req.query.targetGender as string;
  if (targetGender) filter.targetGender = targetGender;

  const targetAgeGroup = req.query.targetAgeGroup as string;
  if (targetAgeGroup) filter.targetAgeGroup = targetAgeGroup;

  const tagsStr = req.query.tags as string;
  if (tagsStr?.trim()) {
    const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
    if (tags.length) filter.tags = { $in: tags };
  }

  const page = Math.max(1, parseInt(String(req.query.page), 10) || DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(String(req.query.limit), 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    message: 'OK',
    products: (products as Array<Record<string, unknown>>).map(toProductSummary),
    total,
    page,
    limit,
  });
});

// ---------------------------------------------------------------------------
// GET /products/:id — Get single product by id. Auth: required.
// ---------------------------------------------------------------------------
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  const product = await Product.findOne({ _id: id, isActive: true }).lean();
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.status(200).json({
    message: 'OK',
    product: toProductDetail(product as Record<string, unknown>),
  });
});

export const productRoutes = router;
