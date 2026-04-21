import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

// ─── Wishlist Item Sub-Schema ──────────────────────────────────────
@Schema({ _id: false })
export class WishlistItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  // ─── Price Snapshot (Hybrid) ───────────────────────────────────
  @Prop({ type: Number, required: true, min: 0 })
  snapshotPrice: number;

  @Prop({ type: Number, default: null, min: 0 })
  snapshotDiscountPrice: number | null;

  // ─── Price Drop Detection ──────────────────────────────────────
  @Prop({ type: Boolean, default: false })
  priceDropped: boolean;

  @Prop({ type: Number, default: null })
  currentPrice: number | null;

  @Prop({ type: Number, default: null })
  currentDiscountPrice: number | null;

  @Prop({ type: Boolean, default: false })
  notificationSent: boolean;

  @Prop({ type: String, required: true })
  productName: string;

  @Prop({ type: String, default: null })
  productImage: string | null;

  @Prop({ type: Date, default: () => new Date() })
  addedAt: Date;
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

//  Wishlist Schema 
@Schema({ timestamps: true })
export class Wishlist {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  readonly _id: Types.ObjectId;

  //  User Isolation
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: [WishlistItemSchema], default: [] })
  items: WishlistItem[];
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);

WishlistSchema.index({ user: 1 }, { unique: true });
WishlistSchema.index({ 'items.product': 1 });