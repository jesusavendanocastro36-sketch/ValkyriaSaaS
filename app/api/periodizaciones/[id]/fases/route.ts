import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody, numOrNull, strOrNull } from '@/lib/api-validation';

type Params = { params: Promise<{ id: string }> };

const postSchema = z.object({
  basico: z.enum(['SENTADILLA', 'PRESS_BANCA', 'PESO_MUERTO']),
  bloque: z.enum(['HIPERTROFIA', 'FUERZA_BASE', 'VOLUMEN', 'PEAKING', 'TAPERING', 'DESCARGA']),
  semanaInicio: z.coerce.number().int().min(1),
  semanaFin: z.coerce.number().int().min(1),
  rpeMin: z.coerce.number().min(5).max(10),
  rpeMax: z.coerce.number().min(5).max(10),
  porcentajeRmMin: numOrNull.optional(),
  porcentajeRmMax: numOrNull.optional(),
  repsMin: numOrNull.optional(),
  repsMax: numOrNull.optional(),
  notas: strOrNull.optional(),
});

export async function GET(req: Request, { params }: Params) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const per = await prisma.periodizacion.findFirst({ where: { id, coachId: coach.id } });
  if (!per) return Response.json({ error: 'No encontrada' }, { status: 404 });

  const fases = await prisma.faseBasico.findMany({
    where: { periodizacionId: id },
    orderBy: [{ basico: 'asc' }, { semanaInicio: 'asc' }],
  });

  return Response.json({ data: fases });
}

export async function POST(req: Request, { params }: Params) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const per = await prisma.periodizacion.findFirst({ where: { id, coachId: coach.id } });
  if (!per) return Response.json({ error: 'No encontrada' }, { status: 404 });

  const { data: body, error } = await parseBody(req, postSchema);
  if (error) return error;
  const { basico, bloque, semanaInicio, semanaFin, rpeMin, rpeMax, porcentajeRmMin, porcentajeRmMax, repsMin, repsMax, notas } = body;

  const fase = await prisma.faseBasico.create({
    data: {
      periodizacionId: id,
      basico,
      bloque,
      semanaInicio,
      semanaFin,
      rpeMin,
      rpeMax,
      porcentajeRmMin: porcentajeRmMin ?? null,
      porcentajeRmMax: porcentajeRmMax ?? null,
      repsMin: repsMin ?? null,
      repsMax: repsMax ?? null,
      notas: notas ?? null,
    },
  });

  return Response.json(fase, { status: 201 });
}
