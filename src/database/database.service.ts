import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DB_CONNECTION } from './database.provider';
import { Schema } from './schema';

@Injectable()
export class DatabaseService {
  constructor(@Inject(DB_CONNECTION) readonly db: NodePgDatabase<Schema>) {}
}
