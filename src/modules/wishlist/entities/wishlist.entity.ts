import { Types } from 'mongoose';

export class WishlistItemEntity {
  product: Types.ObjectId;
  snapshotPrice: number;
  snapshotDiscountPrice: number | null;
  priceDropped: boolean;
  currentPrice: number | null;
  currentDiscountPrice: number | null;
  notificationSent: boolean;
  productName: string;
  productImage: string | null;
  addedAt: Date;
}

export class WishlistEntity {
  readonly _id: Types.ObjectId;
  user: Types.ObjectId;
  items: WishlistItemEntity[];
}

export interface MappedWishlistItem {
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    image: string | null;
    rating: number;
    totalReviews: number;
  };
  snapshotPrice: number;
  snapshotDiscountPrice: number | null;
  currentPrice: number;
  currentDiscountPrice: number | null;
  effectivePrice: number;
  priceDropped: boolean;
  priceDrop: number | null;
  priceDropPercent: number | null;
  stock: number;
  inStock: boolean;
  isAvailable: boolean;
  addedAt: Date;
}

export interface MappedWishlist {
  id: string;
  items: MappedWishlistItem[];
  totalItems: number;
  inStockCount: number;
  outOfStockCount: number;
  priceDropCount: number;
}