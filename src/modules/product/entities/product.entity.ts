import { Types } from 'mongoose';

export class Product {
  readonly _id: Types.ObjectId;
  name: string;
  slug: string;
  sku: string;
  // ─── FIXED: كل الـ optional fields بقت string | null بدل string? ─
  description?: string | null;
  price: number;
  discountPrice?: number | null;
  stock: number;
  images: { url: string; publicId: string }[];
  tags: string[];
  weight: number | null;
  dimensions: { length: number; width: number; height: number } | null;
  category: Types.ObjectId;
  brand: Types.ObjectId;
  isActive: boolean;
  isDeleted: boolean;
  deletedBy: Types.ObjectId | null;
  deletedAt: Date | null;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  stats: { averageRating: number; totalReviews: number };
}

export interface MappedProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description?: string | null;
  price: number;
  discountPrice?: number | null;
  finalPrice: number;
  isOnSale: boolean;
  discountPercentage: number;
  stock: number;
  isOutOfStock: boolean;
  images: string[];
  mainImage: string | null;
  tags: string[];
  weight: number | null;
  dimensions: { length: number; width: number; height: number } | null;
  category: any;
  brand: any;
  isActive: boolean;
  stats: { averageRating: number; totalReviews: number };
  createdAt?: Date;
  updatedAt?: Date;
}
