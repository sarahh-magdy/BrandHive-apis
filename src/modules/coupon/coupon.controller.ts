import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CouponService } from './coupon.service';
import { CreateCouponDto, UpdateCouponDto, ValidateCouponDto } from './dto/coupon.dto';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { User } from '@common/decorators/user.decorator';

@Controller('coupons')
@UseGuards(AuthGuard, RolesGuard)
export class CouponController {
  constructor(private readonly couponService: CouponService) { }

  // ────────────────────────────────────────────────────────────────
  // admin Routes
  // ────────────────────────────────────────────────────────────────

  // POST /coupons
  @Post()
  @Auth(['admin'])
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponService.createCoupon(dto);
  }

  // GET /coupons/admin/all
  @Get('admin/all')
  @Auth(['admin'])
  getAllCoupons(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('isActive') isActive?: string,
  ) {
    const activeFilter =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.couponService.getAllCoupons(+page, +limit, activeFilter);
  }

  // GET /coupons/admin/:id
  @Get('admin/:id')
  @Auth(['admin'])
  getOne(@Param('id') id: string) {
    return this.couponService.getOne(id);
  }

  // PUT /coupons/:id
  @Put(':id')
  @Auth(['admin'])
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.updateCoupon(id, dto);
  }

  // DELETE /coupons/:id
  @Delete(':id')
  @Auth(['admin'])
  deleteCoupon(@Param('id') id: string) {
    return this.couponService.deleteCoupon(id);
  }

  // ────────────────────────────────────────────────────────────────
  // customer Routes
  // ────────────────────────────────────────────────────────────────

  // POST /coupons/validate
  @Post('validate')
  @Auth(['customer'])
  validateCoupon(@Body() dto: ValidateCouponDto, @User() user: any) {
    return this.couponService.validateCoupon(dto, user._id);
  }
}