import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  const inviteToken = randomBytes(10).toString('hex').toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.inviteToken.create({
    data: { token: inviteToken, coachId: coach.id, expiresAt },
  });

  return Response.json({ token: invite.token, expiresAt: invite.expiresAt });
}

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  const invites = await prisma.inviteToken.findMany({
    where: { coachId: coach.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return Response.json({ data: invites });
}
