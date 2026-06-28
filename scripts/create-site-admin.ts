/**
 * Run once to create the landing-site admin user.
 * Usage: npx ts-node --experimental-specifier-resolution=node scripts/create-site-admin.ts
 */
import { hash } from 'bcryptjs';
import pg from 'pg';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL! });

// Credenciales tomadas del entorno — NUNCA hardcodear en un repo público.
// Uso: ADMIN_EMAIL=... ADMIN_PASSWORD=... npx ts-node scripts/create-site-admin.ts
const EMAIL    = process.env.ADMIN_EMAIL;
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Falta ADMIN_EMAIL o ADMIN_PASSWORD en el entorno.');
  process.exit(1);
}

const hashed = await hash(PASSWORD, 10);

await pool.query(
  `INSERT INTO admin_users (email, password_hash)
   VALUES ($1, $2)
   ON CONFLICT (email) DO UPDATE SET password_hash = $2`,
  [EMAIL, hashed]
);

console.log(`✓ Admin "${EMAIL}" listo.`);
await pool.end();
