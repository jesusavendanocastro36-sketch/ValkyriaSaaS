import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

function detectLift(nombre: string): 'sq' | 'bp' | 'dl' | null {
  const n = nombre.toLowerCase();
  if (n.includes('sentadilla') || n.includes('squat')) return 'sq';
  if (n.includes('banca') || n.includes('bench')) return 'bp';
  if (n.includes('muerto') || n.includes('deadlift') || n.includes('sumo')) return 'dl';
  return null;
}

function estimateOneRM(weight: number, reps: number): number {
  return reps === 1 ? weight : weight * (1 + reps / 30);
}

// Wilks coefficient (men) — standard powerlifting formula
function wilksCoefficient(bw: number): number {
  const x = Math.max(40, Math.min(210, bw));
  const d =
    -216.0475144  +
     16.2606339   * x +
    -0.002388645  * Math.pow(x, 2) +
    -0.00113732   * Math.pow(x, 3) +
     7.01863e-6   * Math.pow(x, 4) +
    -1.291e-8     * Math.pow(x, 5);
  return 500 / d;
}

type SetRow = { fechaRealizacion: Date; pesoUsado: number; repsRealizadas: number };

function computeRecords(sets: SetRow[]) {
  let mejor1rm: { valor: number; fecha: string; peso: number; reps: number } | null = null;
  let mejorSingle: { peso: number; fecha: string } | null = null;
  let mejorTonelaje: { valor: number; fecha: string; peso: number; reps: number } | null = null;
  const rmByDay = new Map<string, number>();

  for (const s of sets) {
    const fecha = s.fechaRealizacion.toISOString().slice(0, 10);
    const rm = estimateOneRM(s.pesoUsado, s.repsRealizadas);
    const ton = s.pesoUsado * s.repsRealizadas;

    if (!mejor1rm || rm > mejor1rm.valor)
      mejor1rm = { valor: Math.round(rm * 10) / 10, fecha, peso: s.pesoUsado, reps: s.repsRealizadas };

    if (s.repsRealizadas === 1 && (!mejorSingle || s.pesoUsado > mejorSingle.peso))
      mejorSingle = { peso: s.pesoUsado, fecha };

    if (!mejorTonelaje || ton > mejorTonelaje.valor)
      mejorTonelaje = { valor: ton, fecha, peso: s.pesoUsado, reps: s.repsRealizadas };

    const prev = rmByDay.get(fecha) ?? 0;
    if (rm > prev) rmByDay.set(fecha, Math.round(rm * 10) / 10);
  }

  return {
    mejor_1rm: mejor1rm,
    mejor_single: mejorSingle,
    mejor_tonelaje_set: mejorTonelaje,
    historial_1rm: [...rmByDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, valor]) => ({ fecha, valor })),
  };
}

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ATHLETE') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const athlete = await prisma.athleteProfile.findUnique({
    where: { userId: payload.userId },
    include: { user: { select: { nombre: true } } },
    // also grab pesoActual for DOTS
  });
  if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const seguimientos = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: athlete.id },
    include: { ejercicioSesion: { select: { ejercicioNombre: true } } },
    orderBy: { fechaRealizacion: 'asc' },
  });

  const liftSets: Record<'sq' | 'bp' | 'dl', SetRow[]> = { sq: [], bp: [], dl: [] };
  for (const s of seguimientos) {
    const lift = detectLift(s.ejercicioSesion.ejercicioNombre);
    if (lift) liftSets[lift].push(s);
  }

  const liftRecords = {
    sq: computeRecords(liftSets.sq),
    bp: computeRecords(liftSets.bp),
    dl: computeRecords(liftSets.dl),
  };

  // Competition total + DOTS
  const sqRm  = liftRecords.sq.mejor_1rm?.valor ?? null;
  const bpRm  = liftRecords.bp.mejor_1rm?.valor ?? null;
  const dlRm  = liftRecords.dl.mejor_1rm?.valor ?? null;
  const hayTotal = sqRm !== null && bpRm !== null && dlRm !== null;
  const total = hayTotal ? Math.round(sqRm! + bpRm! + dlRm!) : null;
  const peso  = athlete!.pesoActual;
  const wilks = total !== null && peso !== null
    ? Math.round(total * wilksCoefficient(peso) * 100) / 100
    : null;

  return Response.json({
    records: liftRecords,
    total_sets: seguimientos.length,
    competencia: {
      sq_rm: sqRm,
      bp_rm: bpRm,
      dl_rm: dlRm,
      total,
      wilks,
      peso_corporal: peso,
    },
  });
}
