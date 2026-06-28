import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  const token = extractToken(req);
  if (!token) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const payload = verifyToken(token);
  if (!payload) return Response.json({ error: 'Token inválido' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, nombre: true, rol: true, activo: true },
  });

  if (!user || !user.activo) {
    return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  return Response.json(user);
}
