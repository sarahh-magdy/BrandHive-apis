import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  readonly _id: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'Order', required: true })
  order: Types.ObjectId;

  @Prop({ type: Number, required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: String, required: true, minlength: 10, maxlength: 1000, trim: true })
  comment: string;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });
ReviewSchema.index({ product: 1, isVisible: 1 });
ReviewSchema.index({ rating: 1 });