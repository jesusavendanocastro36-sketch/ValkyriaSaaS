import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody, strOrNull } from '@/lib/api-validation';

const patchSchema = z.object({
  videoUrl: strOrNull.optional(),
  descripcion: strOrNull.optional(),
  notasSeguridad: strOrNull.optional(),
  cuesTecnicos: z.array(z.string()).optional(),
  gruposMusculares: z.array(z.string()).optional(),
  musculosSecundarios: z.array(z.string()).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { data: body, error } = await parseBody(req, patchSchema);
  if (error) return error;

  const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));

  const updated = await prisma.ejercicioBiblioteca.update({ where: { id }, data });
  return Response.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  await prisma.ejercicioBiblioteca.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
