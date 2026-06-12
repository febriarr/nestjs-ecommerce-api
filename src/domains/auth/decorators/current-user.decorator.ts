import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SelectUser } from '../../../infrastructure/database/schema';
import { RequestWithUser } from '../auth.types';

/**
 * Ambil user terautentikasi dari request (di-set AuthGuard).
 * Pakai bersama @UseGuards(AuthGuard): `@CurrentUser() user: SelectUser`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SelectUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    return request.user;
  }
);
