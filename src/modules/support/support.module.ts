import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportMessageRepository } from '../../models/support-message/support-message.repository';
import {
    SupportMessage,
    SupportMessageSchema,
} from '../../models/support-message/support-message.schema';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';

@Module({
    imports: [
        UserMongoModule,
        JwtModule,
        ConfigModule,
        MongooseModule.forFeature([
            { name: SupportMessage.name, schema: SupportMessageSchema },
        ]),
    ],
    controllers: [SupportController],
    providers: [SupportService, SupportMessageRepository],
    exports: [SupportService],
})
export class SupportModule { }