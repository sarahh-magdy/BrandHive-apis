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
  constructor(private readonly couponService: CouponService) {}

  // ────────────────────────────────────────────────────────────────
  // Admin Routes
  // ────────────────────────────────────────────────────────────────

  // POST /coupons
  @Post()
  @Auth(['Admin'])
  createCoupon(@Body() dto: CreateCouponDto) {
    return this.couponService.createCoupon(dto);
  }

  // GET /coupons/admin/all
  @Get('admin/all')
  @Auth(['Admin'])
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
  @Auth(['Admin'])
  getOne(@Param('id') id: string) {
    return this.couponService.getOne(id);
  }

  // PUT /coupons/:id
  @Put(':id')
  @Auth(['Admin'])
  updateCoupon(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.updateCoupon(id, dto);
  }

  // DELETE /coupons/:id
  @Delete(':id')
  @Auth(['Admin'])
  deleteCoupon(@Param('id') id: string) {
    return this.couponService.deleteCoupon(id);
  }

  // ────────────────────────────────────────────────────────────────
  // Customer Routes
  // ────────────────────────────────────────────────────────────────

  // POST /coupons/validate
  @Post('validate')
  @Auth(['Customer'])
  validateCoupon(@Body() dto: ValidateCouponDto, @User() user: any) {
    return this.couponService.validateCoupon(dto, user._id);
  }
}