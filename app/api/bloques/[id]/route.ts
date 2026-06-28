import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody } from '@/lib/api-validation';

const putSchema = z.object({
  numero_bloque: z.coerce.number().int().min(1).optional(),
  nombre: z.string().min(1).optional(),
  semana_inicio: z.coerce.number().int().min(1).optional(),
  semana_fin: z.coerce.number().int().min(1).optional(),
  enfasis: z.string().min(1).optional(),
  intensidad_rpe_min: z.coerce.number().min(5).max(10).optional(),
  intensidad_rpe_max: z.coerce.number().min(5).max(10).optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { data: body, error } = await parseBody(req, putSchema);
  if (error) return error;

  const existing = await prisma.bloqueEntrenamiento.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: 'No encontrado' }, { status: 404 });

  const updated = await prisma.bloqueEntrenamiento.update({
    where: { id },
    data: {
      numeroBloque:     body.numero_bloque     ?? existing.numeroBloque,
      nombre:           body.nombre           ?? existing.nombre,
      semanaInicio:     body.semana_inicio     ?? existing.semanaInicio,
      semanaFin:        body.semana_fin        ?? existing.semanaFin,
      enfasis:          body.enfasis           ?? existing.enfasis,
      intensidadRpeMin: body.intensidad_rpe_min ?? existing.intensidadRpeMin,
      intensidadRpeMax: body.intensidad_rpe_max ?? existing.intensidadRpeMax,
    },
  });

  return Response.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.bloqueEntrenamiento.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: 'No encontrado' }, { status: 404 });

  await prisma.bloqueEntrenamiento.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
