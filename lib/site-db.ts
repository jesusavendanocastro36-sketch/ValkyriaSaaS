import pg from 'pg';

const globalForSiteDb = globalThis as unknown as { sitePool: pg.Pool };

function createPool() {
  return new pg.Pool({ connectionString: process.env.DATABASE_URL! });
}

export const sitePool = globalForSiteDb.sitePool ?? createPool();

if (process.env.NODE_ENV !== 'production') globalForSiteDb.sitePool = sitePool;
