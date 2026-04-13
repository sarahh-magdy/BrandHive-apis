import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { CustomerRepository, SellerRepository } from '@models/index';
import { PUBLIC } from '@common/decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly customerRepository: CustomerRepository,
    private readonly sellerRepository: SellerRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const isPublic = this.reflector.get<boolean>(
        PUBLIC,
        context.getHandler(),
      );
      if (isPublic) return true;

      const request = context.switchToHttp().getRequest();

//CHECK AUTHORIZATION HEADER
      const authHeader = request.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('No token provided');
      }

      const token = authHeader.split(' ')[1];

//VERIFY TOKEN      
      const payload = this.jwtService.verify<{
        _id: string;
        email: string;
        role: string;
      }>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

//MAPPING ROLES TO REPOSITORIES
      const repoMap = {
        customer: this.customerRepository,
        seller: this.sellerRepository,
      };

      const repo = repoMap[payload.role.toLowerCase()];

      if (!repo) {
        throw new UnauthorizedException('Invalid role');
      }

//FIND USER
      const user = await repo.getOne({ _id: payload._id });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

//ATTACH USER TO REQUEST
      request.user = user;

      return true;
    } catch (error) {
      console.error('Auth guard error:', error);
      throw new UnauthorizedException('Token expired or invalid');
    }
  }
}