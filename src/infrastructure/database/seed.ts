import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

import { users } from './schema';

async function seedSuperAdmin() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL tidak ditemukan di environment');
  }

  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'SUPER_ADMIN_EMAIL dan SUPER_ADMIN_PASSWORD wajib diisi di environment'
    );
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);

  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      console.log(`User dengan email ${email} sudah ada, skip seeding.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [admin] = await db
      .insert(users)
      .values({
        email,
        name: 'Super Admin',
        role: 'super_admin',
        status: 'active',
        emailIsVerified: true,
        password: hashedPassword,
      })
      .returning({ id: users.id, email: users.email });

    console.log(
      `Super admin berhasil dibuat -> id: ${admin.id}, email: ${admin.email}`
    );
  } finally {
    await pool.end();
  }
}

seedSuperAdmin()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed super admin gagal:', err);
    process.exit(1);
  });
