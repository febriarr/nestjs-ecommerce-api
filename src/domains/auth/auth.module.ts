import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  GOOGLE_TOKEN_VERIFIER,
  GoogleIdTokenVerifier,
} from './google-token.verifier';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [UsersModule, SessionsModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleIdTokenVerifier,
    { provide: GOOGLE_TOKEN_VERIFIER, useExisting: GoogleIdTokenVerifier },
    // GLOBAL: semua route wajib Bearer token kecuali ditandai @Public().
    // Urutan penting: AuthGuard dulu (isi request.user), baru RolesGuard
    // (no-op tanpa metadata @Roles).
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [UsersModule, SessionsModule],
})
export class AuthModule {}
