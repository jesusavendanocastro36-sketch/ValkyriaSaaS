import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { registerSchema } from '@/lib/validators';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, nombre, rol } = registerSchema.parse(body);
    const inviteToken: string | undefined = body.invite_token;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return Response.json({ error: 'Email ya registrado' }, { status: 400 });

    const hashed = await hashPassword(password);

    // ADMIN creation disabled via public API — use seed or direct DB access
    if (rol === 'ADMIN') return Response.json({ error: 'Registro no disponible' }, { status: 403 });

    // ATHLETE — requires invite token
    if (!inviteToken) return Response.json({ error: 'Se requiere un código de invitación' }, { status: 400 });

    const invite = await prisma.inviteToken.findUnique({ where: { token: inviteToken } });
    if (!invite) return Response.json({ error: 'Código de invitación inválido' }, { status: 400 });
    if (invite.usedAt) return Response.json({ error: 'Este código ya fue usado' }, { status: 400 });
    if (invite.expiresAt < new Date()) return Response.json({ error: 'Este código ha expirado' }, { status: 400 });

    const user = await prisma.$transaction(async tx => {
      const u = await tx.user.create({ data: { email, password: hashed, nombre, rol: 'ATHLETE' } });
      await tx.athleteProfile.create({ data: { userId: u.id, coachId: invite.coachId } });
      await tx.inviteToken.update({ where: { token: inviteToken }, data: { usedAt: new Date() } });
      return u;
    });

    return Response.json({ id: user.id, email: user.email, nombre: user.nombre, rol: user.rol }, { status: 201 });
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
}
