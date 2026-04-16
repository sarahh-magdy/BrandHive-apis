import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AdminRepository } from '@models/admin/admin.repository';
import { CustomerRepository } from '@models/index';
import { SellerRepository } from '@models/seller/seller.repository';
import { PUBLIC } from '@common/decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly customerRepository: CustomerRepository,
    private readonly sellerRepository: SellerRepository,
    private readonly adminRepository: AdminRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // ─── Public Routes ─────────────────────────────────────────
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();

    // ─── Check Header ──────────────────────────────────────────
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // ─── Verify Token ──────────────────────────────────────────
    let payload: { _id: string; email: string; role: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Token expired or invalid');
    }

    // ─── Repo Map ──────────────────────────────────────────────
    // ✅ lowercase عشان يتطابق مع الـ role اللي بييجي من الـ JWT
    //    الـ JWT بيتعمل بـ role من الـ DB (Customer/Seller/Admin)
    //    والـ map بيـ normalize الاتنين بـ toLowerCase()
    const repoMap: Record<string, any> = {
      customer: this.customerRepository,
      seller: this.sellerRepository,
      admin: this.adminRepository,
    };

    const repo = repoMap[payload.role.toLowerCase()];
    if (!repo) throw new UnauthorizedException('Invalid role in token');

    const user = await repo.getOne({ _id: payload._id });
    if (!user) throw new UnauthorizedException('User not found');

    // ✅ بنحط الـ role من الـ JWT payload مش من الـ DB
    //    عشان يكون consistent مع اللي اتعمل sign بيه
    request.user = {
      ...(user.toObject?.() ?? user),
      role: payload.role,
    };

    return true;
  }
}