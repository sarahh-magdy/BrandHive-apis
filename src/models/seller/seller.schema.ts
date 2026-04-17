import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SellerDocument = Seller & Document;

@Schema({ timestamps: true })
export class Seller {
  @Prop({ required: true })
  storeName: string;

  @Prop()
  businessInfo: string;

  @Prop()
  storePhone: string;

  @Prop({ default: true })
  isStoreActive: boolean;
}

export const SellerSchema = SchemaFactory.createForClass(Seller);