import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/infrastructure/database/schema/**/*.entity.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env['DATABASE_URL'] ??
      (() => {
        throw new Error('DATABASE_URL is not defined');
      })(),
  },
  verbose: true,
  strict: true,
});
