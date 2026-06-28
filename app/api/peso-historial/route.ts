import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody } from '@/lib/api-validation';

const postSchema = z.object({
  athleteId: z.string().min(1).optional(),
  peso: z.coerce.number().positive('El peso debe ser mayor a 0'),
  nota: z.string().optional().nullable(),
  fecha: z.string().optional().nullable(),
});

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  let athleteId = searchParams.get('athleteId');

  // Athletes always see their own data; resolve ID if not provided
  if (payload.rol === 'ATHLETE') {
    const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
    if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });
    if (athleteId && athlete.id !== athleteId) return Response.json({ error: 'No autorizado' }, { status: 403 });
    athleteId = athlete.id;
  }

  const data = await prisma.pesoHistorial.findMany({
    where: { athleteId: athleteId ?? undefined },
    orderBy: { fecha: 'asc' },
    take: 60,
  });

  return Response.json(data);
}

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { data: body, error } = await parseBody(req, postSchema);
  if (error) return error;
  let { athleteId } = body;
  const { peso, nota, fecha } = body;

  // Athletes always log their own weight; resolve ID automatically
  if (payload.rol === 'ATHLETE') {
    const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
    if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });
    athleteId = athlete.id;
  }

  if (!athleteId) return Response.json({ error: 'athleteId requerido' }, { status: 400 });

  const entry = await prisma.pesoHistorial.create({
    data: {
      athleteId,
      peso: Number(peso),
      nota: nota || null,
      fecha: fecha ? new Date(fecha) : new Date(),
    },
  });

  return Response.json(entry, { status: 201 });
}

export async function DELETE(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return Response.json({ error: 'ID requerido' }, { status: 400 });

  await prisma.pesoHistorial.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
