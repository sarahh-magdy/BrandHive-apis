import { Types } from 'mongoose';


export class Brand {
  readonly _id: Types.ObjectId;
  name: string;
  slug: string;

  description?: string | null;
  country?: string | null;
  website?: string | null;
  logo?: any | null;

  categories: Types.ObjectId[];

  isActive: boolean;
  isDeleted: boolean;

  deletedBy?: Types.ObjectId | null;
  deletedAt?: Date | null;

  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;

  stats: {
    totalProducts: number;
    averageRating: number;
    totalReviews: number;
    totalSales: number;
  };
}

