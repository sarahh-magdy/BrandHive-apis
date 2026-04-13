import { Types } from 'mongoose';

export enum BrandRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export class BrandRequest {
  readonly _id: Types.ObjectId;

  name: string;

  description?: string | null;
  country?: string | null;
  website?: string | null;
  logo?: any | null;

  categories: Types.ObjectId[];

  requestedBy: Types.ObjectId;

  status: BrandRequestStatus;

  rejectionReason?: string | null;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
}
