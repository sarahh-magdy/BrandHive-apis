import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { OrderRepository } from '../../models/order/order.repository';
import {
  OrderDocument,
  OrderStatus,
} from '../../models/order/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminGetOrdersDto, GetOrdersDto } from './dto/get-orders.dto';
import { buildOrderFromCart, buildStatusHistoryEntry } from './factory';
import { calculateShippingFee } from '../../common/helpers/shipping.helper';

interface ICartService { getActiveCart(userId: string): Promise<any>; clearCart(userId: string): Promise<void>; }
interface IProductService { findById(productId: string): Promise<any>; reduceStock(productId: string, qty: number): Promise<void>; }
interface ICouponService { validateAndApply(code: string, userId: string, subtotal: number): Promise<any>; markUsed(code: string, userId: string): Promise<void>; }
interface INotificationService { send(event: string, payload: any): Promise<void>; }
interface IUserService { findById(userId: string): Promise<any>; getDefaultAddress(userId: string): Promise<any>; }

@Injectable()
export class OrderService {
  private readonly ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELED],
    [OrderStatus.CONFIRMED]: [OrderStatus.SHIPPED, OrderStatus.CANCELED],
    [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
    [OrderStatus.DELIVERED]: [],
    [OrderStatus.CANCELED]: [],
  };

  constructor(private readonly orderRepository: OrderRepository) {}

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
    cartService: ICartService,
    productService: IProductService,
    couponService?: ICouponService,
    userService?: IUserService,
    notificationService?: INotificationService,
  ): Promise<OrderDocument> {
    const cart = await cartService.getActiveCart(userId);
    if (!cart || !cart.items?.length) throw new BadRequestException('السلّة فارغة');

    for (const item of cart.items) {
      const product = await productService.findById(String(item.product));
      if (!product || product.stock < item.quantity) throw new BadRequestException(`مشكلة في مخزون ${product?.name}`);
    }

    let shippingAddress = dto.shippingAddress;
    if (!shippingAddress && dto.savedAddressId && userService) {
      shippingAddress = await userService.getDefaultAddress(userId);
    }
    if (!shippingAddress) throw new BadRequestException('عنوان الشحن مطلوب');

    const subtotal = cart.items.reduce((acc, item) => acc + (item.lockedDiscountPrice ?? item.lockedPrice) * item.quantity, 0);
    const { fee: shippingFee } = calculateShippingFee({ governorate: shippingAddress.governorate, subtotal });

    let discount = 0;
    let couponSnapshot: any = null; // الحل للخطأ رقم 3
    if (dto.couponCode && couponService) {
      const res = await couponService.validateAndApply(dto.couponCode, userId, subtotal);
      discount = res.discountAmount;
      couponSnapshot = { code: dto.couponCode, discountAmount: discount, type: res.type, value: res.value };
    }

    const orderNumber = await this.orderRepository.generateOrderNumber();
    const orderData = buildOrderFromCart({
      userId: new Types.ObjectId(userId),
      orderNumber,
      cartItems: cart.items,
      shippingAddress,
      pricing: { subtotal, shippingFee, discount, tax: 0 },
      paymentMethod: dto.paymentMethod,
      coupon: couponSnapshot,
      notes: dto.notes,
      changedBy: new Types.ObjectId(userId),
    });

    const order = await this.orderRepository.create(orderData);

    await Promise.all([
      ...cart.items.map(item => productService.reduceStock(String(item.product), item.quantity)),
      cartService.clearCart(userId),
      dto.couponCode && couponService ? couponService.markUsed(dto.couponCode, userId) : Promise.resolve(),
    ]);

    return order;
  }

  async adminGetAllOrders(dto: AdminGetOrdersDto) { // الحل للخطأ رقم 2
    const filters: any = this.buildFilters(dto);
    const sort = this.buildSort(dto);
    const { data, total } = await this.orderRepository.findAll(filters, {
      page: dto.page!,
      limit: dto.limit!,
      sort,
    });
    return this.paginatedResponse(data, total, dto.page!, dto.limit!);
  }

  async getUserOrders(userId: string, dto: GetOrdersDto) {
    const sort = this.buildSort(dto); // الحل للخطأ رقم 4
    const { data, total } = await this.orderRepository.findByUser(userId, this.buildFilters(dto), { 
      page: dto.page!, 
      limit: dto.limit!, 
      sort 
    });
    return this.paginatedResponse(data, total, dto.page!, dto.limit!);
  }

  async getOrderDetails(orderId: string, userId: string, isAdmin = false) {
    const order = await this.orderRepository.findById(orderId);
    if (!order || (!isAdmin && String(order.userId) !== userId)) throw new NotFoundException();
    return order;
  }

  async getUserOrderCount(userId: string) {
    const counts: any = {};
    for (const status of Object.values(OrderStatus)) {
      const { total } = await this.orderRepository.findByUser(userId, { status }, { page: 1, limit: 1 });
      counts[status] = total;
    }
    return counts;
  }

  async updateOrderStatus(orderId: string, dto: UpdateOrderStatusDto, adminId: string, notificationService?: INotificationService) {
    const order = await this.orderRepository.findById(orderId);
    if (!order) throw new NotFoundException('الطلب غير موجود');
    if (!this.ALLOWED_TRANSITIONS[order.status].includes(dto.status)) throw new BadRequestException('انتقال غير مسموح');
    return this.orderRepository.update(orderId, {
      status: dto.status,
      $push: { statusHistory: buildStatusHistoryEntry(dto.status, dto.note, new Types.ObjectId(adminId)) },
    });
  }

  async cancelOrder(orderId: string, userId: string, isAdmin = false, note?: string, productService?: IProductService) {
    const order = await this.orderRepository.findById(orderId);
    if (!order || (!isAdmin && String(order.userId) !== userId)) throw new ForbiddenException();
    if ([OrderStatus.SHIPPED, OrderStatus.DELIVERED].includes(order.status)) throw new BadRequestException('تم الشحن بالفعل');
    
    const updated = await this.orderRepository.update(orderId, {
      status: OrderStatus.CANCELED,
      $push: { statusHistory: buildStatusHistoryEntry(OrderStatus.CANCELED, note || 'Canceled', new Types.ObjectId(userId)) },
    });
    if (productService) await Promise.all(order.items.map(item => productService.reduceStock(String(item.productId), -item.quantity)));
    return updated!;
  }

  private buildFilters(dto: any) {
    const f: any = {};
    if (dto.status) f.status = dto.status;
    if (dto.search) f.orderNumber = { $regex: dto.search, $options: 'i' };
    return f;
  }

  private buildSort(dto: any): Record<string, 1 | -1> {
    const field = dto.sortBy || 'createdAt';
    const direction = dto.sortOrder === 'asc' ? 1 : -1;
    return { [field]: direction as 1 | -1 };
  }

  private paginatedResponse(data: any[], total: number, page: number, limit: number) {
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}