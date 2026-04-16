import { Global, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserMongoModule } from '@shared/index';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AdminRepository, SellerRepository, CustomerRepository } from '@models/index'; 

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
    AdminRepository,
    SellerRepository,
    CustomerRepository, // ✅ لازم يتضاف هنا عشان الـ AuthService يشوفه
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}