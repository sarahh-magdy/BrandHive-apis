import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Product {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  readonly _id: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, unique: true, trim: true })
  slug: string;

  @Prop({ type: String, required: true, unique: true, trim: true, uppercase: true })
  sku: string;

  @Prop({ type: String, trim: true, default: null })
  description: string;

  @Prop({ type: Number, required: true, min: 0 })
  price: number;

  @Prop({ type: Number, default: null, min: 0 })
  discountPrice: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  stock: number;

  // ─── CHANGED: كل image بقت object فيها url + publicId ────────────
  // السبب: محتاجين نحفظ الـ publicId عشان نحذف الصور من Cloudinary
  @Prop({
    type: [
      {
        url: { type: String, required: true },
        publicId: { type: String, required: true },
      },
    ],
    default: [],
  })
  images: { url: string; publicId: string }[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Number, default: null, min: 0 })
  weight: number;

  @Prop({
    type: {
      length: { type: Number, default: null },
      width: { type: Number, default: null },
      height: { type: Number, default: null },
    },
    default: null,
  })
  dimensions: { length: number; width: number; height: number };

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Brand', required: true })
  brand: Types.ObjectId;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null })
  deletedBy: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  updatedBy: Types.ObjectId;

  @Prop({
    type: {
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
    },
    default: () => ({ averageRating: 0, totalReviews: 0 }),
  })
  stats: { averageRating: number; totalReviews: number };
}

export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
ProductSchema.index({ slug: 1, isDeleted: 1 });
ProductSchema.index({ category: 1, isDeleted: 1 });
ProductSchema.index({ brand: 1, isDeleted: 1 });
ProductSchema.index({ price: 1 });
ProductSchema.index({ isActive: 1, isDeleted: 1 });
