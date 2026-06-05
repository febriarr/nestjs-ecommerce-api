import {
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

type OauthMetadata = {
  provider: string;
  emailVerified: boolean;
  picture?: string;
  locale?: string;
};

type NotificationPref = {
  email: boolean;
  inAppPreference: Record<string, unknown>;
};

export const roleEnum = pgEnum('role', ['super_admin', 'admin', 'customer']);
export const statusEnum = pgEnum('status', ['active', 'suspended']);

export type Role = (typeof roleEnum.enumValues)[number];
// → 'super_admin' | 'admin' | 'customer'

export type Status = (typeof statusEnum.enumValues)[number];
// → 'active' | 'suspended'

// Explicit reusable timestamp columns
export const timestamps = {
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp('deleted_at', { mode: 'date', withTimezone: true }),
} as const;

export const user = pgTable('users', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  avatar: varchar('avatar', { length: 255 }),
  role: roleEnum('role').notNull().default('customer'),
  status: statusEnum('status').notNull().default('active'),
  oauthMetadata: jsonb('oauth_metadata').$type<OauthMetadata>(),
  notificationPref: jsonb('notification_pref').$type<NotificationPref>(),
  password: varchar('password', { length: 255 }),
  lastLoginAt: timestamp('last_login_at'),
  ...timestamps,
});

// Explicit types dari inference — tidak bikin manual agar tetap sync dengan schema
export type SelectUser = typeof user.$inferSelect;
export type InsertUser = typeof user.$inferInsert;

// Partial untuk update — semua field opsional kecuali id
export type UpdateUser = Partial<
  Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
>;
