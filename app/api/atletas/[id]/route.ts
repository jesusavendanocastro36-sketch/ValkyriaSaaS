import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody, numOrNull, strOrNull } from '@/lib/api-validation';

const patchSchema = z.object({
  rmSquat: numOrNull.optional(),
  rmBench: numOrNull.optional(),
  rmDeadlift: numOrNull.optional(),
  pesoActual: numOrNull.optional(),
  altura: numOrNull.optional(),
  edad: numOrNull.optional(),
  categoriaPeso: strOrNull.optional(),
  sqMev: numOrNull.optional(), sqMav: numOrNull.optional(), sqMrv: numOrNull.optional(),
  bpMev: numOrNull.optional(), bpMav: numOrNull.optional(), bpMrv: numOrNull.optional(),
  dlMev: numOrNull.optional(), dlMav: numOrNull.optional(), dlMrv: numOrNull.optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  const athlete = await prisma.athleteProfile.findFirst({
    where: { id, coachId: coach.id },
    include: { user: { select: { nombre: true, email: true, activo: true } } },
  });
  if (!athlete) return Response.json({ error: 'No encontrado' }, { status: 404 });

  return Response.json(athlete);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  const athlete = await prisma.athleteProfile.findFirst({ where: { id, coachId: coach.id } });
  if (!athlete) return Response.json({ error: 'No encontrado' }, { status: 404 });

  const { data: body, error } = await parseBody(req, patchSchema);
  if (error) return error;

  // Solo claves presentes en el body (Zod ya validó tipos y convirtió '' → null)
  const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));

  const updated = await prisma.athleteProfile.update({ where: { id }, data });
  return Response.json(updated);
}
