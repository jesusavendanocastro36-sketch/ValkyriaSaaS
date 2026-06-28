import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { z } from 'zod';

const sendSchema = z.object({
  athlete_id: z.string().cuid().optional(),
  contenido: z.string().min(1).max(2000),
  tipo: z.enum(['TEXTO', 'VIDEO_LINK', 'ARTICULO', 'RECOMENDACION']).default('TEXTO'),
});

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);

  let athleteId: string;

  if (payload.rol === 'ADMIN') {
    athleteId = searchParams.get('athlete_id') ?? '';
    if (!athleteId) return Response.json({ error: 'athlete_id requerido' }, { status: 400 });
  } else {
    const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
    if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });
    athleteId = athlete.id;

    // Mark all unread messages from coach as read
    await prisma.mensaje.updateMany({
      where: { athleteId, leido: false, sender: { rol: 'ADMIN' } },
      data: { leido: true },
    });
  }

  const data = await prisma.mensaje.findMany({
    where: { athleteId },
    include: { sender: { select: { nombre: true, rol: true } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  return Response.json({ data, total: data.length });
}

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = sendSchema.parse(await req.json());

    let athleteId: string;
    if (payload.rol === 'ADMIN') {
      if (!body.athlete_id) return Response.json({ error: 'athlete_id requerido' }, { status: 400 });
      athleteId = body.athlete_id;
    } else {
      const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
      if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });
      athleteId = athlete.id;
    }

    const data = await prisma.mensaje.create({
      data: {
        senderId: payload.userId,
        athleteId,
        contenido: body.contenido,
        tipo: body.tipo,
      },
      include: { sender: { select: { nombre: true, rol: true } } },
    });

    return Response.json(data, { status: 201 });
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
}
