import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

// ─── Cart Item Sub-Schema ──────────────────────────────────────────
@Schema({ _id: false })
export class CartItem {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  // ─── Price Locking (Option C: Hybrid) ─────────────────────────
  // السعر بيتحفظ وقت الإضافة للـ cart
  @Prop({ type: Number, required: true, min: 0 })
  lockedPrice: number;

  // لو في خصم، بيتحفظ برضو
  @Prop({ type: Number, default: null, min: 0 })
  lockedDiscountPrice: number | null;

  // ─── Warning flag: لو السعر اتغير من وقت الإضافة ─────────────
  @Prop({ type: Boolean, default: false })
  priceChanged: boolean;

  // السعر الحالي (بيتحدث عند getCart عشان الـ user يشوف الفرق)
  @Prop({ type: Number, default: null })
  currentPrice: number | null;

  // اسم المنتج (محفوظ عشان لو المنتج اتحذف نقدر نعرضه)
  @Prop({ type: String, required: true })
  productName: string;

  // صورة المنتج
  @Prop({ type: String, default: null })
  productImage: string | null;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

// ─── Cart Schema ───────────────────────────────────────────────────
@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  readonly _id: Types.ObjectId;

  // ─── User Isolation ────────────────────────────────────────────
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  // ─── Coupon ────────────────────────────────────────────────────
  @Prop({ type: String, default: null })
  couponCode: string | null;

  @Prop({ type: Number, default: 0, min: 0, max: 100 })
  couponDiscount: number; // percentage

  // ─── Cart Persistence: بيتحفظ حتى لو الـ session انتهت ─────────
  @Prop({ type: Date, default: null })
  expiresAt: Date | null;
}

export const CartSchema = SchemaFactory.createForClass(Cart);

CartSchema.index({ user: 1 }, { unique: true });
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index