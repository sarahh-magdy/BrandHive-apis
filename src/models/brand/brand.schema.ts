import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Brand {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  readonly _id: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, unique: true, trim: true })
  slug: string;

  @Prop({ type: String, trim: true, default: null })
  description: string;

  @Prop({ type: String, trim: true, default: null })
  country: string;

  @Prop({ type: String, trim: true, default: null })
  website: string;

  @Prop({
    type: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },
    default: null,
  })
  logo: { url: string; publicId: string } | null;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'Category' }], default: [] })
  categories: Types.ObjectId[];

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
      totalProducts: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      totalReviews: { type: Number, default: 0 },
      totalSales: { type: Number, default: 0 },
    },
    default: () => ({
      totalProducts: 0,
      averageRating: 0,
      totalReviews: 0,
      totalSales: 0,
    }),
  })
  stats: {
    totalProducts: number;
    averageRating: number;
    totalReviews: number;
    totalSales: number;
  };
}

export const BrandSchema = SchemaFactory.createForClass(Brand);

BrandSchema.index({ name: 'text', slug: 'text' });
BrandSchema.index({ isDeleted: 1, isActive: 1 });
BrandSchema.index({ slug: 1, isDeleted: 1 });
BrandSchema.index({ categories: 1 });