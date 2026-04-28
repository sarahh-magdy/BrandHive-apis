import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ _id: false })
class ReviewImage {
  @Prop({ required: true })
  url: string;

  @Prop()
  alt: string;
}
const ReviewImageSchema = SchemaFactory.createForClass(ReviewImage);

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  /**
   * Verified Purchase — orderId proves the user actually bought the product.
   * Set during creation by checking order history.
   */
  @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
  orderId: Types.ObjectId | null;

  @Prop({ default: false })
  isVerifiedPurchase: boolean;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true, minlength: 10, maxlength: 1000 })
  comment: string;

  @Prop({ maxlength: 120 })
  title: string;

  @Prop({ type: [ReviewImageSchema], default: [] })
  images: ReviewImage[];

  /** Helpful votes (users can upvote a review) */
  @Prop({ default: 0 })
  helpfulCount: number;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  helpfulVoters: Types.ObjectId[];

  /** Admin can hide a review without deleting */
  @Prop({ default: true })
  isVisible: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  /** Admin reply to the review */
  @Prop()
  adminReply: string;

  @Prop()
  adminRepliedAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// ── Indexes ──────────────────────────────────────────────────────────────────
// One review per user per product (enforced at DB level)
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
ReviewSchema.index({ productId: 1, rating: -1 });
ReviewSchema.index({ productId: 1, createdAt: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });