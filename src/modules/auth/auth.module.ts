import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserMongoModule } from '../../shared/modules/user-mongo.module';

@Global()
@Module({
  imports: [
    UserMongoModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'fallback_secret',
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
  ],

  exports: [
    AuthService,
    JwtModule,
  ],
})
export class AuthModule {}