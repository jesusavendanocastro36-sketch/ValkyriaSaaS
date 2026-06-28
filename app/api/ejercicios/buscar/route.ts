import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

// Returns exercises from both EjercicioRV (global) and EjercicioBiblioteca (coach-owned)
// Used by the ExercisePicker component in the session planner
export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  const [rv, biblioteca] = await Promise.all([
    prisma.ejercicioRV.findMany({
      where: q ? {
        OR: [
          { nombre: { contains: q, mode: 'insensitive' } },
          { altNombre: { contains: q, mode: 'insensitive' } },
        ],
      } : {},
      orderBy: [{ rank: 'asc' }, { nombre: 'asc' }],
      take: 12,
      select: { id: true, nombre: true, altNombre: true, movimiento: true, tipo: true, videoUrl: true, cargaRecomendada: true, tecnicaClave: true, rank: true },
    }),
    prisma.ejercicioBiblioteca.findMany({
      where: {
        coachId: coach.id,
        ...(q ? { nombre: { contains: q, mode: 'insensitive' } } : {}),
      },
      orderBy: { nombre: 'asc' },
      take: 8,
      select: { id: true, nombre: true, categoria: true, videoUrl: true, descripcion: true, cuesTecnicos: true },
    }),
  ]);

  // Normalize to a common shape
  const TIPO_MAP: Record<string, string> = {
    variante: 'VARIANTE', auxiliar: 'AUXILIAR', compensatorio: 'COMPENSATORIO',
    competitivo: 'COMPETITIVO',
  };

  const results = [
    ...rv.map(e => ({
      id: e.id,
      fuente: 'rv' as const,
      nombre: e.nombre,
      altNombre: e.altNombre,
      tipo: TIPO_MAP[e.tipo] ?? 'VARIANTE',
      movimiento: e.movimiento,
      rank: e.rank,
      videoUrl: e.videoUrl,
      cargaRef: e.cargaRecomendada,
      notas: e.tecnicaClave,
    })),
    ...biblioteca.map(e => ({
      id: e.id,
      fuente: 'biblioteca' as const,
      nombre: e.nombre,
      altNombre: null,
      tipo: e.categoria,
      movimiento: null,
      rank: null,
      videoUrl: e.videoUrl,
      cargaRef: null,
      notas: [e.descripcion, ...(e.cuesTecnicos ?? [])].filter(Boolean).join(' · '),
    })),
  ];

  return Response.json({ results, total: results.length });
}
