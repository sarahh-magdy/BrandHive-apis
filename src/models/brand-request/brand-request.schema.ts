import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type BrandRequestDocument = BrandRequest & Document;

export enum BrandRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class BrandRequest {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true, default: null })
  description: string | null;

  @Prop({ type: String, trim: true, default: null })
  country: string | null;

  @Prop({ type: String, trim: true, default: null })
  website: string | null;

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

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  requestedBy: Types.ObjectId;

  @Prop({ type: String, trim: true, default: null })
  whatsappLink: string | null;

  @Prop({ type: Boolean, default: false })
  shipsInternationally: boolean;

  @Prop({ type: String, enum: BrandRequestStatus, default: BrandRequestStatus.PENDING })
  status: BrandRequestStatus;

  @Prop({ type: String, default: null })
  rejectionReason: string | null;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null })
  reviewedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  reviewedAt: Date | null;
}

export const BrandRequestSchema = SchemaFactory.createForClass(BrandRequest);

BrandRequestSchema.index({ status: 1 });
BrandRequestSchema.index({ requestedBy: 1 });
BrandRequestSchema.index({ name: 1, status: 1 });