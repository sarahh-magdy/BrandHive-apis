import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, CancelOrderDto } from './dto/update-order-status.dto';
import { GetOrdersDto } from './dto/get-orders.dto';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { User } from '@common/decorators/user.decorator';

@Controller('orders')
@UseGuards(AuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  // ────────────────────────────────────────────────────────────────
  // Customer
  // ────────────────────────────────────────────────────────────────

  @Post()
  @Auth(['Customer'])
  createOrder(@User() user: any, @Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(user._id, dto);
  }

  @Get('my-orders')
  @Auth(['Customer'])
  getMyOrders(@User() user: any, @Query() query: GetOrdersDto) {
    return this.orderService.getUserOrders(user._id, query);
  }

  @Get('my-orders/count')
  @Auth(['Customer'])
  getMyOrderCount(@User() user: any) {
    return this.orderService.getOrderCount(user._id);
  }

  @Get('my-orders/:id')
  @Auth(['Customer'])
  getMyOrderDetails(@Param('id') id: string, @User() user: any) {
    return this.orderService.getOrderDetails(id, user._id, 'Customer');
  }

  @Post('my-orders/:id/cancel')
  @Auth(['Customer'])
  cancelOrder(
    @Param('id') id: string,
    @User() user: any,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orderService.cancelOrder(id, user._id, 'Customer', dto);
  }

  @Post('my-orders/:id/reorder')
  @Auth(['Customer'])
  reOrder(@Param('id') id: string, @User() user: any) {
    return this.orderService.reOrder(id, user._id);
  }

  @Get('my-orders/:id/invoice')
  @Auth(['Customer'])
  getMyInvoice(@Param('id') id: string, @User() user: any) {
    return this.orderService.getInvoice(id, user._id, 'Customer');
  }

  // ────────────────────────────────────────────────────────────────
  // Admin
  // ────────────────────────────────────────────────────────────────

  @Get('admin/all')
  @Auth(['Admin'])
  getAllOrders(@Query() query: GetOrdersDto) {
    return this.orderService.getAllOrders(query);
  }

  @Get('admin/:id')
  @Auth(['Admin'])
  getOrderDetails(@Param('id') id: string, @User() user: any) {
    return this.orderService.getOrderDetails(id, user._id, 'Admin');
  }

  @Patch('admin/:id/status')
  @Auth(['Admin'])
  updateOrderStatus(
    @Param('id') id: string,
    @User() user: any,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(id, dto, user._id);
  }

  @Post('admin/:id/cancel')
  @Auth(['Admin'])
  adminCancelOrder(
    @Param('id') id: string,
    @User() user: any,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orderService.cancelOrder(id, user._id, 'Admin', dto);
  }

  @Get('admin/:id/invoice')
  @Auth(['Admin'])
  getInvoice(@Param('id') id: string, @User() user: any) {
    return this.orderService.getInvoice(id, user._id, 'Admin');
  }
}