import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get('estado') ?? undefined;
  const athleteId = searchParams.get('athlete_id') ?? undefined;

  let where: Record<string, unknown> = {};

  if (payload.rol === 'ADMIN') {
    const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
    if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });
    where = { coachId: coach.id, ...(estado && { estado }), ...(athleteId && { athleteId }) };
  } else {
    const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
    if (!athlete) return Response.json({ error: 'Atleta no encontrado' }, { status: 404 });
    where = { athleteId: athlete.id, estado: 'PENDIENTE' };
  }

  const data = await prisma.recomendacionAI.findMany({
    where,
    include: {
      athlete: { include: { user: { select: { nombre: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({ data, total: data.length });
}
