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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'No encontrado' }, { status: 404 });

  const athlete = await prisma.athleteProfile.findFirst({
    where: { id, coachId: coach.id },
    include: { user: { select: { nombre: true } } },
  });
  if (!athlete) return Response.json({ error: 'No encontrado' }, { status: 404 });

  const seguimientos = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: id },
    include: { ejercicioSesion: { select: { ejercicioNombre: true } } },
    orderBy: { fechaRealizacion: 'asc' },
  });

  const liftSets: Record<'sq' | 'bp' | 'dl', SetRow[]> = { sq: [], bp: [], dl: [] };
  for (const s of seguimientos) {
    const lift = detectLift(s.ejercicioSesion.ejercicioNombre);
    if (lift) liftSets[lift].push(s);
  }

  return Response.json({
    atleta: { nombre: athlete.user.nombre },
    records: {
      sq: computeRecords(liftSets.sq),
      bp: computeRecords(liftSets.bp),
      dl: computeRecords(liftSets.dl),
    },
    total_sets: seguimientos.length,
  });
}
