import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';
import { BrandRequestStatus } from '../../modules/brand/entities/brand-reruest.entity';

@Schema({ timestamps: true })
export class BrandRequest {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  readonly _id: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true, default: null })
  description: string;

  @Prop({ type: String, trim: true, default: null })
  country: string;

  @Prop({ type: String, trim: true, default: null })
  website: string;

  @Prop({ type: Object, default: null })
  logo: object;

  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'Category' }], default: [] })
  categories: Types.ObjectId[];

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', required: true })
  requestedBy: Types.ObjectId;

  @Prop({
    type: String,
    enum: BrandRequestStatus,
    default: BrandRequestStatus.PENDING,
  })
  status: BrandRequestStatus;

  @Prop({ type: String, default: null })
  rejectionReason: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null })
  reviewedBy: Types.ObjectId;

  @Prop({ type: Date, default: null })
  reviewedAt: Date;
}

export const BrandRequestSchema = SchemaFactory.createForClass(BrandRequest);

BrandRequestSchema.index({ status: 1 });
BrandRequestSchema.index({ requestedBy: 1 });