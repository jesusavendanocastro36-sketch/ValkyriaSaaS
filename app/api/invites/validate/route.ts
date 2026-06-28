import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  if (!token) return Response.json({ error: 'Token requerido' }, { status: 400 });

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: { coach: { include: { user: { select: { nombre: true } } } } },
  });

  if (!invite) return Response.json({ error: 'Código inválido' }, { status: 404 });
  if (invite.usedAt) return Response.json({ error: 'Código ya usado' }, { status: 400 });
  if (invite.expiresAt < new Date()) return Response.json({ error: 'Código expirado' }, { status: 400 });

  return Response.json({ valid: true, coachNombre: invite.coach.user.nombre });
}
