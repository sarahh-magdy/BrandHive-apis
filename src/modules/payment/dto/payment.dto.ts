import { IsNotEmpty, IsString } from 'class-validator';

export class PaymentWebhookDto {
    @IsString()
    @IsNotEmpty()
    transactionId: string;

    @IsString()
    @IsNotEmpty()
    status: string;

    // ─── Additional fields from gateway ───────────────────────────
    [key: string]: any;
}