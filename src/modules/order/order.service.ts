import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { OrderRepository } from '../../models/order/order.repository';
import { CartService } from '../cart/cart.service';
import { NotificationService } from '../notification/notification.service';
import { AddressService } from '../address/address.service';
import { CouponService } from '../coupon/coupon.service';
import { InventoryService } from '../inventory/inventory.service';
import { PaymentService } from '../payment/payment.service';
import { OrderFactoryService } from './factory';
import { sendMail } from '../../common/helpers/send-mail.helper';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, CancelOrderDto } from './dto/update-order-status.dto';
import { GetOrdersDto } from './dto/get-orders.dto';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../../models/order/order.schema';

const NON_CANCELABLE = [
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELED,
];

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELED],
  [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELED]: [],
};

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly cartService: CartService,
    private readonly notificationService: NotificationService,
    private readonly addressService: AddressService,
    private readonly couponService: CouponService,
    private readonly inventoryService: InventoryService,
    private readonly paymentService: PaymentService,
    private readonly orderFactoryService: OrderFactoryService,
    private readonly configService: ConfigService,
  ) { }

  // ════════════════════════════════════════════════════════════════
  // CREATE ORDER
  // ════════════════════════════════════════════════════════════════
  async createOrder(userId: string, dto: CreateOrderDto) {

    // ─── Resolve address ──────────────────────────────────────
    let resolvedAddress: any;
    if (dto.addressId) {
      resolvedAddress = await this.addressService.getAddressById(dto.addressId, userId);
    } else if (dto.shippingAddress) {
      resolvedAddress = dto.shippingAddress;
    } else {
      throw new BadRequestException('Provide addressId or shippingAddress');
    }

    // ─── Get cart ─────────────────────────────────────────────
    const cartSummary = await this.cartService.getCartForOrder(userId);

    if (!cartSummary?.items?.length) {
      throw new BadRequestException('Cart is empty');
    }

    // ─── Resolve coupon ───────────────────────────────────────
    let couponData: { couponId: string; couponCode: string; couponDiscount: number } | null = null;
    if (dto.couponCode) {
      try {
        couponData = await this.couponService.applyCouponOnCart(
          dto.couponCode, userId, cartSummary.subtotal,
        );
      } catch (e) {
        throw new BadRequestException(e.message);
      }
    }

    const enrichedCart = {
      ...cartSummary,
      couponSaving: couponData?.couponDiscount ?? cartSummary.couponSaving ?? 0,
      couponCode: couponData?.couponCode ?? cartSummary.couponCode ?? null,
    };

    // ─── Build & save order ───────────────────────────────────
    const orderEntity = this.orderFactoryService.buildOrder(
      { ...dto, shippingAddress: resolvedAddress },
      userId,
      enrichedCart,
    );
    const created = await this.orderRepository.create({ ...orderEntity });

    // ─── Reduce stock AFTER order is created ─────────────────
    for (const item of cartSummary.items) {
      await this.inventoryService.reduceStock(
        item.product.id,
        item.quantity,
        (created as any)._id.toString(),
        userId,
      );
    }

    // ─── Increment coupon usage ───────────────────────────────
    if (couponData?.couponId) {
      await this.couponService.incrementUsage(couponData.couponId, userId);
    }

    // ─── Clear cart ───────────────────────────────────────────
    await this.cartService.clearCart(userId);

    // ─── Init payment via PaymentService ─────────────────────
    const paymentResult = await this.paymentService.initPayment(created);

    // ─── COD → auto confirm ───────────────────────────────────
    if (dto.paymentMethod === PaymentMethod.COD) {
      await this.changeStatus(
        (created as any)._id.toString(),
        { status: OrderStatus.CONFIRMED, note: 'COD order auto-confirmed' },
        null, true,
      );
    }

    // ─── Send order email async ───────────────────────────────
    const populated = await this.orderRepository.findOnePopulated({
      _id: (created as any)._id,
    });
    this.buildAndSendInvoice(populated).catch(console.error);

    // ─── Notification ─────────────────────────────────────────
    await this.notificationService.create({
      user: userId,
      type: 'order_placed',
      title: 'Order Placed 🎉',
      body: `Your order #${(created as any).orderNumber} has been placed.`,
      data: { orderId: (created as any)._id.toString() },
    });

    // ─── Return populated ─────────────────────────────────────
    const response: any = { message: 'Order created successfully', data: populated };
    if (paymentResult?.paymentUrl) response.paymentUrl = paymentResult.paymentUrl;
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
      throw new BadRequestException(`Cannot cancel: ${(order as any).status}`);
    }

    // ─── Restore stock ────────────────────────────────────────
    for (const item of (order as any).items) {
      await this.inventoryService.restoreStock(
        item.product.toString(),
        item.quantity,
        orderId,
        userId,
      );
    }

    // ─── Decrement coupon usage ───────────────────────────────
    if ((order as any).couponCode) {
      try {
        const coupon = await this.couponService.validateAndGetCoupon(
          (order as any).couponCode, userId, 0,
        );
        if (coupon) {
          await this.couponService.decrementUsage((coupon as any)._id.toString(), userId);
        }
      } catch { /* ignore */ }
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
      type: 'order_canceled',
      title: 'Order Canceled',
      body: `Order #${(order as any).orderNumber} canceled.`,
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
    if (dto.status === OrderStatus.SHIPPED) updates.shippedAt = new Date();
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

    const notifMap: Record<string, { type: string; title: string; body: string }> = {
      [OrderStatus.CONFIRMED]: { type: 'order_confirmed', title: 'Order Confirmed ✅', body: `Order #${(order as any).orderNumber} confirmed.` },
      [OrderStatus.SHIPPED]: { type: 'order_shipped', title: 'Order Shipped 🚚', body: `Order #${(order as any).orderNumber} shipped!` },
      [OrderStatus.DELIVERED]: { type: 'order_delivered', title: 'Order Delivered 🎉', body: `Order #${(order as any).orderNumber} delivered.` },
    };

    const notif = notifMap[dto.status];
    if (notif) {
      await this.notificationService.create({
        user: (order as any).user.toString(),
        ...notif,
        data: { orderId },
      });
    }

    return { message: `Order updated to "${dto.status}"` };
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
        ? `Added. Unavailable: ${errors.join(', ')}`
        : 'All items added to cart',
    };
  }

  // ════════════════════════════════════════════════════════════════
  // GET INVOICE
  // ════════════════════════════════════════════════════════════════
  async getInvoice(orderId: string, userId: string, role: string) {
    const filter: Record<string, any> = { _id: new Types.ObjectId(orderId) };
    if (role !== 'Admin') filter.user = new Types.ObjectId(userId);

    const order = await this.orderRepository.findOnePopulated(filter);
    if (!order) throw new NotFoundException('Order not found');

    // ─── FIXED: بيرجع order data مباشرة بدل PDF ────────────────
    return {
      data: {
        orderNumber: (order as any).orderNumber,
        message: 'Invoice details sent to your email',
      },
    };
  }

  // ════════════════════════════════════════════════════════════════
  // ORDER COUNT
  // ════════════════════════════════════════════════════════════════
  async getOrderCount(userId: string) {
    const count = await this.orderRepository.countDocuments({
      user: new Types.ObjectId(userId),
    });
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

  // ─── Private: Send Order Email ────────────────────────────────
  private async buildAndSendInvoice(order: any) {
    try {
      const email = order?.user?.email;
      if (!email) return;

      sendMail({
        to: email,
        subject: `Order Confirmed #${order.orderNumber} - Brand Hive`,
        html: `
          <div style="font-family:Arial,sans-serif;padding:24px;max-width:600px;margin:0 auto">
            <h2 style="color:#333">Thank you for your order! 🎉</h2>
            <p>Order Number: <b>#${order.orderNumber}</b></p>
            <p>Date: <b>${new Date(order.createdAt).toLocaleDateString()}</b></p>

            <h3 style="border-bottom:1px solid #eee;padding-bottom:8px">Items</h3>
            ${(order.items ?? []).map((item: any) => `
              <div style="display:flex;justify-content:space-between;margin-bottom:8px">
                <span>${item.productName} × ${item.quantity}</span>
                <span>EGP ${(item.itemTotal ?? 0).toFixed(2)}</span>
              </div>
            `).join('')}

            <div style="border-top:1px solid #eee;margin-top:16px;padding-top:16px">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                <span>Subtotal</span>
                <span>EGP ${(order.subtotal ?? 0).toFixed(2)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                <span>Shipping</span>
                <span>EGP ${(order.shippingFee ?? 0).toFixed(2)}</span>
              </div>
              ${(order.discount ?? 0) > 0 ? `
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;color:#27ae60">
                <span>Discount</span>
                <span>-EGP ${(order.discount ?? 0).toFixed(2)}</span>
              </div>` : ''}
              <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:16px;margin-top:8px;border-top:1px solid #333;padding-top:8px">
                <span>Total</span>
                <span>EGP ${(order.total ?? 0).toFixed(2)}</span>
              </div>
            </div>

            <h3 style="border-bottom:1px solid #eee;padding-bottom:8px;margin-top:24px">Shipping Address</h3>
            <p style="color:#555;margin:4px 0">${order.shippingAddress?.fullName ?? ''}</p>
            <p style="color:#555;margin:4px 0">${order.shippingAddress?.phone ?? ''}</p>
            <p style="color:#555;margin:4px 0">${order.shippingAddress?.street ?? ''}, ${order.shippingAddress?.city ?? ''}</p>
            <p style="color:#555;margin:4px 0">${order.shippingAddress?.governorate ?? ''}, ${order.shippingAddress?.country ?? 'Egypt'}</p>

            <p style="color:#999;font-size:12px;margin-top:32px;text-align:center">
              Thank you for shopping with Brand Hive!
            </p>
          </div>
        `,
      });
    } catch (e) {
      console.error('Email error:', e?.message);
    }
  }
}