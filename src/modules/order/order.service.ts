import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { OrderRepository } from '../../models/order/order.repository';
import {
  Order,
  OrderDocument,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../models/order/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminGetOrdersDto, GetOrdersDto } from './dto/get-orders.dto';
import { buildOrderFromCart, buildStatusHistoryEntry } from './factory';
import { calculateShippingFee } from '../../common/helpers/shipping.helper';
import {
  generateInvoicePdf,
  generateInvoiceNumber,
} from '../../common/helpers/invoice.helper';

/**
 * These interfaces represent what you'd import from your Cart / Product / Coupon / User modules.
 * Replace with actual service imports when integrating.
 */
interface ICartService {
  getActiveCart(userId: string): Promise<any>;
  clearCart(userId: string): Promise<void>;
}

interface IProductService {
  findById(productId: string): Promise<any>;
  reduceStock(productId: string, qty: number): Promise<void>;
}

interface ICouponService {
  validateAndApply(
    code: string,
    userId: string,
    subtotal: number,
  ): Promise<{
    discountAmount: number;
    type: 'percentage' | 'fixed';
    value: number;
  }>;
  markUsed(code: string, userId: string): Promise<void>;
}

interface INotificationService {
  send(event: string, payload: any): Promise<void>;
}

interface IUserService {
  findById(userId: string): Promise<any>;
  getDefaultAddress(userId: string): Promise<any>;
}

/** Valid lifecycle transitions */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELED],
  [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELED]: [],
};

