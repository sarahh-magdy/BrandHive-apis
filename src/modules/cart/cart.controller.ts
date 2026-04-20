import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartItemDto, ApplyCouponDto } from './dto/cart.dto';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { User } from '@common/decorators/user.decorator';

@Controller('cart')
@UseGuards(AuthGuard, RolesGuard)
// ─── Cart متاح لـ Customer فقط ────────────────────────────────────
@Auth(['Customer'])
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // ─── GET /cart ─────────────────────────────────────────────────
  @Get()
  async getCart(@User() user: any) {
    return this.cartService.getCart(user._id);
  }

  // ─── POST /cart/add ────────────────────────────────────────────
  @Post('add')
  async addToCart(@User() user: any, @Body() dto: AddToCartDto) {
    return this.cartService.addToCart(user._id, dto);
  }

  // ─── PATCH /cart/update ────────────────────────────────────────
  // quantity = 0 → removes the item automatically
  @Patch('update')
  async updateCartItem(@User() user: any, @Body() dto: UpdateCartItemDto) {
    return this.cartService.updateCartItem(user._id, dto);
  }

  // ─── DELETE /cart/remove/:productId ───────────────────────────
  @Delete('remove/:productId')
  async removeFromCart(@User() user: any, @Param('productId') productId: string) {
    return this.cartService.removeFromCart(user._id, productId);
  }

  // ─── DELETE /cart/clear ────────────────────────────────────────
  @Delete('clear')
  async clearCart(@User() user: any) {
    return this.cartService.clearCart(user._id);
  }

  // ─── POST /cart/coupon ─────────────────────────────────────────
  @Post('coupon')
  async applyCoupon(@User() user: any, @Body() dto: ApplyCouponDto) {
    return this.cartService.applyCoupon(user._id, dto.couponCode);
  }

  // ─── DELETE /cart/coupon ───────────────────────────────────────
  @Delete('coupon')
  async removeCoupon(@User() user: any) {
    return this.cartService.removeCoupon(user._id);
  }

  // ─── POST /cart/merge ──────────────────────────────────────────
  // Guest → logged in cart merge
  @Post('merge')
  async mergeCart(
    @User() user: any,
    @Body() body: { items: { productId: string; quantity: number }[] },
  ) {
    return this.cartService.mergeCart(user._id, body.items);
  }
}