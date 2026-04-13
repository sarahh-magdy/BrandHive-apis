import { Types } from 'mongoose';

export class Category {
  readonly _id: Types.ObjectId;
  name: string;
  slug: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  logo: object;
  isDeleted: boolean;
  deletedBy: Types.ObjectId;
  deletedAt: Date;
}