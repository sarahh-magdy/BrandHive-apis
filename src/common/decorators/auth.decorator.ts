import { applyDecorators, UseGuards } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';

// ✅ الـ decorator ده صح — بيدمج AuthGuard + RolesGuard في decorator واحد
// الاستخدام: @Auth(['Admin']) أو @Auth(['Customer', 'Seller'])
export const Auth = (roles: string[]) => {
  return applyDecorators(Roles(roles), UseGuards(AuthGuard, RolesGuard));
};