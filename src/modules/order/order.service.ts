import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { OrderRepository } from '../../models/order/order.repository';
import { ProductRepository } from '../../models/product/product.repository';
import { CartService } from '../cart/cart.service';
import { NotificationService } from '../notification/notification.service';
import { OrderFactoryService } from './factory';
import { sendMail } from '../../common/helpers/send-mail.helper';
import { generateInvoicePDF } from '../../common/helpers/invoice.helper';
import {
  initPaymobPayment, initFawryPayment,
  verifyPayment, PaymentGateway,
} from '../../common/helpers/payment.helper';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, CancelOrderDto } from './dto/update-order-status.dto';
import { GetOrdersDto } from './dto/get-orders.dto';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../models/order/order.schema';
import { PaymentInitResult, PaymentVerifyResult } from '../../common/helpers/payment.helper';
import { NotificationType } from '../../models/notification/notification.schema';

const NON_CANCELABLE = [OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELED];

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]:   [OrderStatus.CONFIRMED, OrderStatus.CANCELED],
  [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED,   OrderStatus.CANCELED],
  [OrderStatus.SHIPPED]:   [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELED]:  [],
};

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productRepository: ProductRepository,
    private readonly cartService: CartService,
    private readonly notificationService: NotificationService,
    private readonly orderFactoryService: OrderFactoryService,
    private readonly configService: ConfigService,
  ) {}

  // ════════════════════════════════════════════════════════════════
  // CREATE ORDER
  // ════════════════════════════════════════════════════════════════
  async createOrder(userId: string, dto: CreateOrderDto) {
    // ─── Get cart with final stock validation ─────────────────
    const cartSummary = await this.cartService.getCartForOrder(userId);

    // ─── Validate stock & reduce ──────────────────────────────
    for (const item of cartSummary.items) {
      const product = await this.productRepository.getOne({
        _id: new Types.ObjectId(item.product.id),
        isDeleted: false,
        isActive: true,
      });
      if (!product) {
        throw new BadRequestException(`"${item.product.name}" is no longer available`);
      }
      if ((product as any).stock < item.quantity) {
        throw new BadRequestException(
          `Only ${(product as any).stock} units left for "${item.product.name}"`,
        );
      }
      await this.productRepository.updateOne(
        { _id: (product as any)._id },
        { $inc: { stock: -item.quantity } },
        { new: true },
      );
    }

    // ─── Build & save order ───────────────────────────────────
    const orderEntity = this.orderFactoryService.buildOrder(dto, userId, cartSummary);
    const created = await this.orderRepository.create({ ...orderEntity });

    // ─── Clear cart ───────────────────────────────────────────
    await this.cartService.clearCart(userId);

    // ─── Handle online payment ────────────────────────────────
    let paymentUrl: string | null = null;

    if (dto.paymentMethod === PaymentMethod.PAYMOB) {
      const result = await initPaymobPayment(created);
      if (result.success) {
        paymentUrl = result.paymentUrl ?? null;
        await this.orderRepository.updateOne(
          { _id: (created as any)._id },
          { paymentTransactionId: result.transactionId },
          { new: true },
        );
      }
    } else if (dto.paymentMethod === PaymentMethod.FAWRY) {
      const result = await initFawryPayment(created);
      if (result.success) {
       paymentUrl = result.paymentUrl ?? null;
        await this.orderRepository.updateOne(
          { _id: (created as any)._id },
          { paymentTransactionId: result.transactionId },
          { new: true },
        );
      }
    } else {
      // COD → auto confirm
      await this.changeStatus(
        (created as any)._id.toString(),
        { status: OrderStatus.CONFIRMED, note: 'COD order auto-confirmed' },
        null,
        true,
      );
    }

    // ─── Invoice (async — don't block response) ───────────────
    const populated = await this.orderRepository.findOnePopulated({ _id: (created as any)._id });
    this.buildAndSendInvoice(populated, userId).catch(console.error);

    // ─── Notification ─────────────────────────────────────────
    await this.notificationService.create({
      user: userId,
      type: NotificationType.ORDER_PLACED,
      title: 'Order Placed 🎉',
      body: `Your order #${(created as any).orderNumber} has been placed.`,
      data: { orderId: (created as any)._id.toString() },
    });

    const response: any = { message: 'Order created successfully', data: created };
    if (paymentUrl) response.paymentUrl = paymentUrl;
    return response;
  }

  // ════════════════════════════════════════════════════════════════
  // GET MY ORDERS
  // ════════════════════════════════════════════════════════════════
  async getUserOrders(userId: string, query: GetOrdersDto) {
    const { page = 1, limit = 10, status, paymentStatus, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = { user: new Types.ObjectId(userId) };

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.orderRepository.findWithPaginationPopulated(filter, { skip, limit }),
      this.orderRepository.countDocuments(filter),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ════════════════════════════════════════════════════════════════
  // GET ORDER DETAILS
  // ════════════════════════════════════════════════════════════════
  async getOrderDetails(orderId: string, userId: string, role: string) {
    const filter: Record<string, any> = { _id: new Types.ObjectId(orderId) };
    if (role !== 'Admin') filter.user = new Types.ObjectId(userId);

    const order = await this.orderRepository.findOnePopulated(filter);
    if (!order) throw new NotFoundException('Order not found');
    return { data: order };
  }

  // ════════════════════════════════════════════════════════════════
  // CANCEL ORDER
  // ════════════════════════════════════════════════════════════════
  async cancelOrder(orderId: string, userId: string, role: string, dto: CancelOrderDto) {
    const filter: Record<string, any> = { _id: new Types.ObjectId(orderId) };
    if (role !== 'Admin') filter.user = new Types.ObjectId(userId);

    const order = await this.orderRepository.getOne(filter);
    if (!order) throw new NotFoundException('Order not found');

    if (NON_CANCELABLE.includes((order as any).status)) {
      throw new BadRequestException(
        `Cannot cancel an order with status: ${(order as any).status}`,
      );
    }

    // ─── Restore stock ────────────────────────────────────────
    for (const item of (order as any).items) {
      await this.productRepository.updateOne(
        { _id: item.product },
        { $inc: { stock: item.quantity } },
        { new: true },
      );
    }

    await this.orderRepository.updateOne(
      { _id: new Types.ObjectId(orderId) },
      {
        status: OrderStatus.CANCELED,
        cancelReason: dto.reason,
        canceledBy: new Types.ObjectId(userId),
        canceledAt: new Date(),
        $push: {
          statusHistory: {
            status: OrderStatus.CANCELED,
            changedAt: new Date(),
            note: dto.reason,
            changedBy: new Types.ObjectId(userId),
          },
        },
      },
      { new: true },
    );

await this.notificationService.create({
  user: (order as any).user.toString(),
  type: NotificationType.ORDER_CANCELED,
  title: 'Order Canceled',
  body: `Order #${(order as any).orderNumber} has been canceled.`,
  data: { orderId },
});
    return { message: 'Order canceled successfully' };
  }

  // ════════════════════════════════════════════════════════════════
  // UPDATE ORDER STATUS (Admin)
  // ════════════════════════════════════════════════════════════════
  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto, adminId: string) {
    return this.changeStatus(orderId, dto, adminId, false);
  }

  private async changeStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    adminId: string | null,
    skipValidation: boolean,
  ) {
    const order = await this.orderRepository.getOne({ _id: new Types.ObjectId(orderId) });
    if (!order) throw new NotFoundException('Order not found');

    const current = (order as any).status as OrderStatus;

    if (!skipValidation) {
      const allowed = VALID_TRANSITIONS[current] ?? [];
      if (!allowed.includes(dto.status)) {
        throw new BadRequestException(
          `Cannot transition from "${current}" to "${dto.status}"`,
        );
      }
    }

    const updates: Record<string, any> = {
      status: dto.status,
      $push: {
        statusHistory: {
          status: dto.status,
          changedAt: new Date(),
          note: dto.note ?? null,
          changedBy: adminId ? new Types.ObjectId(adminId) : null,
        },
      },
    };

    if (dto.status === OrderStatus.CONFIRMED) updates.confirmedAt = new Date();
    if (dto.status === OrderStatus.SHIPPED)   updates.shippedAt = new Date();
    if (dto.status === OrderStatus.DELIVERED) {
      updates.deliveredAt = new Date();
      updates.paymentStatus = PaymentStatus.PAID;
      updates.paidAt = new Date();
    }

    await this.orderRepository.updateOne(
      { _id: new Types.ObjectId(orderId) },
      updates,
      { new: true },
    );

const notifMap: Partial<
  Record<OrderStatus, { type: NotificationType; title: string; body: string }>
> = {
  [OrderStatus.CONFIRMED]: {
    type: NotificationType.ORDER_CONFIRMED,
    title: 'Order Confirmed ✅',
    body: `Order #${(order as any).orderNumber} confirmed.`,
  },
  [OrderStatus.SHIPPED]: {
    type: NotificationType.ORDER_SHIPPED,
    title: 'Order Shipped 🚚',
    body: `Order #${(order as any).orderNumber} is on the way!`,
  },
  [OrderStatus.DELIVERED]: {
    type: NotificationType.ORDER_DELIVERED,
    title: 'Order Delivered 🎉',
    body: `Order #${(order as any).orderNumber} delivered.`,
  },
};

    const notif = notifMap[dto.status];
    if (notif) {
      await this.notificationService.create({
        user: (order as any).user.toString(),
        ...notif,
        data: { orderId },
      });
    }

    return { message: `Order status updated to "${dto.status}"` };
  }

  // ════════════════════════════════════════════════════════════════
  // RE-ORDER
  // ════════════════════════════════════════════════════════════════
  async reOrder(orderId: string, userId: string) {
    const order = await this.orderRepository.getOne({
      _id: new Types.ObjectId(orderId),
      user: new Types.ObjectId(userId),
    });
    if (!order) throw new NotFoundException('Order not found');

    const errors: string[] = [];
    for (const item of (order as any).items) {
      try {
        await this.cartService.addToCart(userId, {
          productId: item.product.toString(),
          quantity: item.quantity,
        });
      } catch {
        errors.push(item.productName);
      }
    }

    return {
      message: errors.length
        ? `Added to cart. Unavailable: ${errors.join(', ')}`
        : 'All items added to cart',
    };
  }

  // ════════════════════════════════════════════════════════════════
  // GET INVOICE (on-demand)
  // ════════════════════════════════════════════════════════════════
  async getInvoice(orderId: string, userId: string, role: string) {
    const filter: Record<string, any> = { _id: new Types.ObjectId(orderId) };
    if (role !== 'Admin') filter.user = new Types.ObjectId(userId);

    const order = await this.orderRepository.findOnePopulated(filter);
    if (!order) throw new NotFoundException('Order not found');

    if (!(order as any).invoiceUrl) {
      const path = await generateInvoicePDF(order);
      await this.orderRepository.updateOne(
        { _id: new Types.ObjectId(orderId) },
        { invoiceUrl: path },
        { new: true },
      );
      return { data: { invoiceUrl: `${this.configService.get('APP_URL')}/uploads/${path}` } };
    }

    return {
      data: {
        invoiceUrl: `${this.configService.get('APP_URL')}/uploads/${(order as any).invoiceUrl}`,
      },
    };
  }

  // ════════════════════════════════════════════════════════════════
  // PAYMENT WEBHOOK
  // ════════════════════════════════════════════════════════════════
  async verifyPaymentWebhook(gateway: string, transactionId: string) {
    const result = await verifyPayment(gateway as PaymentGateway, transactionId);
    if (!result.paid) return { message: 'Payment not confirmed' };

    const order = await this.orderRepository.getOne({ paymentTransactionId: transactionId });
    if (!order) return { message: 'Order not found' };

    await this.orderRepository.updateOne(
      { _id: (order as any)._id },
      { paymentStatus: PaymentStatus.PAID, paidAt: new Date() },
      { new: true },
    );

    await this.changeStatus(
      (order as any)._id.toString(),
      { status: OrderStatus.CONFIRMED, note: 'Payment verified' },
      null,
      true,
    );

    return { message: 'Payment verified' };
  }

  // ════════════════════════════════════════════════════════════════
  // ORDER COUNT
  // ════════════════════════════════════════════════════════════════
  async getOrderCount(userId: string) {
    const count = await this.orderRepository.countDocuments({ user: new Types.ObjectId(userId) });
    return { data: { count } };
  }

  // ════════════════════════════════════════════════════════════════
  // ADMIN: ALL ORDERS
  // ════════════════════════════════════════════════════════════════
  async getAllOrders(query: GetOrdersDto) {
    const { page = 1, limit = 10, status, paymentStatus, search, dateFrom, dateTo } = query;
    const skip = (page - 1) * limit;
    const filter: Record<string, any> = {};

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (search) filter.orderNumber = { $regex: search, $options: 'i' };
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    const [data, total] = await Promise.all([
      this.orderRepository.findWithPaginationPopulated(filter, { skip, limit }),
      this.orderRepository.countDocuments(filter),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── Private: Build & Email Invoice ───────────────────────────
  private async buildAndSendInvoice(order: any, userId: string) {
    try {
      const invoicePath = await generateInvoicePDF(order);
      await this.orderRepository.updateOne(
        { _id: order._id },
        { invoiceUrl: invoicePath, invoiceSent: true },
        { new: true },
      );

      const email = order?.user?.email;
      if (email) {
        const url = `${this.configService.get('APP_URL')}/uploads/${invoicePath}`;
        await sendMail({
          to: email,
          subject: `Invoice for Order #${order.orderNumber} - Brand Hive`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:24px">
              <h2>Thank you for your order! 🎉</h2>
              <p>Order: <b>#${order.orderNumber}</b></p>
              <p>Total: <b>EGP ${order.total?.toFixed(2)}</b></p>
              <a href="${url}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#333;color:#fff;text-decoration:none;border-radius:6px">
                Download Invoice
              </a>
            </div>
          `,
        });
      }
    } catch (e) {
      console.error('Invoice error:', e?.message);
    }
  }
}