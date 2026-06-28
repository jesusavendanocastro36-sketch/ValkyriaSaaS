import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody } from '@/lib/api-validation';

const postSchema = z.object({
  semanaMax: z.coerce.number().int().min(1).nullable(),
});

// POST { semanaMax: number | null }
// Syncs session-level bloqueado to match the semanaMaxVisible cap:
//   semanaMax set   → unlock weeks ≤ semanaMax, lock weeks > semanaMax
//   semanaMax null  → unlock all sessions
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id: periodizacionId } = await params;
  const { data, error } = await parseBody(req, postSchema);
  if (error) return error;
  const { semanaMax } = data;

  if (semanaMax === null) {
    // Unlock everything
    await prisma.sesionEntrenamiento.updateMany({
      where: { bloque: { periodizacionId } },
      data: { bloqueado: false },
    });
    return Response.json({ ok: true, desbloqueadas: 'all' });
  }

  const n = Number(semanaMax);
  const [unlocked, locked] = await Promise.all([
    prisma.sesionEntrenamiento.updateMany({
      where: { bloque: { periodizacionId }, numeroSemana: { lte: n } },
      data: { bloqueado: false },
    }),
    prisma.sesionEntrenamiento.updateMany({
      where: { bloque: { periodizacionId }, numeroSemana: { gt: n } },
      data: { bloqueado: true },
    }),
  ]);

  return Response.json({ ok: true, desbloqueadas: unlocked.count, bloqueadas: locked.count });
}
