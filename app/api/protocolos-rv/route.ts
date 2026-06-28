import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get('categoria');
  const nivel = searchParams.get('nivel');
  const bloque = searchParams.get('bloque');

  const data = await prisma.protocoloRV.findMany({
    where: {
      ...(categoria ? { categoria } : {}),
      ...(nivel ? { nivel } : {}),
      ...(bloque ? { bloques: { has: bloque } } : {}),
    },
    orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
  });

  return Response.json({ data, total: data.length });
}