const TAX_RATE = 0; // Set to e.g. 0.14 for 14% VAT if needed

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    // Inject your other services here — shown as tokens for flexibility:
    // @Inject(CART_SERVICE) private cartService: ICartService,
    // @Inject(PRODUCT_SERVICE) private productService: IProductService,
    // @Inject(COUPON_SERVICE) private couponService: ICouponService,
    // @Inject(NOTIFICATION_SERVICE) private notificationService: INotificationService,
    // @Inject(USER_SERVICE) private userService: IUserService,
  ) {}

  // ─────────────────────────────────────────────────────────────
  // CREATE ORDER
  // ─────────────────────────────────────────────────────────────

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
    // These would come from real DI — stubbed for now:
    cartService: ICartService,
    productService: IProductService,
    couponService?: ICouponService,
    userService?: IUserService,
    notificationService?: INotificationService,
  ): Promise<OrderDocument> {
    // 1. Get cart
    const cart = await cartService.getActiveCart(userId);
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cannot create order with an empty cart');
    }

    // 2. Stock validation + price locking
    for (const cartItem of cart.items) {
      const product = await productService.findById(String(cartItem.productId));
      if (!product) {
        throw new NotFoundException(`Product ${cartItem.productId} not found`);
      }
      if (product.stock < cartItem.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}`,
        );
      }
    }

    // 3. Resolve shipping address
    let shippingAddress = dto.shippingAddress;
    if (!shippingAddress && dto.savedAddressId && userService) {
      const savedAddress = await userService.getDefaultAddress(userId);
      if (!savedAddress) {
        throw new BadRequestException('No shipping address found. Please provide one.');
      }
      shippingAddress = savedAddress;
    }
    if (!shippingAddress) {
      throw new BadRequestException('Shipping address is required');
    }

    // 4. Calculate subtotal (price locked from cart)
    const subtotal = cart.items.reduce(
      (acc: number, item: any) => acc + item.price * item.quantity,
      0,
    );

    // 5. Shipping fee
    const { fee: shippingFee } = calculateShippingFee({
      governorate: shippingAddress.governorate,
      subtotal,
    });

    // 6. Coupon / Discount
    let discount = 0;
    let couponSnapshot: any = null;
    if (dto.couponCode && couponService) {
      const couponResult = await couponService.validateAndApply(
        dto.couponCode,
        userId,
        subtotal,
      );
      discount = couponResult.discountAmount;
      couponSnapshot = {
        code: dto.couponCode,
        discountAmount: discount,
        type: couponResult.type,
        value: couponResult.value,
      };
    }

    // 7. Tax
    const tax = parseFloat(((subtotal - discount) * TAX_RATE).toFixed(2));

    // 8. Build and persist order
    const orderNumber = await this.orderRepository.generateOrderNumber();
    const orderData = buildOrderFromCart({
      userId: new Types.ObjectId(userId),
      orderNumber,
      cartItems: cart.items,
      shippingAddress,
      pricing: { subtotal, shippingFee, discount, tax },
      paymentMethod: dto.paymentMethod,
      coupon: couponSnapshot,
      notes: dto.notes,
      changedBy: new Types.ObjectId(userId),
    });

    const order = await this.orderRepository.create(orderData);

    // 9. Reduce stock (after successful order creation)
    for (const cartItem of cart.items) {
      await productService.reduceStock(String(cartItem.productId), cartItem.quantity);
    }

    // 10. Clear cart
    await cartService.clearCart(userId);

    // 11. Mark coupon as used
    if (dto.couponCode && couponService) {
      await couponService.markUsed(dto.couponCode, userId);
    }

    // 12. Notify
    if (notificationService) {
      await notificationService.send('order.placed', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId,
        total: order.pricing.total,
      });
    }

    return order;
  }

  // ─────────────────────────────────────────────────────────────
  // GET USER ORDERS (with pagination + filters)
  // ─────────────────────────────────────────────────────────────

  async getUserOrders(userId: string, dto: GetOrdersDto) {
    const filters = this.buildFilters(dto);
    const sort = this.buildSort(dto);

    const { data, total } = await this.orderRepository.findByUser(
      userId,
      filters,
      { page: dto.page!, limit: dto.limit!, sort },
    );

    return this.paginatedResponse(data, total, dto.page!, dto.limit!);
  }

  // ─────────────────────────────────────────────────────────────
  // GET ORDER DETAILS
  // ─────────────────────────────────────────────────────────────

  async getOrderDetails(orderId: string, userId: string, isAdmin = false): Promise<OrderDocument> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    if (!isAdmin && String(order.userId) !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  // ─────────────────────────────────────────────────────────────
  // ORDER STATUS TRACKING (public-facing — no sensitive data)
  // ─────────────────────────────────────────────────────────────

  async trackOrder(orderNumber: string, userId: string) {
    const order = await this.orderRepository.findByOrderNumber(orderNumber);
    if (!order) throw new NotFoundException('Order not found');
    if (String(order.userId) !== userId) throw new ForbiddenException('Access denied');

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      statusHistory: order.statusHistory,
      estimatedDelivery: this.estimateDelivery(order.status, order.createdAt),
    };
  }

  // ─────────────────────────────────────────────────────────────
  // CANCEL ORDER
  // ─────────────────────────────────────────────────────────────

  async cancelOrder(
    orderId: string,
    userId: string,
    isAdmin = false,
    note?: string,
    productService?: IProductService,
    notificationService?: INotificationService,
  ): Promise<OrderDocument> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    if (!isAdmin && String(order.userId) !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Cannot cancel after shipping
    if (order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot cancel an order that has already been shipped or delivered');
    }

    if (order.status === OrderStatus.CANCELED) {
      throw new BadRequestException('Order is already canceled');
    }

    const historyEntry = buildStatusHistoryEntry(
      OrderStatus.CANCELED,
      note ?? 'Canceled by user',
      new Types.ObjectId(userId),
    );

    const updated = await this.orderRepository.update(orderId, {
      status: OrderStatus.CANCELED,
      $push: { statusHistory: historyEntry },
    });

    // Restore stock
    if (productService) {
      for (const item of order.items) {
        await productService.reduceStock(String(item.productId), -item.quantity);
      }
    }

    if (notificationService) {
      await notificationService.send('order.canceled', {
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId: String(order.userId),
      });
    }

    return updated!;
  }

  // ─────────────────────────────────────────────────────────────
  // UPDATE STATUS (Admin / System)
  // ─────────────────────────────────────────────────────────────

  async updateOrderStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    adminId: string,
    notificationService?: INotificationService,
  ): Promise<OrderDocument> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const allowed = ALLOWED_TRANSITIONS[order.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid transition: ${order.status} → ${dto.status}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const historyEntry = buildStatusHistoryEntry(
      dto.status,
      dto.note,
      new Types.ObjectId(adminId),
    );

    const updated = await this.orderRepository.update(orderId, {
      status: dto.status,
      $push: { statusHistory: historyEntry },
    });

    if (notificationService) {
      await notificationService.send(`order.${dto.status}`, {
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId: String(order.userId),
        status: dto.status,
      });
    }

    return updated!;
  }

  // ─────────────────────────────────────────────────────────────
  // RE-ORDER
  // ─────────────────────────────────────────────────────────────

  async reorder(
    orderId: string,
    userId: string,
    cartService: ICartService,
    productService: IProductService,
  ): Promise<{ addedItems: string[]; outOfStockItems: string[] }> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (String(order.userId) !== userId) throw new ForbiddenException('Access denied');

    const addedItems: string[] = [];
    const outOfStockItems: string[] = [];

    for (const item of order.items) {
      const product = await productService.findById(String(item.productId));
      if (!product || product.stock < 1) {
        outOfStockItems.push(item.name);
        continue;
      }

      // Add to cart — implementation depends on your cart service API
      // await cartService.addItem(userId, { productId: item.productId, quantity: item.quantity });
      addedItems.push(item.name);
    }

    return { addedItems, outOfStockItems };
  }

  // ─────────────────────────────────────────────────────────────
  // INVOICE GENERATION
  // ─────────────────────────────────────────────────────────────

  async generateInvoice(
    orderId: string,
    userId: string,
    isAdmin = false,
    userService?: IUserService,
  ): Promise<{ pdfUrl: string; invoiceNumber: string }> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (!isAdmin && String(order.userId) !== userId) throw new ForbiddenException('Access denied');

    // Return existing invoice if already generated
    if (order.invoice?.pdfUrl) {
      return { pdfUrl: order.invoice.pdfUrl, invoiceNumber: order.invoice.invoiceNumber! };
    }

    const user = userService ? await userService.findById(userId) : { name: 'Customer', email: '', phone: '' };
    const invoiceNumber = generateInvoiceNumber(order.orderNumber);

    const { pdfUrl } = await generateInvoicePdf({
      orderNumber: order.orderNumber,
      invoiceNumber,
      createdAt: order.createdAt,
      customer: {
        name: user?.name ?? 'Customer',
        email: user?.email ?? '',
        phone: user?.phone ?? order.shippingAddress.phone,
      },
      shippingAddress: order.shippingAddress,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      pricing: order.pricing,
      couponCode: order.coupon?.code,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    });

    await this.orderRepository.update(orderId, {
      invoice: { invoiceNumber, generatedAt: new Date(), pdfUrl },
    });

    return { pdfUrl, invoiceNumber };
  }

  // ─────────────────────────────────────────────────────────────
  // ORDER COUNT (UX / Dashboard)
  // ─────────────────────────────────────────────────────────────

  async getUserOrderCount(userId: string): Promise<Record<string, number>> {
    const { data } = await this.orderRepository.findByUser(userId, {}, { page: 1, limit: 1 });
    const counts: Record<string, number> = {};

    for (const status of Object.values(OrderStatus)) {
      const { total } = await this.orderRepository.findByUser(
        userId,
        { status },
        { page: 1, limit: 1 },
      );
      counts[status] = total;
    }

    return counts;
  }

  // ─────────────────────────────────────────────────────────────
  // ADMIN — ALL ORDERS
  // ─────────────────────────────────────────────────────────────

  async adminGetAllOrders(dto: AdminGetOrdersDto) {
    const filters: any = this.buildFilters(dto);
    if (dto.userId) filters.userId = dto.userId;
    if (dto.sellerId) filters['items.sellerId'] = dto.sellerId;

    const sort = this.buildSort(dto);
    const { data, total } = await this.orderRepository.findAll(filters, {
      page: dto.page!,
      limit: dto.limit!,
      sort,
    });

    return this.paginatedResponse(data, total, dto.page!, dto.limit!);
  }

  // ─────────────────────────────────────────────────────────────
  // ADMIN — STATS
  // ─────────────────────────────────────────────────────────────

  async getAdminStats(from?: string, to?: string) {
    const [byStatus, revenue] = await Promise.all([
      this.orderRepository.countByStatus(),
      this.orderRepository.revenueStats(),
    ]);

    let revenueByPeriod: any[] = [];
    if (from && to) {
      revenueByPeriod = await this.orderRepository.revenueByPeriod(
        new Date(from),
        new Date(to),
      );
    }

    return {
      byStatus,
      ...revenue,
      revenueByPeriod,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // SELLER — ORDERS FOR THEIR PRODUCTS
  // ─────────────────────────────────────────────────────────────

  async getSellerOrders(sellerId: string, dto: GetOrdersDto) {
    const filters = this.buildFilters(dto);
    const { data, total } = await this.orderRepository.findBySeller(sellerId, filters, {
      page: dto.page!,
      limit: dto.limit!,
    });

    return this.paginatedResponse(data, total, dto.page!, dto.limit!);
  }

  // ─────────────────────────────────────────────────────────────
  // PAYMENT — RETRY (Online payment placeholder)
  // ─────────────────────────────────────────────────────────────

  async retryPayment(orderId: string, userId: string): Promise<{ paymentUrl: string }> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');
    if (String(order.userId) !== userId) throw new ForbiddenException('Access denied');

    if (order.paymentMethod !== PaymentMethod.ONLINE) {
      throw new BadRequestException('Retry payment is only for online payment orders');
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    if (order.status === OrderStatus.CANCELED) {
      throw new BadRequestException('Cannot retry payment for a canceled order');
    }

    /**
     * TODO: Integrate with your payment gateway (Paymob, Fawry, Stripe, etc.)
     * Example:
     *   const { paymentUrl } = await this.paymobService.createPayment({ order });
     *   await this.orderRepository.update(orderId, { paymentUrl });
     *   return { paymentUrl };
     */

    // Placeholder
    const paymentUrl = `https://payment-gateway.example.com/pay/${order.orderNumber}`;
    await this.orderRepository.update(orderId, { paymentUrl });

    return { paymentUrl };
  }

  // ─────────────────────────────────────────────────────────────
  // HELPERS (private)
  // ─────────────────────────────────────────────────────────────

  private buildFilters(dto: GetOrdersDto): Record<string, any> {
    const filters: Record<string, any> = {};
    if (dto.status) filters.status = dto.status;
    if (dto.paymentStatus) filters.paymentStatus = dto.paymentStatus;
    if (dto.search) filters.orderNumber = { $regex: dto.search, $options: 'i' };
    if (dto.from || dto.to) {
      filters.createdAt = {};
      if (dto.from) filters.createdAt.$gte = new Date(dto.from);
      if (dto.to) filters.createdAt.$lte = new Date(dto.to);
    }
    return filters;
  }

  private buildSort(dto: GetOrdersDto): Record<string, 1 | -1> {
    const field = dto.sortBy ?? 'createdAt';
    const dir = dto.sortOrder === 'asc' ? 1 : -1;
    return { [field]: dir };
  }

  private paginatedResponse(
    data: any[],
    total: number,
    page: number,
    limit: number,
  ) {
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private estimateDelivery(status: OrderStatus, orderDate: Date): string | null {
    const estimate = new Date(orderDate);
    switch (status) {
      case OrderStatus.PENDING:
        estimate.setDate(estimate.getDate() + 5);
        break;
      case OrderStatus.CONFIRMED:
        estimate.setDate(estimate.getDate() + 4);
        break;
      case OrderStatus.SHIPPED:
        estimate.setDate(estimate.getDate() + 2);
        break;
      case OrderStatus.DELIVERED:
        return null;
      default:
        return null;
    }
    return estimate.toISOString().split('T')[0];
  }
}