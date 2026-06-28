import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const athlete = await prisma.athleteProfile.findFirst({
    where: { id, coachId: coach.id },
    include: { user: { select: { id: true, activo: true } } },
  });
  if (!athlete) return Response.json({ error: 'Atleta no encontrado' }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: athlete.user.id },
    data: { activo: !athlete.user.activo },
    select: { activo: true },
  });

  return Response.json({ activo: updated.activo });
}
