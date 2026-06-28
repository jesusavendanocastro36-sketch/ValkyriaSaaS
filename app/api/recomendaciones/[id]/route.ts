import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { z } from 'zod';

const updateSchema = z.object({
  estado: z.enum(['ACEPTADA', 'RECHAZADA']),
  notas: z.string().optional(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  try {
    const { estado } = updateSchema.parse(body);
    const updated = await prisma.recomendacionAI.update({
      where: { id },
      data: { estado },
    });
    return Response.json(updated);
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
}
