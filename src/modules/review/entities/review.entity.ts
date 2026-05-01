import { Types } from 'mongoose';

export class ReviewEntity {
  readonly _id: Types.ObjectId;
  user: Types.ObjectId;
  product: Types.ObjectId;
  order: Types.ObjectId;
  rating: number;
  comment: string;
  isVisible: boolean;
}