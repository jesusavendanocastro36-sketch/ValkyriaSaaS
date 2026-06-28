import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody, numOrNull, strOrNull } from '@/lib/api-validation';

const patchSchema = z.object({
  biografia: strOrNull.optional(),
  ubicacion: strOrNull.optional(),
  telefono: strOrNull.optional(),
  especialidades: z.array(z.string()).optional(),
  experienciaAnos: numOrNull.optional(),
});

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findUnique({
    where: { userId: payload.userId },
    include: { user: { select: { nombre: true, email: true } } },
  });
  if (!coach) return Response.json({ error: 'No encontrado' }, { status: 404 });

  return Response.json(coach);
}

export async function PATCH(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'No encontrado' }, { status: 404 });

  const { data: body, error } = await parseBody(req, patchSchema);
  if (error) return error;
  const { biografia, ubicacion, telefono, especialidades, experienciaAnos } = body;

  const updated = await prisma.coachProfile.update({
    where: { id: coach.id },
    data: {
      ...(biografia !== undefined && { biografia }),
      ...(ubicacion !== undefined && { ubicacion }),
      ...(telefono !== undefined && { telefono }),
      ...(especialidades !== undefined && { especialidades }),
      ...(experienciaAnos !== undefined && { experienciaAnos }),
    },
    include: { user: { select: { nombre: true, email: true } } },
  });

  return Response.json(updated);
}
