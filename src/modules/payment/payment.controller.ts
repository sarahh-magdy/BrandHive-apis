import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Headers,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Auth } from '@common/decorators';
import { AuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { User } from '@common/decorators/user.decorator';
import { Public } from '@common/decorators/public.decorator';

@Controller('payment')
@UseGuards(AuthGuard, RolesGuard)
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    // ─── POST /payment/webhook/:gateway ───────────────────────────
    // Called by Paymob / Fawry — must be public (no auth)
    @Post('webhook/:gateway')
    @Public()
    @HttpCode(HttpStatus.OK)
    handleWebhook(
        @Param('gateway') gateway: string,
        @Body() payload: any,
        // Paymob sends HMAC in header for signature verification
        @Headers('hmac') hmac?: string,
    ) {
        return this.paymentService.handleWebhook(gateway, payload, hmac);
    }

    // ─── POST /payment/retry/:orderId ─────────────────────────────
    // Customer retries a failed/pending payment
    @Post('retry/:orderId')
    @Auth(['Customer'])
    retryPayment(@Param('orderId') orderId: string, @User() user: any) {
        return this.paymentService.retryPayment(orderId, user._id);
    }
}