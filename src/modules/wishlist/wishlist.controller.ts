import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { AddToWishlistDto, MoveToCartDto, MoveAllToCartDto } from './dto/wishlist.dto';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { User } from '@common/decorators/user.decorator';

@Controller('wishlist')
@UseGuards(AuthGuard, RolesGuard)
@Auth(['Customer'])
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  //  GET /wishlist 
  @Get()
  async getWishlist(@User() user: any) {
    return this.wishlistService.getWishlist(user._id);
  }

  //  GET /wishlist/count 
  // بيجيب عدد الـ items فقط (للـ navbar badge)
  @Get('count')
  async getWishlistCount(@User() user: any) {
    return this.wishlistService.getWishlistCount(user._id);
  }

  //  GET /wishlist/check/:productId 
  // بيتحقق لو المنتج في الـ wishlist أو لأ
  @Get('check/:productId')
  async isInWishlist(@User() user: any, @Param('productId') productId: string) {
    return this.wishlistService.isInWishlist(user._id, productId);
  }

  //  POST /wishlist 
  @Post()
  async addToWishlist(@User() user: any, @Body() dto: AddToWishlistDto) {
    return this.wishlistService.addToWishlist(user._id, dto);
  }

  //  DELETE /wishlist/:productId 
  @Delete(':productId')
  async removeFromWishlist(
    @User() user: any,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeFromWishlist(user._id, productId);
  }

  //  DELETE /wishlist 
  @Delete()
  async clearWishlist(@User() user: any) {
    return this.wishlistService.clearWishlist(user._id);
  }

  //  POST /wishlist/move-to-cart/:productId 
  // ينقل منتج واحد من الـ wishlist للـ cart
  @Post('move-to-cart/:productId')
  async moveToCart(
    @User() user: any,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.moveToCart(user._id, productId);
  }

  //  POST /wishlist/move-all-to-cart 
  @Post('move-all-to-cart')
  async moveAllToCart(@User() user: any, @Body() dto: MoveAllToCartDto) {
    return this.wishlistService.moveAllToCart(user._id, dto);
  }
}