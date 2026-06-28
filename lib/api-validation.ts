import { z } from 'zod';

/**
 * Parsea y valida el body JSON de una request con un schema Zod.
 *
 * const { data, error } = await parseBody(req, miSchema);
 * if (error) return error;   // Response 400 con detalles
 */
export async function parseBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { data: null, error: Response.json({ error: 'JSON inválido' }, { status: 400 }) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      data: null,
      error: Response.json(
        {
          error: 'Datos inválidos',
          detalles: parsed.error.issues.map(i => `${i.path.join('.') || 'body'}: ${i.message}`),
        },
        { status: 400 }
      ),
    };
  }
  return { data: parsed.data, error: null };
}

/** Número opcional que acepta string numérico, '' o null (→ null). */
export const numOrNull = z.preprocess(
  v => (v === '' || v === null || v === undefined ? null : Number(v)),
  z.number().finite().nullable()
);

/** String opcional que convierte '' en null. */
export const strOrNull = z.preprocess(
  v => (v === '' || v === undefined ? null : v),
  z.string().nullable()
);
