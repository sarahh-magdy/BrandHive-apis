import { Types } from 'mongoose';

export class AddressEntity {
  readonly _id: Types.ObjectId;
  user: Types.ObjectId;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  governorate: string;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
  label: string;
}