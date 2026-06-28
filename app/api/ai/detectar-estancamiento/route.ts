import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const bodySchema = z.object({ athleteId: z.string().min(1) });

import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { estimateOneRM } from '@/lib/formulas';

// ── Helpers ──────────────────────────────────────────────────────────────────

function detectLift(nombre: string): 'SQ' | 'BP' | 'DL' | null {
  const n = nombre.toLowerCase();
  if (n.includes('sentadilla') || n.includes('squat')) return 'SQ';
  if (n.includes('banca') || n.includes('bench')) return 'BP';
  if (n.includes('muerto') || n.includes('deadlift') || n.includes('sumo')) return 'DL';
  return null;
}

function liftLabel(lift: 'SQ' | 'BP' | 'DL') {
  return { SQ: 'Sentadilla', BP: 'Banca', DL: 'Peso Muerto' }[lift];
}

function linearSlope(points: number[]): number | null {
  const n = points.length;
  if (n < 3) return null;
  const sumX = (n * (n - 1)) / 2;
  const sumX2 = ((n - 1) * n * (2 * n - 1)) / 6;
  const sumY = points.reduce((a, b) => a + b, 0);
  const sumXY = points.reduce((acc, y, x) => acc + x * y, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  return (n * sumXY - sumX * sumY) / denom;
}

function isoWeekKey(d: Date): string {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  dt.setDate(dt.getDate() + 4 - (dt.getDay() || 7));
  const y = dt.getFullYear();
  const w = Math.ceil(((dt.getTime() - new Date(y, 0, 1).getTime()) / 86400000 + 1) / 7);
  return `${y}-W${String(w).padStart(2, '0')}`;
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { data: parsed, error: parseErr } = await parseBody(req, bodySchema);
  if (parseErr) return parseErr;
  const { athleteId } = parsed;

  // Resolve athlete and coach
  const athlete = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    include: { user: { select: { nombre: true } } },
  });
  if (!athlete) return Response.json({ error: 'Atleta no encontrado' }, { status: 404 });

  const coach = await prisma.coachProfile.findFirst({
    where: { athletes: { some: { id: athleteId } } },
  });
  if (!coach) return Response.json({ skipped: true, reason: 'sin coach' });

  // Throttle — skip if a stagnation rec was created in the last 7 days
  const hace7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recReciente = await prisma.recomendacionAI.findFirst({
    where: {
      athleteId,
      coachId: coach.id,
      tipo: 'CAMBIO_EJERCICIO',
      razonGenerada: { contains: 'estancamiento' },
      createdAt: { gte: hace7 },
    },
  });
  if (recReciente) return Response.json({ skipped: true, reason: 'throttled' });

  // Get last 6 weeks of competitive sets
  const hace6s = new Date(Date.now() - 42 * 24 * 60 * 60 * 1000);
  const sets = await prisma.seguimientoAtleta.findMany({
    where: {
      athleteId,
      fechaRealizacion: { gte: hace6s },
      ejercicioSesion: { tipoEjercicio: 'COMPETITIVO' },
    },
    select: {
      fechaRealizacion: true,
      rpeReportado: true,
      pesoUsado: true,
      repsRealizadas: true,
      ejercicioSesion: { select: { ejercicioNombre: true } },
    },
    orderBy: { fechaRealizacion: 'asc' },
  });

  if (sets.length < 6) return Response.json({ skipped: true, reason: 'insuficientes datos' });

  // Group by lift → week
  type WeekBucket = { rm: number[]; rpe: number[] };
  const liftWeeks = new Map<'SQ' | 'BP' | 'DL', Map<string, WeekBucket>>();

  for (const s of sets) {
    const lift = detectLift(s.ejercicioSesion.ejercicioNombre);
    if (!lift) continue;
    const wk = isoWeekKey(s.fechaRealizacion);
    if (!liftWeeks.has(lift)) liftWeeks.set(lift, new Map());
    const weeks = liftWeeks.get(lift)!;
    if (!weeks.has(wk)) weeks.set(wk, { rm: [], rpe: [] });
    const bucket = weeks.get(wk)!;
    bucket.rm.push(estimateOneRM(s.pesoUsado, s.repsRealizadas));
    bucket.rpe.push(s.rpeReportado);
  }

  const alertas: { lift: string; descripcion: string; detalle: string }[] = [];

  for (const [lift, weekMap] of liftWeeks.entries()) {
    const sortedWeeks = [...weekMap.entries()].sort(([a], [b]) => a.localeCompare(b));
    if (sortedWeeks.length < 3) continue;

    const rmPorSemana  = sortedWeeks.map(([, b]) => Math.max(...b.rm));
    const rpePorSemana = sortedWeeks.map(([, b]) => b.rpe.reduce((a, c) => a + c, 0) / b.rpe.length);

    const slopeRm  = linearSlope(rmPorSemana);
    const slopeRpe = linearSlope(rpePorSemana);

    if (slopeRm === null || slopeRpe === null) continue;

    const rmActual  = Math.round(rmPorSemana.at(-1)!);
    const rpeActual = Math.round(rpePorSemana.at(-1)! * 10) / 10;

    // Stagnation: 1RM flat/down while RPE rising or high
    const rm1rStagnant  = slopeRm < 0.3;  // < 0.3 kg/week gain
    const rpeCreciendo  = slopeRpe > 0.05; // RPE going up
    const rpeAlto       = rpeActual > 8.4;

    if (rm1rStagnant && (rpeCreciendo || rpeAlto)) {
      const tendRm  = slopeRm >= 0 ? `+${slopeRm.toFixed(1)}` : slopeRm.toFixed(1);
      const tendRpe = slopeRpe >= 0 ? `+${slopeRpe.toFixed(2)}` : slopeRpe.toFixed(2);
      alertas.push({
        lift: liftLabel(lift),
        descripcion: `Estancamiento en ${liftLabel(lift)}: 1RM estimado ${rmActual} kg sin progreso (${tendRm} kg/sem) mientras RPE sube (${tendRpe}/sem, actual ${rpeActual})`,
        detalle: `estancamiento — slopeRm: ${slopeRm.toFixed(2)}, slopeRpe: ${slopeRpe.toFixed(2)}, rpeActual: ${rpeActual}`,
      });
    }
  }

  if (alertas.length === 0) return Response.json({ alertas: 0 });

  // Create one recommendation per stagnation detected
  await Promise.all(
    alertas.map(a =>
      prisma.recomendacionAI.create({
        data: {
          coachId: coach.id,
          athleteId,
          tipo: 'CAMBIO_EJERCICIO',
          descripcion: a.descripcion,
          razonGenerada: a.detalle,
          parametrosSugeridos: { origen: 'deteccion_automatica_estancamiento' },
        },
      })
    )
  );

  return Response.json({ alertas: alertas.length, lifts: alertas.map(a => a.lift) });
}
