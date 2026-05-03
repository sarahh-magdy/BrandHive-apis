import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { AddressController } from './address.controller';
import { AddressService } from './address.service';
import { AddressFactoryService } from './factory';
import { AddressRepository } from '../../models/address/address.repository';
import { Address, AddressSchema } from '../../models/address/address.schema';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';

@Module({
  imports: [
    UserMongoModule,
    JwtModule,
    MongooseModule.forFeature([
      { name: Address.name, schema: AddressSchema },
    ]),
  ],
  controllers: [AddressController],
  providers: [AddressService, AddressFactoryService, AddressRepository],
  exports: [AddressService],
})
export class AddressModule {}