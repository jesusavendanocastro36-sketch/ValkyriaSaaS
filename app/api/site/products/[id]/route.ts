import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const updateSchema = z.record(z.string(), z.unknown());

import { sitePool } from '@/lib/site-db';
import { verifySiteAdmin } from '@/lib/site-auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { rows } = await sitePool.query(
      'SELECT * FROM products WHERE id = $1 AND active = true',
      [id]
    );
    if (!rows[0]) return Response.json({ error: 'Producto no encontrado' }, { status: 404 });
    return Response.json(rows[0]);
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = verifySiteAdmin(req);
  if (!admin) return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    const { data: body, error: parseErr } = await parseBody(req, updateSchema);
    if (parseErr) return parseErr;
    const allowed = ['slug','name','description','category','price','stock','sizes',
                     'img_text','wa_message','badge','badge_type','details','sort_order','active'];
    const sets: string[] = [];
    const vals: unknown[] = [];

    allowed.forEach(k => {
      if (body[k] === undefined) return;
      vals.push(k === 'details' ? JSON.stringify(body[k]) : body[k]);
      sets.push(`${k} = $${vals.length}`);
    });

    if (!sets.length) return Response.json({ error: 'Nada para actualizar' }, { status: 400 });
    vals.push(id);

    const { rows } = await sitePool.query(
      `UPDATE products SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${vals.length} RETURNING *`,
      vals
    );
    if (!rows[0]) return Response.json({ error: 'Producto no encontrado' }, { status: 404 });
    return Response.json(rows[0]);
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = verifySiteAdmin(req);
  if (!admin) return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    await sitePool.query(
      'UPDATE products SET active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
