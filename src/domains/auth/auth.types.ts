import { Request } from 'express';
import { SelectUser } from '../../infrastructure/database/schema';

/** Request yang sudah melewati AuthGuard — `user` dijamin terisi. */
export interface RequestWithUser extends Request {
  user: SelectUser;
  /** Plain session token dari header (untuk logout sesi ini). */
  sessionToken: string;
}
