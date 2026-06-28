import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const PER_PAGE = 15;

  const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
  if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  // Fetch sets with full session context, newest first
  const registros = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: athlete.id },
    select: {
      pesoUsado: true,
      repsRealizadas: true,
      rpeReportado: true,
      fechaRealizacion: true,
      ejercicioSesion: {
        select: {
          ejercicioNombre: true,
          tipoEjercicio: true,
          sesion: {
            select: {
              id: true,
              movimientoPrincipal: true,
              diaSemana: true,
              numeroSemana: true,
            },
          },
        },
      },
    },
    orderBy: { fechaRealizacion: 'desc' },
  });

  // Group by sesionId + calendar date (same session can span midnight, use date of first set)
  type SesionEntry = {
    sesionId: string;
    fecha: string;
    movimientoPrincipal: string;
    diaSemana: string;
    numeroSemana: number;
    sets: { ejercicio: string; tipo: string; peso: number; reps: number; rpe: number }[];
  };

  const sesionMap = new Map<string, SesionEntry>();

  for (const r of registros) {
    const sesion = r.ejercicioSesion.sesion;
    const fecha = r.fechaRealizacion.toISOString().slice(0, 10);
    const key = `${sesion.id}_${fecha}`;

    if (!sesionMap.has(key)) {
      sesionMap.set(key, {
        sesionId: sesion.id,
        fecha,
        movimientoPrincipal: sesion.movimientoPrincipal,
        diaSemana: sesion.diaSemana,
        numeroSemana: sesion.numeroSemana,
        sets: [],
      });
    }
    sesionMap.get(key)!.sets.push({
      ejercicio: r.ejercicioSesion.ejercicioNombre,
      tipo: r.ejercicioSesion.tipoEjercicio,
      peso: r.pesoUsado,
      reps: r.repsRealizadas,
      rpe: r.rpeReportado,
    });
  }

  // Sort sessions by date descending
  const sesiones = [...sesionMap.values()].sort((a, b) => b.fecha.localeCompare(a.fecha));

  const total = sesiones.length;
  const paginated = sesiones.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Fetch notes for the sessions in this page
  const sesionIds = paginated.map(s => s.sesionId);
  const notas = await prisma.notaSesion.findMany({
    where: { athleteId: athlete.id, sesionId: { in: sesionIds } },
    select: { sesionId: true, contenido: true, fecha: true },
    orderBy: { fecha: 'desc' },
  });
  const notaMap = new Map(notas.map(n => [n.sesionId, n.contenido]));

  const resultado = paginated.map(s => {
    const tonelaje = Math.round(s.sets.reduce((acc, r) => acc + r.peso * r.reps, 0));
    const rpePromedio = s.sets.length
      ? Math.round((s.sets.reduce((acc, r) => acc + r.rpe, 0) / s.sets.length) * 2) / 2
      : 0;

    // Group sets by exercise name for the detail view
    const porEjercicio: Record<string, { tipo: string; sets: { peso: number; reps: number; rpe: number }[] }> = {};
    for (const set of s.sets) {
      if (!porEjercicio[set.ejercicio]) porEjercicio[set.ejercicio] = { tipo: set.tipo, sets: [] };
      porEjercicio[set.ejercicio].sets.push({ peso: set.peso, reps: set.reps, rpe: set.rpe });
    }

    return {
      sesionId: s.sesionId,
      fecha: s.fecha,
      movimientoPrincipal: s.movimientoPrincipal,
      diaSemana: s.diaSemana,
      numeroSemana: s.numeroSemana,
      totalSets: s.sets.length,
      tonelaje,
      rpePromedio,
      nota: notaMap.get(s.sesionId) ?? null,
      ejercicios: Object.entries(porEjercicio).map(([nombre, data]) => ({
        nombre,
        tipo: data.tipo,
        sets: data.sets,
      })),
    };
  });

  return Response.json({
    sesiones: resultado,
    total,
    pagina: page,
    totalPaginas: Math.ceil(total / PER_PAGE),
  });
}
