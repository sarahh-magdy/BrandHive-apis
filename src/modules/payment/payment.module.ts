import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymobProvider } from './providers/paymob.provider';
import { FawryProvider } from './providers/fawry.provider';

import { Order, OrderSchema } from '../../models/order/order.schema';
import { NotificationModule } from '../notification/notification.module';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';

// ─── FIXED: added export ───────────────────────────────────────────
@Module({
    imports: [
        UserMongoModule,
        JwtModule,
        NotificationModule,
        MongooseModule.forFeature([
            { name: Order.name, schema: OrderSchema },
        ]),
    ],
    controllers: [PaymentController],
    providers: [PaymentService, PaymobProvider, FawryProvider],
    exports: [PaymentService],
})
export class PaymentModule { }