import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

function detectLift(nombre: string): 'sq' | 'bp' | 'dl' | null {
  const n = nombre.toLowerCase();
  if (n.includes('sentadilla') || n.includes('squat')) return 'sq';
  if (n.includes('banca') || n.includes('bench')) return 'bp';
  if (n.includes('muerto') || n.includes('deadlift') || n.includes('sumo')) return 'dl';
  return null;
}

function estimateOneRM(w: number, r: number) { return r === 1 ? w : w * (1 + r / 30); }

type SetRow = {
  fechaRealizacion: Date;
  pesoUsado: number;
  repsRealizadas: number;
  rpeReportado: number;
  ejercicioSesion: { ejercicioNombre: string; tipoEjercicio: string };
};

function bestRM(sets: SetRow[]): { sq: number | null; bp: number | null; dl: number | null } {
  const rm: { sq: number | null; bp: number | null; dl: number | null } = { sq: null, bp: null, dl: null };
  for (const s of sets) {
    if (s.ejercicioSesion.tipoEjercicio !== 'COMPETITIVO') continue;
    const lift = detectLift(s.ejercicioSesion.ejercicioNombre);
    if (!lift) continue;
    const est = Math.round(estimateOneRM(s.pesoUsado, s.repsRealizadas) * 10) / 10;
    if (!rm[lift] || est > rm[lift]!) rm[lift] = est;
  }
  return rm;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  const periodi = await prisma.periodizacion.findUnique({
    where: { id },
    include: {
      athlete: { select: { id: true } },
      bloques: { orderBy: { numeroBloque: 'asc' } },
    },
  });
  if (!periodi) return Response.json({ error: 'No encontrado' }, { status: 404 });

  const fechaInicio = periodi.fechaInicio;
  const athleteId = periodi.athlete.id;

  const allSets = await prisma.seguimientoAtleta.findMany({
    where: { athleteId },
    include: { ejercicioSesion: { select: { ejercicioNombre: true, tipoEjercicio: true } } },
    orderBy: { fechaRealizacion: 'asc' },
  });

  const bloques = periodi.bloques.map((bloque) => {
    // Convert week numbers to absolute dates
    const blockStart = new Date(fechaInicio);
    blockStart.setDate(blockStart.getDate() + (bloque.semanaInicio - 1) * 7);
    const blockEnd = new Date(fechaInicio);
    blockEnd.setDate(blockEnd.getDate() + bloque.semanaFin * 7);

    const blockSets = allSets.filter(
      (s) => s.fechaRealizacion >= blockStart && s.fechaRealizacion < blockEnd
    );

    // First week vs last week for RM comparison
    const firstWeekEnd = new Date(blockStart);
    firstWeekEnd.setDate(firstWeekEnd.getDate() + 7);
    const lastWeekStart = new Date(blockEnd);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const rm_inicio = bestRM(blockSets.filter((s) => s.fechaRealizacion < firstWeekEnd));
    const rm_fin = bestRM(blockSets.filter((s) => s.fechaRealizacion >= lastWeekStart));

    const sesiones = new Set(blockSets.map((s) => s.fechaRealizacion.toISOString().slice(0, 10))).size;
    const tonelaje = blockSets.reduce((sum, s) => sum + s.pesoUsado * s.repsRealizadas, 0);
    const rpePromedio = blockSets.length > 0
      ? Math.round((blockSets.reduce((sum, s) => sum + s.rpeReportado, 0) / blockSets.length) * 2) / 2
      : null;

    const mejora = {
      sq: rm_fin.sq !== null && rm_inicio.sq !== null ? Math.round((rm_fin.sq - rm_inicio.sq) * 10) / 10 : null,
      bp: rm_fin.bp !== null && rm_inicio.bp !== null ? Math.round((rm_fin.bp - rm_inicio.bp) * 10) / 10 : null,
      dl: rm_fin.dl !== null && rm_inicio.dl !== null ? Math.round((rm_fin.dl - rm_inicio.dl) * 10) / 10 : null,
    };

    return {
      id: bloque.id,
      nombre: bloque.nombre,
      semanaInicio: bloque.semanaInicio,
      semanaFin: bloque.semanaFin,
      enfasis: bloque.enfasis,
      stats: { sesiones, tonelaje: Math.round(tonelaje), rpe_promedio: rpePromedio, rm_inicio, rm_fin, mejora },
    };
  });

  return Response.json({ bloques });
}
