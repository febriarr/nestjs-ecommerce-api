import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
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
    @Req() request: Request
  ): Promise<AuthResponseDto> {
    return this.authService.register(dto, this.clientMeta(request));
  }

  /** Ketat: tameng brute-force kredensial. */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDTO,
    @Req() request: Request
  ): Promise<AuthResponseDto> {
    return this.authService.login(dto, this.clientMeta(request));
  }

  /** Login Google — body `credential` dari Google Identity Services (GIS). */
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('google')
  @HttpCode(HttpStatus.OK)
  async loginWithGoogle(
    @Body() dto: GoogleLoginDTO,
    @Req() request: Request
  ): Promise<AuthResponseDto> {
    return this.authService.loginWithGoogle(dto, this.clientMeta(request));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() request: RequestWithUser): Promise<void> {
    return this.authService.logout(request.sessionToken);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@CurrentUser() user: SelectUser): Promise<void> {
    return this.authService.logoutAll(user.id);
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
