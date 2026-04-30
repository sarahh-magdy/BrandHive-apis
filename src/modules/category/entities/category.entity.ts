import { Types } from 'mongoose';

export class Category {
  readonly _id: Types.ObjectId;
  name: string;
  slug: string;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  logo?: {
    url: string;
    publicId: string;
  };
  isDeleted: boolean;
  deletedBy: Types.ObjectId;
  deletedAt: Date;
}