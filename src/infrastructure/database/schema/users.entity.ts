import {
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
  index,
  text,
  decimal,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

import { sql } from 'drizzle-orm';
import { timestamps } from './utils';

type OauthMetadata = {
  provider: string;
  emailVerified: boolean;
  picture?: string;
  locale?: string;
};

type NotificationPref = {
  email: boolean;
  whatsapp: boolean;
  inAppPreference: {
    push: boolean;
    orderUpdate: boolean;
    promo: boolean;
  };
};

export const roleEnum = pgEnum('role', ['super_admin', 'admin', 'customer']);
export const statusEnum = pgEnum('status', ['active', 'suspended']);

export type Role = (typeof roleEnum.enumValues)[number];
// → 'super_admin' | 'admin' | 'customer'

export type Status = (typeof statusEnum.enumValues)[number];
// → 'active' | 'suspended'

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 20 }),
    avatar: varchar('avatar', { length: 255 }),
    role: roleEnum('role').notNull().default('customer'),
    emailIsVerified: boolean('email_is_verified').default(false),
    phoneIsVerified: boolean('phone_is_verified').default(false),
    status: statusEnum('status').notNull().default('active'),
    oauthMetadata: jsonb('oauth_metadata').$type<OauthMetadata>(),
    notificationPref: jsonb('notification_pref').$type<NotificationPref>(),
    password: varchar('password', { length: 255 }),
    lastLoginAt: timestamp('last_login_at'),
    ...timestamps,
  },
  (t) => [
    index('users_role_idx').on(t.role),
    index('users_status_idx').on(t.status),
    index('users_role_status_idx').on(t.role, t.status), // filter admin list
    index('users_last_login_idx').on(t.lastLoginAt), // query user aktif/tidak aktif
  ]
);

export const userContacts = pgTable(
  'user_contacts',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    // Identitas kontak
    label: varchar('label', { length: 50 }), // 'Rumah', 'Kantor', 'Kos', dll
    recipientName: varchar('recipient_name', { length: 100 }).notNull(), // bisa beda dari user

    // Kontak primer
    phone: varchar('phone', { length: 20 }).notNull(),
    phoneAlt: varchar('phone_alt', { length: 20 }), // nomor alternatif

    // Alamat pengiriman
    street: text('street').notNull(),
    district: varchar('district', { length: 100 }).notNull(), // kecamatan
    city: varchar('city', { length: 100 }).notNull(), // kota/kabupaten
    province: varchar('province', { length: 100 }).notNull(),
    postalCode: varchar('postal_code', { length: 10 }).notNull(),
    country: varchar('country', { length: 50 }).notNull().default('Indonesia'),

    // Koordinat (opsional, untuk estimasi ongkir)
    latitude: decimal('latitude', { precision: 10, scale: 7 }),
    longitude: decimal('longitude', { precision: 10, scale: 7 }),

    // Notes kurir
    notes: varchar('notes', { length: 255 }),

    // Flags
    isPrimary: boolean('is_primary').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),

    ...timestamps,
  },

  (t) => [
    index('user_contacts_user_id_idx').on(t.userId),
    index('user_contacts_user_id_is_active_idx').on(t.userId, t.isActive), // fetch alamat aktif milik user
    index('user_contacts_city_province_idx').on(t.city, t.province), // filter/grouping per wilayah
    // Partial unique index: hanya satu isPrimary per user
    uniqueIndex('user_contacts_one_primary_per_user_idx')
      .on(t.userId)
      .where(sql`is_primary = true`),
  ]
);

// Explicit types dari inference — tidak bikin manual agar tetap sync dengan schema
export type SelectUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Partial untuk update — semua field opsional kecuali id
export type UpdateUser = Partial<
  Omit<InsertUser, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
>;
