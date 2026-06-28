import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

// Returns the set of sesionIds that have at least one seguimiento log for the periodization's athlete
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id: periodizacionId } = await params;

  const plan = await prisma.periodizacion.findUnique({
    where: { id: periodizacionId },
    select: { athleteId: true },
  });
  if (!plan) return Response.json({ error: 'No encontrada' }, { status: 404 });

  const ejercicios = await prisma.ejercicioSesion.findMany({
    where: {
      seguimiento: { some: { athleteId: plan.athleteId } },
      sesion: { bloque: { periodizacionId } },
    },
    select: {
      sesionId: true,
      seguimiento: {
        where: { athleteId: plan.athleteId },
        select: { fechaRealizacion: true },
        orderBy: { fechaRealizacion: 'asc' },
        take: 1,
      },
    },
  });

  const seen = new Map<string, string>();
  for (const ej of ejercicios) {
    if (!seen.has(ej.sesionId) && ej.seguimiento[0]) {
      seen.set(ej.sesionId, ej.seguimiento[0].fechaRealizacion.toISOString());
    }
  }

  return Response.json({
    completadas: Array.from(seen.entries()).map(([sesionId, fecha]) => ({ sesionId, fecha })),
  });
}
