import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody, strOrNull } from '@/lib/api-validation';

const patchSchema = z.object({
  videoUrl: strOrNull.optional(),
  notasCoach: strOrNull.optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { data: body, error } = await parseBody(req, patchSchema);
  if (error) return error;

  const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));

  const updated = await prisma.ejercicioRV.update({ where: { id }, data });
  return Response.json(updated);
}
