import { SchemaTypes, Types } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class Category {
  @Prop({ type: Types.ObjectId })
  readonly _id: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true, trim: true })
  name: string;

  @Prop({ type: String, required: true, unique: true, trim: true })
  slug: string;

  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: 'Admin' })
  createdBy: Types.ObjectId;

  @Prop({ type: SchemaTypes.ObjectId, required: true, ref: 'User' })
  updatedBy: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User', default: null })
  deletedBy: Types.ObjectId;

  @Prop({ type: Date, default: null })
  deletedAt: Date;

  @Prop({ type: Object, default: null })
  logo: object;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ name: 'text', slug: 'text' });
CategorySchema.index({ isDeleted: 1 });
CategorySchema.index({ slug: 1, isDeleted: 1 });