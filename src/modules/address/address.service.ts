import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { AddressRepository } from '../../models/address/address.repository';
import { AddressFactoryService } from './factory';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { calculateShippingFee } from '../../common/helpers/shipping.helper';

const MAX_ADDRESSES_PER_USER = 5;

@Injectable()
export class AddressService {
  constructor(
    private readonly addressRepository: AddressRepository,
    private readonly addressFactory: AddressFactoryService,
  ) {}

  // ════════════════════════════════════════════════════════════════
  // GET ALL USER ADDRESSES
  // ════════════════════════════════════════════════════════════════
  async getUserAddresses(userId: string) {
    const addresses = await this.addressRepository.getUserAddresses(userId);
    return { data: addresses };
  }

  // ════════════════════════════════════════════════════════════════
  // GET ONE ADDRESS
  // ════════════════════════════════════════════════════════════════
  async getOne(addressId: string, userId: string) {
    const address = await this.addressRepository.getOne({
      _id: new Types.ObjectId(addressId),
      user: new Types.ObjectId(userId),
    });
    if (!address) throw new NotFoundException('Address not found');
    return { data: address };
  }

  // ════════════════════════════════════════════════════════════════
  // ADD ADDRESS
  // ════════════════════════════════════════════════════════════════
  async addAddress(userId: string, dto: CreateAddressDto) {
    // ─── Max addresses limit ──────────────────────────────────
    const count = await this.addressRepository.countDocuments({
      user: new Types.ObjectId(userId),
    });
    if (count >= MAX_ADDRESSES_PER_USER) {
      throw new BadRequestException(
        `Maximum ${MAX_ADDRESSES_PER_USER} addresses allowed`,
      );
    }

    // ─── If setting as default → reset others ─────────────────
    if (dto.isDefault) {
      await this.addressRepository.resetDefaultForUser(userId);
    }

    // ─── If first address → auto set as default ───────────────
    const isFirstAddress = count === 0;
    const entity = this.addressFactory.build(
      { ...dto, isDefault: isFirstAddress || (dto.isDefault ?? false) },
      userId,
    );

    const created = await this.addressRepository.create({ ...entity });
    return { message: 'Address added successfully', data: created };
  }

  // ════════════════════════════════════════════════════════════════
  // UPDATE ADDRESS
  // ════════════════════════════════════════════════════════════════
  async updateAddress(addressId: string, userId: string, dto: UpdateAddressDto) {
    const address = await this.addressRepository.getOne({
      _id: new Types.ObjectId(addressId),
      user: new Types.ObjectId(userId),
    });
    if (!address) throw new NotFoundException('Address not found');

    // ─── If setting as default → reset others ─────────────────
    if (dto.isDefault) {
      await this.addressRepository.resetDefaultForUser(userId);
    }

    const updated = await this.addressRepository.updateOne(
      { _id: new Types.ObjectId(addressId), user: new Types.ObjectId(userId) },
      { ...dto },
      { new: true },
    );

    return { message: 'Address updated successfully', data: updated };
  }

  // ════════════════════════════════════════════════════════════════
  // DELETE ADDRESS
  // ════════════════════════════════════════════════════════════════
  async deleteAddress(addressId: string, userId: string) {
    const address = await this.addressRepository.getOne({
      _id: new Types.ObjectId(addressId),
      user: new Types.ObjectId(userId),
    });
    if (!address) throw new NotFoundException('Address not found');

    await this.addressRepository.delete({
      _id: new Types.ObjectId(addressId),
      user: new Types.ObjectId(userId),
    });

    // ─── If deleted was default → set another as default ──────
    if ((address as any).isDefault) {
      const remaining = await this.addressRepository.getUserAddresses(userId);
      if (remaining.length > 0) {
        await this.addressRepository.updateOne(
          { _id: (remaining[0] as any)._id },
          { isDefault: true },
          { new: true },
        );
      }
    }

    return { message: 'Address deleted successfully' };
  }

  // ════════════════════════════════════════════════════════════════
  // SET DEFAULT
  // ════════════════════════════════════════════════════════════════
  async setDefault(addressId: string, userId: string) {
    const address = await this.addressRepository.getOne({
      _id: new Types.ObjectId(addressId),
      user: new Types.ObjectId(userId),
    });
    if (!address) throw new NotFoundException('Address not found');

    await this.addressRepository.resetDefaultForUser(userId);
    await this.addressRepository.updateOne(
      { _id: new Types.ObjectId(addressId) },
      { isDefault: true },
      { new: true },
    );

    return { message: 'Default address updated' };
  }

  // ════════════════════════════════════════════════════════════════
  // CALCULATE SHIPPING FEE (preview)
  // ════════════════════════════════════════════════════════════════
  async getShippingFee(addressId: string, userId: string, subtotal: number) {
    const address = await this.addressRepository.getOne({
      _id: new Types.ObjectId(addressId),
      user: new Types.ObjectId(userId),
    });
    if (!address) throw new NotFoundException('Address not found');

    const fee = calculateShippingFee(subtotal, (address as any).governorate);
    return {
      data: {
        shippingFee: fee,
        governorate: (address as any).governorate,
        isFreeShipping: fee === 0,
      },
    };
  }

  // ─── Helper: used by OrderService ─────────────────────────────
  async getAddressById(addressId: string, userId: string) {
    const address = await this.addressRepository.getOne({
      _id: new Types.ObjectId(addressId),
      user: new Types.ObjectId(userId),
    });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }
}