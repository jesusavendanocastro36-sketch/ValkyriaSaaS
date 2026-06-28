import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody, numOrNull, strOrNull } from '@/lib/api-validation';

type Params = { params: Promise<{ id: string; faseId: string }> };

const putSchema = z.object({
  bloque: z.enum(['HIPERTROFIA', 'FUERZA_BASE', 'VOLUMEN', 'PEAKING', 'TAPERING', 'DESCARGA']).optional(),
  semanaInicio: z.coerce.number().int().min(1).optional(),
  semanaFin: z.coerce.number().int().min(1).optional(),
  rpeMin: z.coerce.number().min(5).max(10).optional(),
  rpeMax: z.coerce.number().min(5).max(10).optional(),
  porcentajeRmMin: numOrNull.optional(),
  porcentajeRmMax: numOrNull.optional(),
  repsMin: numOrNull.optional(),
  repsMax: numOrNull.optional(),
  notas: strOrNull.optional(),
});

export async function PUT(req: Request, { params }: Params) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id, faseId } = await params;
  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const per = await prisma.periodizacion.findFirst({ where: { id, coachId: coach.id } });
  if (!per) return Response.json({ error: 'No encontrada' }, { status: 404 });

  const { data: body, error } = await parseBody(req, putSchema);
  if (error) return error;
  const { bloque, semanaInicio, semanaFin, rpeMin, rpeMax, porcentajeRmMin, porcentajeRmMax, repsMin, repsMax, notas } = body;

  const fase = await prisma.faseBasico.update({
    where: { id: faseId },
    data: {
      ...(bloque !== undefined && { bloque }),
      ...(semanaInicio !== undefined && { semanaInicio }),
      ...(semanaFin !== undefined && { semanaFin }),
      ...(rpeMin !== undefined && { rpeMin }),
      ...(rpeMax !== undefined && { rpeMax }),
      porcentajeRmMin: porcentajeRmMin ?? null,
      porcentajeRmMax: porcentajeRmMax ?? null,
      repsMin: repsMin ?? null,
      repsMax: repsMax ?? null,
      notas: notas ?? null,
    },
  });

  return Response.json(fase);
}

export async function DELETE(req: Request, { params }: Params) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id, faseId } = await params;
  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const per = await prisma.periodizacion.findFirst({ where: { id, coachId: coach.id } });
  if (!per) return Response.json({ error: 'No encontrada' }, { status: 404 });

  await prisma.faseBasico.delete({ where: { id: faseId } });

  return new Response(null, { status: 204 });
}
