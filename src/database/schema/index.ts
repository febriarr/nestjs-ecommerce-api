// index.ts
import { user, roleEnum, statusEnum } from './user.entity';

export const schema = { user, roleEnum, statusEnum } as const;

export type Schema = typeof schema;

export type {
  SelectUser,
  InsertUser,
  UpdateUser,
  Role,
  Status,
} from './user.entity';
