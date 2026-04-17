import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ default: [] })
  wishlist: string[];

  @Prop({ default: [] })
  addresses: {
    street: string;
    city: string;
    country: string;
    isDefault: boolean;
  }[];
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);