import { z } from 'zod';
import { sitePool } from '@/lib/site-db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody } from '@/lib/api-validation';

const putSchema = z.object({
  precio: z.coerce.number().min(0, 'El precio debe ser un número ≥ 0'),
});

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { rows } = await sitePool.query("SELECT value FROM site_config WHERE key = 'coaching_price'");
    return Response.json({ precio: parseFloat(rows[0]?.value ?? '0') });
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { data, error } = await parseBody(req, putSchema);
  if (error) return error;
  const { precio } = data;

  try {
    await sitePool.query(
      `INSERT INTO site_config (key, value) VALUES ('coaching_price', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [String(precio)]
    );
    return Response.json({ ok: true, precio });
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
