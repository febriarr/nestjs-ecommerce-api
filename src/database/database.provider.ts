import { Logger, OnApplicationShutdown, Provider } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { schema, Schema } from './schema';

export const DB_CONNECTION = 'DB_CONNECTION' as const;

export type Database = NodePgDatabase<Schema>;

class DrizzleClient implements OnApplicationShutdown {
  readonly db: NodePgDatabase<Schema>;
  private readonly pool: Pool;
  private readonly logger = new Logger(DrizzleClient.name);

  constructor(connectionString: string, isLogger: boolean) {
    this.pool = new Pool({ connectionString });
    this.db = drizzle(this.pool, { schema, logger: isLogger });
  }

  async connect(): Promise<void> {
    const client = await this.pool.connect();
    this.logger.log('Database connection established');
    client.release();

    this.pool.on('error', (err: Error) => {
      this.logger.error(`Database pool error: ${err.message}`);
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
    this.logger.log('Database pool closed');
  }
}

export const DatabaseProvider: Provider = {
  provide: DB_CONNECTION,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<Database> => {
    const client = new DrizzleClient(
      configService.getOrThrow<string>('DATABASE_URL'),
      configService.get<string>('NODE_ENV') !== 'production'
    );

    await client.connect();

    return client.db;
  },
};
