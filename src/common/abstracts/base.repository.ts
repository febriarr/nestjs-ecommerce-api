import { DatabaseService } from '../../infrastructure/database/database.service';
import {
  Database,
  DatabaseTransaction,
} from '../../infrastructure/database/database.types';

export abstract class BaseRepository {
  protected readonly db: Database;

  constructor(databaseService: DatabaseService) {
    this.db = databaseService.db;
  }

  async withTransaction<T>(
    callback: (tx: DatabaseTransaction) => Promise<T>
  ): Promise<T> {
    return this.db.transaction(callback);
  }
}
