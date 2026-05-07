import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentInitResult, PaymentVerifyResult } from './paymob.provider';

@Injectable()
export class FawryProvider {
    private readonly logger = new Logger(FawryProvider.name);

    constructor(private readonly configService: ConfigService) { }

    async initPayment(order: any): Promise<PaymentInitResult> {
        const merchantCode = this.configService.get<string>('FAWRY_MERCHANT_CODE');
        const secureKey = this.configService.get<string>('FAWRY_SECURE_KEY');

        // ─── Placeholder: Replace with real Fawry SDK ─────────────
        // When you get credentials, implement:
        //
        // Fawry Charge Request:
        // POST https://www.atfawry.com/ECommerceWeb/Fawry/payments/charge
        // body: {
        //   merchantCode,
        //   merchantRefNum: order.orderNumber,
        //   customerMobile: order.shippingAddress.phone,
        //   customerEmail: user.email,
        //   paymentMethod: 'CARD' | 'CASH',
        //   amount: order.total,
        //   signature: sha256(merchantCode + merchantRefNum + amount.toFixed(2) + secureKey),
        //   chargeItems: order.items.map(...)
        // }
        //
        // Signature:
        // import { createHash } from 'crypto';
        // const sig = createHash('sha256')
        //   .update(`${merchantCode}${order.orderNumber}${order.total.toFixed(2)}${secureKey}`)
        //   .digest('hex');

        this.logger.log(`[FAWRY] Init payment for order: ${order.orderNumber}`);

        return {
            success: true,
            paymentUrl: `https://www.atfawry.com/ECommerceWeb/Fawry/payments/charge`,
            transactionId: `FAWRY-${order._id}-${Date.now()}`,
        };
    }

    async verifyPayment(transactionId: string): Promise<PaymentVerifyResult> {
        this.logger.log(`[FAWRY] Verify: ${transactionId}`);
        // TODO: Call Fawry status API
        // GET https://www.atfawry.com/ECommerceWeb/Fawry/payments/status/v2?
        //   merchantCode=...&merchantRefNum=...&signature=...
        return { success: true, paid: true, transactionId };
    }
}