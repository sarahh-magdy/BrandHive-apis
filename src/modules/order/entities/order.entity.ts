import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../../models/order/order.schema';

export class OrderItemEntity {
  @ApiProperty() productId: string;
  @ApiProperty() sellerId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() image?: string;
  @ApiProperty() quantity: number;
  @ApiProperty() unitPrice: number;
  @ApiProperty() totalPrice: number;
}

export class PriceSummaryEntity {
  @ApiProperty() subtotal: number;
  @ApiProperty() shippingFee: number;
  @ApiProperty() discount: number;
  @ApiProperty() tax: number;
  @ApiProperty() total: number;
}

export class ShippingAddressEntity {
  @ApiProperty() fullName: string;
  @ApiProperty() phone: string;
  @ApiProperty() street: string;
  @ApiProperty() city: string;
  @ApiProperty() governorate: string;
  @ApiPropertyOptional() postalCode?: string;
  @ApiProperty() country: string;
}

export class StatusHistoryEntity {
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty() changedAt: Date;
  @ApiPropertyOptional() note?: string;
}

export class InvoiceEntity {
  @ApiProperty() invoiceNumber: string;
  @ApiProperty() generatedAt: Date;
  @ApiPropertyOptional() pdfUrl?: string;
}

export class OrderEntity {
  @ApiProperty() _id: string;
  @ApiProperty() orderNumber: string;
  @ApiProperty() userId: string;
  @ApiProperty({ type: [OrderItemEntity] }) items: OrderItemEntity[];
  @ApiProperty({ type: ShippingAddressEntity }) shippingAddress: ShippingAddressEntity;
  @ApiProperty({ type: PriceSummaryEntity }) pricing: PriceSummaryEntity;
  @ApiProperty({ enum: OrderStatus }) status: OrderStatus;
  @ApiProperty({ enum: PaymentMethod }) paymentMethod: PaymentMethod;
  @ApiProperty({ enum: PaymentStatus }) paymentStatus: PaymentStatus;
  @ApiPropertyOptional({ type: StatusHistoryEntity, isArray: true })
  statusHistory?: StatusHistoryEntity[];
  @ApiPropertyOptional({ type: InvoiceEntity }) invoice?: InvoiceEntity;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class PaginatedOrdersEntity {
  @ApiProperty({ type: [OrderEntity] }) data: OrderEntity[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}