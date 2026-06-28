import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil de coach no encontrado' }, { status: 404 });

  const data = await prisma.athleteProfile.findMany({
    where: { coachId: coach.id },
    include: {
      user: { select: { nombre: true, email: true, activo: true } },
      periodizaciones: { where: { estado: 'ACTIVE' }, select: { id: true, nombre: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return Response.json({ data, total: data.length });
}
