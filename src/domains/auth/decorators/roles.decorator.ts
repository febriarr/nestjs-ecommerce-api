import { SetMetadata, CustomDecorator } from '@nestjs/common';
import { Role } from '../../../infrastructure/database/schema';

export const ROLES_KEY = 'roles' as const;

/**
 * Batasi handler/controller ke role tertentu — dievaluasi RolesGuard,
 * dipasang SETELAH AuthGuard: @UseGuards(AuthGuard, RolesGuard) @Roles('admin').
 */
export const Roles = (...roles: Role[]): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, roles);
