import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '../abstract.repository';
import { Address } from './address.schema';

@Injectable()
export class AddressRepository extends AbstractRepository<Address> {
  constructor(
    @InjectModel(Address.name) private readonly addressModel: Model<Address>,
  ) {
    super(addressModel);
  }

  async getUserAddresses(userId: string) {
    return this.addressModel
      .find({ user: userId })
      .sort({ isDefault: -1, createdAt: -1 })
      .lean()
      .exec();
  }

  // ─── Reset all user defaults before setting a new one ─────────
  async resetDefaultForUser(userId: string) {
    await this.addressModel.updateMany(
      { user: userId, isDefault: true },
      { isDefault: false },
    );
  }
}