import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const testimonialSchema = z.object({
  name: z.string().min(1),
  role: z.string().default(''),
  quote: z.string().min(1),
  result: z.string().default(''),
  sort_order: z.coerce.number().int().default(0),
});

import { sitePool } from '@/lib/site-db';
import { verifySiteAdmin } from '@/lib/site-auth';

export async function GET() {
  try {
    const { rows } = await sitePool.query(
      'SELECT * FROM testimonials WHERE active = true ORDER BY sort_order ASC'
    );
    return Response.json(rows);
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = verifySiteAdmin(req);
  if (!admin) return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { data: parsed, error: parseErr } = await parseBody(req, testimonialSchema);
    if (parseErr) return parseErr;
    const { name, role, quote, result, sort_order } = parsed;

    const { rows } = await sitePool.query(
      'INSERT INTO testimonials (name, role, quote, result, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, role, quote, result, sort_order]
    );
    return Response.json(rows[0], { status: 201 });
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
