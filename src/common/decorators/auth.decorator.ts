import { applyDecorators, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';
export function Auth(...roles: any[]) {
  const flatRoles = roles.flat() as string[];

  return applyDecorators(
    Roles(flatRoles),
    UseGuards(AuthGuard, RolesGuard),
  );
}