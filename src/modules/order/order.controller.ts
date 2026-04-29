import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminGetOrdersDto, GetOrdersDto } from './dto/get-orders.dto';

// جربي المسارات المطلقة دي بتنهي مشاكل الـ Relative Paths
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../models/common/user.schema';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @Roles([UserRole.CUSTOMER]) // لاحظي القوسين [ ]
  @ApiOperation({ summary: 'Create order from cart' })
  async createOrder(@Req() req, @Body() dto: CreateOrderDto) {
    return this.orderService.createOrder(req.user._id, dto, (this as any).cartService, (this as any).productService);
  }

  @Get()
  @Roles([UserRole.CUSTOMER])
  async getMyOrders(@Req() req, @Query() dto: GetOrdersDto) {
    return this.orderService.getUserOrders(req.user._id, dto);
  }

  @Get('count')
  @Roles([UserRole.CUSTOMER])
  async getOrderCount(@Req() req) {
    return this.orderService.getUserOrderCount(req.user._id);
  }

  @Get(':id')
  async getOrderDetails(@Req() req, @Param('id') id: string) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    return this.orderService.getOrderDetails(id, req.user._id, isAdmin);
  }

  @Patch(':id/cancel')
  @Roles([UserRole.CUSTOMER, UserRole.ADMIN]) // مصفوفة واحدة فيها قيمتين
  async cancelOrder(@Req() req, @Param('id') id: string, @Body('note') note?: string) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    return this.orderService.cancelOrder(id, req.user._id, isAdmin, note);
  }

  @Patch('admin/:id/status')
  @Roles([UserRole.ADMIN])
  async updateOrderStatus(@Req() req, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orderService.updateOrderStatus(id, dto, req.user._id);
  }

  @Get('admin/all')
  @Roles([UserRole.ADMIN])
  async adminGetAllOrders(@Query() dto: AdminGetOrdersDto) {
    return this.orderService.adminGetAllOrders(dto);
  }
}