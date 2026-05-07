import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymobProvider } from './providers/paymob.provider';
import { FawryProvider } from './providers/fawry.provider';
import { NotificationService } from '../notification/notification.service';
import { PaymentMethod, PaymentStatus } from '../../models/order/order.schema';

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        @InjectModel('Order') private readonly orderModel: Model<any>,
        private readonly paymobProvider: PaymobProvider,
        private readonly fawryProvider: FawryProvider,
        private readonly notificationService: NotificationService,
    ) { }

    // ════════════════════════════════════════════════════════════════
    // INIT PAYMENT — called after order creation
    // ════════════════════════════════════════════════════════════════
    async initPayment(order: any) {
        const method = order.paymentMethod as PaymentMethod;

        if (method === PaymentMethod.COD) {
            return { paymentUrl: null, transactionId: null };
        }

        const result = method === PaymentMethod.PAYMOB
            ? await this.paymobProvider.initPayment(order)
            : await this.fawryProvider.initPayment(order);

        if (result.success && result.transactionId) {
            await this.orderModel.findByIdAndUpdate(order._id, {
                paymentTransactionId: result.transactionId,
            });
        }

        return result;
    }

    // ════════════════════════════════════════════════════════════════
    // HANDLE WEBHOOK — called by payment gateway
    // ════════════════════════════════════════════════════════════════
    async handleWebhook(gateway: string, payload: any, hmac?: string) {
        this.logger.log(`[WEBHOOK] Gateway: ${gateway}`);

        // ─── Verify signature (Paymob HMAC) ───────────────────────
        if (gateway === 'paymob' && hmac) {
            const isValid = this.paymobProvider.verifyWebhookSignature(payload, hmac);
            if (!isValid) {
                this.logger.warn('[WEBHOOK] Invalid HMAC signature');
                return { message: 'Invalid signature' };
            }
        }

        // ─── Extract transaction ID based on gateway ───────────────
        const transactionId = gateway === 'paymob'
            ? payload?.obj?.id?.toString()
            : payload?.referenceNumber;

        if (!transactionId) {
            return { message: 'No transaction ID' };
        }

        // ─── Verify payment status ────────────────────────────────
        const result = gateway === 'paymob'
            ? await this.paymobProvider.verifyPayment(transactionId)
            : await this.fawryProvider.verifyPayment(transactionId);

        if (!result.paid) {
            // ─── Payment failed ────────────────────────────────────
            const order = await this.orderModel.findOne({ paymentTransactionId: transactionId });
            if (order) {
                await this.orderModel.findByIdAndUpdate(order._id, {
                    paymentStatus: PaymentStatus.FAILED,
                });

                await this.notificationService.create({
                    user: order.user.toString(),
                    type: 'general',
                    title: 'Payment Failed ❌',
                    body: `Payment for order #${order.orderNumber} failed. Please retry.`,
                    data: { orderId: order._id.toString() },
                });
            }
            return { message: 'Payment failed' };
        }

        // ─── Payment success ──────────────────────────────────────
        const order = await this.orderModel.findOne({
            paymentTransactionId: transactionId,
        });

        if (!order) {
            this.logger.warn(`[WEBHOOK] Order not found for transaction: ${transactionId}`);
            return { message: 'Order not found' };
        }

        // ─── Already paid guard ───────────────────────────────────
        if (order.paymentStatus === PaymentStatus.PAID) {
            return { message: 'Already processed' };
        }

        await this.orderModel.findByIdAndUpdate(order._id, {
            paymentStatus: PaymentStatus.PAID,
            paidAt: new Date(),
            status: 'confirmed',
            confirmedAt: new Date(),
            $push: {
                statusHistory: {
                    status: 'confirmed',
                    changedAt: new Date(),
                    note: `Payment confirmed via ${gateway}`,
                    changedBy: null,
                },
            },
        });

        await this.notificationService.create({
            user: order.user.toString(),
            type: 'order_confirmed',
            title: 'Payment Confirmed ✅',
            body: `Payment for order #${order.orderNumber} confirmed.`,
            data: { orderId: order._id.toString() },
        });

        this.logger.log(`[WEBHOOK] Order ${order.orderNumber} confirmed via ${gateway}`);
        return { message: 'Payment processed successfully' };
    }

    // ════════════════════════════════════════════════════════════════
    // RETRY PAYMENT (customer request)
    // ════════════════════════════════════════════════════════════════
    async retryPayment(orderId: string, userId: string) {
        const order = await this.orderModel.findOne({
            _id: orderId,
            user: userId,
            paymentStatus: { $in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
        });

        if (!order) throw new NotFoundException('Order not found or payment not retryable');

        const result = await this.initPayment(order);

        return {
            message: 'Payment initiated',
            paymentUrl: result.paymentUrl,
        };
    }
}