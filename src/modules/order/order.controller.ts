import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminGetOrdersDto, GetOrdersDto } from './dto/get-orders.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../models/common/user.schema'; // باين في الصورة إنه جوه models/common

// استيراد الخدمات المطلوبة لتمريرها للسيرفس
import { CartService } from '../cart/cart.service';
import { ProductService } from '../product/product.service';
// import { CouponService } from '../coupon/coupon.service'; // فكي الكومنت لو السيرفس دي جاهزة
// import { UserService } from '../user/user.service';     // فكي الكومنت لو السيرفس دي جاهزة

@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)
export class OrderController {
  constructor(
    private readonly orderService: OrderService,
    private readonly cartService: CartService,
    private readonly productService: ProductService,
    // private readonly couponService: CouponService,
    // private readonly userService: UserService,
  ) {}

  // ════════════════════════════════════════════════════════════════
  // CREATE ORDER (User)
  // ════════════════════════════════════════════════════════════════
  @Post()
  async createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    const userId = req.user.userId; // تأكدي إن التوكن فيه userId أو id

    // هنا بنمرر كل الخدمات اللي الـ Service محتاجها في الـ Parameters
    return this.orderService.createOrder(
      userId,
      dto,
      this.cartService,
      this.productService,
      // this.couponService, // مرريها لو موجودة
      // this.userService,   // مرريها لو موجودة
    );
  }

  // ════════════════════════════════════════════════════════════════
  // GET USER ORDERS (User)
  // ════════════════════════════════════════════════════════════════
  @Get('my-orders')
  async getUserOrders(@Req() req: any, @Query() dto: GetOrdersDto) {
    return this.orderService.getUserOrders(req.user.userId, dto);
  }

  // ════════════════════════════════════════════════════════════════
  // ADMIN: GET ALL ORDERS
  // ════════════════════════════════════════════════════════════════
  @Get('admin/all')
  @Roles([UserRole.ADMIN])
  async adminGetAllOrders(@Query() dto: AdminGetOrdersDto) {
    return this.orderService.adminGetAllOrders(dto);
  }

  // ════════════════════════════════════════════════════════════════
  // GET ORDER DETAILS
  // ════════════════════════════════════════════════════════════════
  @Get(':id')
  async getOrderDetails(@Param('id') id: string, @Req() req: any) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    return this.orderService.getOrderDetails(id, req.user.userId, isAdmin);
  }

  // ════════════════════════════════════════════════════════════════
  // CANCEL ORDER
  // ════════════════════════════════════════════════════════════════
  @Patch(':id/cancel')
  async cancelOrder(@Param('id') id: string, @Req() req: any) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    return this.orderService.cancelOrder(
      id, 
      req.user.userId, 
      isAdmin, 
      'Canceled by user',
      this.productService // بنمررها عشان يرجع المخزون
    );
  }

  // ════════════════════════════════════════════════════════════════
  // ADMIN: UPDATE STATUS
  // ════════════════════════════════════════════════════════════════
  @Patch(':id/status')
@Roles([UserRole.ADMIN])
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: any
  ) {
    return this.orderService.updateOrderStatus(id, dto, req.user.userId);
  }
}