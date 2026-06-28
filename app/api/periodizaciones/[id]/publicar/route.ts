import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.periodizacion.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: 'No encontrado' }, { status: 404 });
  if (existing.estado !== 'DRAFT') return Response.json({ error: 'Solo se puede publicar desde DRAFT' }, { status: 400 });

  const updated = await prisma.periodizacion.update({ where: { id }, data: { estado: 'ACTIVE' } });
  return Response.json({ estado: updated.estado, mensaje: 'Periodización publicada. Atleta notificado.' });
}
