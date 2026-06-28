import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const configSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]));

import { sitePool } from '@/lib/site-db';
import { verifySiteAdmin } from '@/lib/site-auth';

export async function GET() {
  try {
    const { rows } = await sitePool.query('SELECT key, value FROM site_config');
    return Response.json(Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value])));
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = verifySiteAdmin(req);
  if (!admin) return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { data: parsed, error: parseErr } = await parseBody(req, configSchema);
    if (parseErr) return parseErr;
    const updates = Object.entries(parsed) as [string, unknown][];
    if (!updates.length) return Response.json({ error: 'Nada para actualizar' }, { status: 400 });

    for (const [key, value] of updates) {
      await sitePool.query(
        `INSERT INTO site_config (key, value) VALUES ($1,$2)
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, String(value)]
      );
    }
    return Response.json({ ok: true, updated: updates.map(([k]) => k) });
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
