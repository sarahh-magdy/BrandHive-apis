import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BrandRequestDocument = BrandRequest & Document;

export enum BrandRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class BrandRequest {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  storeName: string;

  @Prop()
  businessInfo: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ enum: BrandRequestStatus, default: BrandRequestStatus.PENDING })
  status: BrandRequestStatus;

  @Prop()
  rejectionReason: string;
}

export const BrandRequestSchema = SchemaFactory.createForClass(BrandRequest);