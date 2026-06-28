import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const productSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().default(''),
  category: z.string().min(1),
  price: z.coerce.number().int().min(1),
  stock: z.coerce.number().int().min(0).default(0),
  sizes: z.array(z.string()).default([]),
  img_text: z.string().default('VLK'),
  wa_message: z.string().default(''),
  badge: z.string().nullable().default(null),
  badge_type: z.string().default('orange'),
  details: z.record(z.string(), z.unknown()).default({}),
  sort_order: z.coerce.number().int().default(0),
});

import { sitePool } from '@/lib/site-db';
import { verifySiteAdmin } from '@/lib/site-auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const params: string[] = [];
    let sql = 'SELECT * FROM products WHERE active = true';
    if (category && category !== 'todos') {
      params.push(category);
      sql += ` AND category = $${params.length}`;
    }
    sql += ' ORDER BY sort_order ASC';
    const { rows } = await sitePool.query(sql, params);
    return Response.json(rows);
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = verifySiteAdmin(req);
  if (!admin) return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const { data: parsed, error: parseErr } = await parseBody(req, productSchema);
    if (parseErr) return parseErr;
    const {
      slug, name, description, category, price, stock,
      sizes, img_text, wa_message, badge, badge_type, details, sort_order,
    } = parsed;

    const { rows } = await sitePool.query(
      `INSERT INTO products
         (slug, name, description, category, price, stock, sizes, img_text, wa_message, badge, badge_type, details, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        slug, name, description, category, price, stock,
        sizes, img_text, wa_message, badge, badge_type,
        JSON.stringify(details), sort_order,
      ]
    );
    return Response.json(rows[0], { status: 201 });
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
