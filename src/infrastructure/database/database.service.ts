import { Inject, Injectable } from '@nestjs/common';
import { Database, DB_CONNECTION, DrizzleClient } from './database.provider';

@Injectable()
export class DatabaseService {
  readonly db: Database;
  constructor(@Inject(DB_CONNECTION) private readonly client: DrizzleClient) {
    this.db = client.db;
  }
}
