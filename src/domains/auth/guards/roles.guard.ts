import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { Role } from '../../../infrastructure/database/schema';
import { RequestWithUser } from '../auth.types';
import { AuthForbiddenException } from '../../../common/exceptions/domains/auth.exceptions';

/**
 * Otorisasi role — membaca metadata @Roles(...). Tanpa metadata = lolos.
 * Route @Public() juga dilewati, sehingga @Roles boleh dipasang level CLASS
 * (mis. controller admin) dengan beberapa handler GET publik di dalamnya.
 * Terdaftar global SETELAH AuthGuard (butuh request.user).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (isPublic === true) return true;

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user || !required.includes(user.role)) {
      throw AuthForbiddenException({
        details: { required, actual: user?.role ?? null },
      });
    }
    return true;
  }
}
