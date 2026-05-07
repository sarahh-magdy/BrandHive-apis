import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { User } from '@common/decorators/user.decorator';

@Controller('addresses')
@UseGuards(AuthGuard, RolesGuard)
@Auth(['Customer'])
export class AddressController {
  constructor(private readonly addressService: AddressService) { }

  // GET /addresses
  @Get()
  getUserAddresses(@User() user: any) {
    return this.addressService.getUserAddresses(user._id);
  }

  // GET /addresses/:id
  @Get(':id')
  getOne(@Param('id') id: string, @User() user: any) {
    return this.addressService.getOne(id, user._id);
  }

  // POST /addresses
  @Post()
  addAddress(@User() user: any, @Body() dto: CreateAddressDto) {
    return this.addressService.addAddress(user._id, dto);
  }

  // PUT /addresses/:id
  @Put(':id')
  updateAddress(
    @Param('id') id: string,
    @User() user: any,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressService.updateAddress(id, user._id, dto);
  }

  // DELETE /addresses/:id
  @Delete(':id')
  deleteAddress(@Param('id') id: string, @User() user: any) {
    return this.addressService.deleteAddress(id, user._id);
  }

  // PATCH /addresses/:id/default
  @Patch(':id/default')
  setDefault(@Param('id') id: string, @User() user: any) {
    return this.addressService.setDefault(id, user._id);
  }

  // GET /addresses/:id/shipping-fee?subtotal=500
  @Get(':id/shipping-fee')
  getShippingFee(
    @Param('id') id: string,
    @User() user: any,
    @Query('subtotal') subtotal: number,
  ) {
    return this.addressService.getShippingFee(id, user._id, +subtotal || 0);
  }
}