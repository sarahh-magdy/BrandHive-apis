import { Types } from 'mongoose';

export class CartItemEntity {
  product: Types.ObjectId;
  quantity: number;
  lockedPrice: number;
  lockedDiscountPrice: number | null;
  priceChanged: boolean;
  currentPrice: number | null;
  productName: string;
  productImage: string | null;
}

export class CartEntity {
  readonly _id: Types.ObjectId;
  user: Types.ObjectId;
  items: CartItemEntity[];
  couponCode: string | null;
  couponDiscount: number;
  expiresAt: Date | null;
}

// ─── Mapped Cart (what frontend receives) ─────────────────────────
export interface MappedCartItem {
  product: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    isAvailable: boolean;
  };
  quantity: number;
  lockedPrice: number;
  lockedDiscountPrice: number | null;
  currentPrice: number;
  effectivePrice: number;        
  itemTotal: number;             // effectivePrice * quantity
  priceChanged: boolean;       
  priceDifference: number | null; 
}

export interface MappedCart {
  id: string;
  items: MappedCartItem[];
  couponCode: string | null;
  couponDiscount: number;
  subtotal: number;
  couponSaving: number;
  total: number;
  totalItems: number;
  totalQuantity: number;
  hasPriceChanges: boolean;
  warnings: string[];
}