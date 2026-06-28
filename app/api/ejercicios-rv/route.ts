import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const movimiento = searchParams.get('movimiento');
  const tipo = searchParams.get('tipo');
  const rank = searchParams.get('rank');
  const bloque = searchParams.get('bloque');

  const data = await prisma.ejercicioRV.findMany({
    where: {
      ...(movimiento ? { movimiento } : {}),
      ...(tipo ? { tipo } : {}),
      ...(rank ? { rank } : {}),
      ...(bloque ? { bloquesIdeal: { has: bloque } } : {}),
      ...(q ? {
        OR: [
          { nombre: { contains: q, mode: 'insensitive' } },
          { altNombre: { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    },
    orderBy: [{ rank: 'asc' }, { movimiento: 'asc' }, { nombre: 'asc' }],
    take: q ? 15 : undefined,
  });

  return Response.json({ data, total: data.length });
}
