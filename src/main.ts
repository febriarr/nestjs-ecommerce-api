import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { TransformInterceptor } from './common/interceptors/api-response.interceptor';
import { AppExceptionFilter } from './common/filters/app-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Transport cookie httpOnly untuk session token (web client).
  app.use(cookieParser());

  // CORS dengan credentials agar cookie ikut terkirim lintas origin —
  // origin EKSPLISIT dari env (bukan wildcard; wildcard tidak sah bersama
  // credentials). Request tanpa Origin header (mobile/desktop/curl) tidak
  // terblokir: CORS hanya negosiasi browser, bukan filter request.
  const corsOrigins = (config.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  app.enableCors({ origin: corsOrigins, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => errors,
    })
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor()
  );
  app.useGlobalFilters(new AppExceptionFilter());
  // Aktifkan shutdown hooks agar onApplicationShutdown terpanggil
  // (DB pool, S3 client, Puppeteer browser ditutup dengan rapi).
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
