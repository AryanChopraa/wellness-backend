/**
 * Product API types – change response shapes here so routes and frontend stay in sync.
 */

export interface ProductLinkPayload {
  url: string;
  retailerName?: string;
  linkType: 'buy' | 'info' | 'prescription';
  isAffiliate: boolean;
  isPrimary: boolean;
}

export interface ProductSummaryPayload {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string;
  imageUrls: string[];
  productType: string;
  subTypes: string[];
  tags: string[];
  links: ProductLinkPayload[];
  targetGender?: string;
  targetAgeGroup?: string;
}

export interface ProductDetailPayload extends ProductSummaryPayload {
  description?: string;
  categoryIds: string[];
  attributes: Record<string, unknown>;
  keywords: string[];
  isAdult: boolean;
  requiresPrescription: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SearchType = 'normal' | 'ai';
