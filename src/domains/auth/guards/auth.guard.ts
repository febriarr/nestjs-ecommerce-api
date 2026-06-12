import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionsService } from '../../sessions/sessions.service';
import { UsersRepository } from '../../users/users.repository';
import { RequestWithUser } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SESSION_COOKIE_NAME } from '../auth.constants';
import {
  AuthTokenInvalidException,
  AuthTokenMissingException,
} from '../../../common/exceptions/domains/auth.exceptions';
import { UserSuspendedException } from '../../../common/exceptions/domains/user.exceptions';

/**
 * Autentikasi via session token opaque (terdaftar GLOBAL via APP_GUARD)
 * dengan DUA transport: `Authorization: Bearer <token>` (mobile/desktop)
 * lalu fallback cookie httpOnly `sessionToken` (web). Setelah token didapat,
 * validasi sesi (hash + expiry + last activity) → muat user → tolak
 * suspended — identik apa pun sumber tokennya. Route ber-@Public() dilewati.
 * User & token tersedia di request (lihat @CurrentUser / RequestWithUser).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionsService: SessionsService,
    private readonly usersRepository: UsersRepository
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()]
    );
    if (isPublic === true) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const token =
      this.extractBearerToken(request) ?? this.extractCookieToken(request);
    if (!token) {
      throw AuthTokenMissingException();
    }

    const session = await this.sessionsService.validate(token);

    const user = await this.usersRepository.findById(session.userId);
    if (!user) {
      throw AuthTokenInvalidException({
        details: { reason: 'user tidak ada' },
      });
    }
    if (user.status === 'suspended') {
      throw UserSuspendedException({ details: { userId: user.id } });
    }

    request.user = user;
    request.sessionToken = token;
    return true;
  }

  private extractBearerToken(request: RequestWithUser): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [scheme, token] = header.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }

  /** Transport web: cookie httpOnly (di-parse cookie-parser di main.ts). */
  private extractCookieToken(request: RequestWithUser): string | null {
    const cookies = request.cookies as
      | Record<string, string | undefined>
      | undefined;
    const token = cookies?.[SESSION_COOKIE_NAME];
    return token && token.length > 0 ? token : null;
  }
}
