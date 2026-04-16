import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES } from '../decorators';
import { PUBLIC } from '../decorators/public.decorator';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC, [
  context.getHandler(),
  context.getClass(),
]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    if (!user?.role || !requiredRoles.includes(user.role)) {
      throw new UnauthorizedException('You do not have permission to access this resource');
    }

    return true;
  }
}