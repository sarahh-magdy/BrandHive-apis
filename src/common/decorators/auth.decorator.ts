import { applyDecorators } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';

export const Auth = (roles: string[]) => {
  return applyDecorators(
    Roles(roles),
    UseGuards(AuthGuard , RolesGuard),
  );
};