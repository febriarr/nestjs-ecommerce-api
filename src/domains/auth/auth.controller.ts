import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService, ClientMeta } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { RegisterDTO } from './dto/register.dto';
import { LoginDTO } from './dto/login.dto';
import { GoogleLoginDTO } from './dto/google-login.dto';
import { AuthResponseDto, SessionResponseDto } from './dto/response-auth.dto';
import { UserResponseDto } from '../users/dto/response-user.dto';
import type { SelectUser } from '../../infrastructure/database/schema';
import type { RequestWithUser } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDTO,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    return this.authService.register(dto, this.clientMeta(request), res);
  }

  /** Ketat: tameng brute-force kredensial. */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDTO,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    return this.authService.login(dto, this.clientMeta(request), res);
  }

  /** Login Google — body `credential` dari Google Identity Services (GIS). */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(
    @Body() dto: GoogleLoginDTO,
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthResponseDto> {
    return this.authService.loginWithGoogle(dto, this.clientMeta(request), res);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: RequestWithUser,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    return this.authService.logout(request.sessionToken, res);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser() user: SelectUser,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    return this.authService.logoutAll(user.id, res);
  }

  @Get('me')
  async me(@CurrentUser() user: SelectUser): Promise<UserResponseDto> {
    return this.authService.me(user.id);
  }

  @Get('sessions')
  async sessions(
    @CurrentUser() user: SelectUser
  ): Promise<SessionResponseDto[]> {
    return this.authService.listSessions(user.id);
  }

  private clientMeta(request: Request): ClientMeta {
    return {
      userAgent: request.headers['user-agent'] ?? null,
      ipAddress: request.ip ?? null,
    };
  }
}
