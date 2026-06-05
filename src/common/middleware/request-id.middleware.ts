import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Response, Request } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    req: Request & { id?: string },
    _res: Response,
    next: NextFunction
  ): void {
    req.id =
      (req.headers['x-request-id'] as string | undefined) ??
      crypto.randomUUID();
    next();
  }
}
