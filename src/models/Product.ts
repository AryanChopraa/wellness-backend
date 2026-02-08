import mongoose, { Schema } from 'mongoose';

// ---------------------------------------------------------------------------
// Enums – change these arrays when adding new product types / demographics
// ---------------------------------------------------------------------------
export const PRODUCT_TYPES = [
  'sexual_wellness',
  'general_wellness',
  'intimacy',
  'medication',
  'condoms',
  'lubricants',
  'toys',
  'oils',
  'other',
] as const;

export const TARGET_GENDERS = ['male', 'female', 'unisex', 'couples'] as const;
export const TARGET_AGE_GROUPS = ['18-25', '26-35', '36-45', '45+', 'all'] as const;

// ---------------------------------------------------------------------------
// Sub-document: product link (outbound to retailer)
// ---------------------------------------------------------------------------
const ProductLinkSchema = new Schema(
  {
    url: { type: String, required: true },
    retailerName: { type: String, trim: true },
    linkType: { type: String, enum: ['buy', 'info', 'prescription'], default: 'buy' },
    isAffiliate: { type: Boolean, default: false },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false }
);

// ---------------------------------------------------------------------------
// Product schema – catalog only (no brand); scraped data–friendly
// ---------------------------------------------------------------------------
const ProductSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    shortDescription: { type: String, trim: true },
    description: { type: String, trim: true },
    imageUrls: [{ type: String }],
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    productType: { type: String, required: true, enum: PRODUCT_TYPES },
    subTypes: [{ type: String, trim: true }],
    attributes: {
      type: Schema.Types.Mixed,
      default: {},
    },
    tags: [{ type: String, trim: true }],
    keywords: [{ type: String, trim: true }],
    links: [ProductLinkSchema],
    targetGender: { type: String, enum: TARGET_GENDERS },
    targetAgeGroup: { type: String, enum: TARGET_AGE_GROUPS },
    isActive: { type: Boolean, default: true },
    isAdult: { type: Boolean, default: false },
    requiresPrescription: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ProductSchema.index({ slug: 1 });
ProductSchema.index({ categoryIds: 1 });
ProductSchema.index({ productType: 1 });
ProductSchema.index({ isActive: 1 });
ProductSchema.index({ targetGender: 1 });
ProductSchema.index({ targetAgeGroup: 1 });
ProductSchema.index({ tags: 1 });
ProductSchema.index({
  name: 'text',
  shortDescription: 'text',
  description: 'text',
  keywords: 'text',
  tags: 'text',
});

export const Product = mongoose.model('Product', ProductSchema);
