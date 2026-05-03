import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { AddressEntity } from '../entities/address.entity';
import { CreateAddressDto } from '../dto/address.dto';

@Injectable()
export class AddressFactoryService {
  build(dto: CreateAddressDto, userId: string): AddressEntity {
    const address = new AddressEntity();
    (address as any)._id = new Types.ObjectId();
    address.user = new Types.ObjectId(userId);
    address.fullName = dto.fullName;
    address.phone = dto.phone;
    address.street = dto.street;
    address.city = dto.city;
    address.governorate = dto.governorate;
    address.postalCode = dto.postalCode ?? null;
    address.country = dto.country ?? 'Egypt';
    address.isDefault = dto.isDefault ?? false;
    address.label = dto.label ?? 'Home';
    return address;
  }
}