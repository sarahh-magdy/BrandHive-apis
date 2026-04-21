import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminGetOrdersDto, GetOrdersDto } from './dto/get-orders.dto';
import { OrderEntity, PaginatedOrdersEntity } from './entities/order.entity';

/**
 * Adjust these guard imports to match your auth setup:
 * import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
 * import { RolesGuard } from '../auth/guards/roles.guard';
 * import { Roles } from '../auth/decorators/roles.decorator';
 */
// Placeholder guards — replace with your actual ones:
const JwtAuthGuard: any = class {};
const RolesGuard: any = class {};
const Roles = (...roles: string[]) => () => {};

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ──────────────────────────────────────────────────────────────
  // USER ENDPOINTS
  // ──────────────────────────────────────────────────────────────

  /**
   * POST /orders
   * Create order from active cart
   */
  @Post()
  @ApiOperation({ summary: 'Create order from cart' })
  @ApiResponse({ status: 201, type: OrderEntity })
  async createOrder(@Req() req: any, @Body() dto: CreateOrderDto) {
    /**
     * Inject CartService, ProductService, etc. via constructor DI.
     * They're passed here as params for clarity — in production they'd be
     * injected into the service via constructor.
     */
    return this.orderService.createOrder(
      req.user._id,
      dto,
      req.cartService,     // replace with DI
      req.productService,  // replace with DI
      req.couponService,   // optional
      req.userService,     // optional
      req.notificationService, // optional
    );
  }

  /**
   * GET /orders
   * Get current user's orders (paginated + filtered)
   */
  @Get()
  @ApiOperation({ summary: 'Get my orders' })
  @ApiResponse({ status: 200, type: PaginatedOrdersEntity })
  async getMyOrders(@Req() req: any, @Query() dto: GetOrdersDto) {
    return this.orderService.getUserOrders(req.user._id, dto);
  }

  /**
   * GET /orders/count
   * Order counts per status — useful for dashboard badges
   */
  @Get('count')
  @ApiOperation({ summary: 'Get order counts per status for the current user' })
  async getOrderCount(@Req() req: any) {
    return this.orderService.getUserOrderCount(req.user._id);
  }

  /**
   * GET /orders/track/:orderNumber
   * Public-style tracking — returns lifecycle without sensitive data
   */
  @Get('track/:orderNumber')
  @ApiOperation({ summary: 'Track order by order number' })
  @ApiParam({ name: 'orderNumber', example: 'ORD-20240115-0001' })
  async trackOrder(@Req() req: any, @Param('orderNumber') orderNumber: string) {
    return this.orderService.trackOrder(orderNumber, req.user._id);
  }

  /**
   * GET /orders/:id
   * Get full order details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID' })
  @ApiResponse({ status: 200, type: OrderEntity })
  async getOrderDetails(@Req() req: any, @Param('id') id: string) {
    return this.orderService.getOrderDetails(id, req.user._id);
  }

  /**
   * PATCH /orders/:id/cancel
   * User cancels their own order (only if not shipped yet)
   */
  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an order' })
  @ApiResponse({ status: 200, type: OrderEntity })
  async cancelOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    return this.orderService.cancelOrder(id, req.user._id, false, note);
  }

  /**
   * POST /orders/:id/reorder
   * Re-add all items from a previous order to cart
   */
  @Post(':id/reorder')
  @ApiOperation({ summary: 'Re-order — add all items from a past order to cart' })
  async reorder(@Req() req: any, @Param('id') id: string) {
    return this.orderService.reorder(
      id,
      req.user._id,
      req.cartService,    // replace with DI
      req.productService, // replace with DI
    );
  }

  /**
   * GET /orders/:id/invoice
   * Generate or retrieve existing invoice PDF
   */
  @Get(':id/invoice')
  @ApiOperation({ summary: 'Get/generate invoice PDF for an order' })
  async getInvoice(@Req() req: any, @Param('id') id: string) {
    return this.orderService.generateInvoice(id, req.user._id, false, req.userService);
  }

  /**
   * POST /orders/:id/retry-payment
   * Retry payment for a failed online payment order
   */
  @Post(':id/retry-payment')
  @ApiOperation({ summary: 'Retry payment for a failed online payment order' })
  async retryPayment(@Req() req: any, @Param('id') id: string) {
    return this.orderService.retryPayment(id, req.user._id);
  }

  // ──────────────────────────────────────────────────────────────
  // SELLER ENDPOINTS
  // ──────────────────────────────────────────────────────────────

  /**
   * GET /orders/seller/my
   * Seller sees only orders containing their products
   */
  @Get('seller/my')
  @ApiOperation({ summary: '[Seller] Get orders containing my products' })
  @ApiResponse({ status: 200, type: PaginatedOrdersEntity })
  async getSellerOrders(@Req() req: any, @Query() dto: GetOrdersDto) {
    return this.orderService.getSellerOrders(req.user._id, dto);
  }

  // ──────────────────────────────────────────────────────────────
  // ADMIN ENDPOINTS
  // ──────────────────────────────────────────────────────────────

  /**
   * GET /orders/admin/all
   * Admin: get all orders with full filters
   */
  @Get('admin/all')
  // @UseGuards(RolesGuard)
  // @Roles('admin')
  @ApiOperation({ summary: '[Admin] Get all orders' })
  @ApiResponse({ status: 200, type: PaginatedOrdersEntity })
  async adminGetAllOrders(@Query() dto: AdminGetOrdersDto) {
    return this.orderService.adminGetAllOrders(dto);
  }

  /**
   * GET /orders/stats
   * Admin: revenue & order statistics
   */
  @Get('admin/stats')
  // @UseGuards(RolesGuard)
  // @Roles('admin')
  @ApiOperation({ summary: '[Admin] Get order statistics & revenue dashboard' })
  async getAdminStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.orderService.getAdminStats(from, to);
  }

  /**
   * PATCH /orders/admin/:id/status
   * Admin updates order status (full lifecycle control)
   */
  @Patch('admin/:id/status')
  // @UseGuards(RolesGuard)
  // @Roles('admin')
  @ApiOperation({ summary: '[Admin] Update order status' })
  @ApiResponse({ status: 200, type: OrderEntity })
  async updateOrderStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateOrderStatus(id, dto, req.user._id);
  }

  /**
   * PATCH /orders/admin/:id/cancel
   * Admin force-cancels any order
   */
  @Patch('admin/:id/cancel')
  // @UseGuards(RolesGuard)
  // @Roles('admin')
  @ApiOperation({ summary: '[Admin] Force cancel any order' })
  async adminCancelOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body('note') note?: string,
  ) {
    return this.orderService.cancelOrder(id, req.user._id, true, note);
  }

  /**
   * GET /orders/admin/:id/invoice
   * Admin generates invoice for any order
   */
  @Get('admin/:id/invoice')
  // @UseGuards(RolesGuard)
  // @Roles('admin')
  @ApiOperation({ summary: '[Admin] Get/generate invoice for any order' })
  async adminGetInvoice(@Req() req: any, @Param('id') id: string) {
    return this.orderService.generateInvoice(id, req.user._id, true, req.userService);
  }
}