import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

function getISOWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function estimateOneRM(weight: number, reps: number): number {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

function detectLift(nombre: string): 'sq' | 'bp' | 'dl' | null {
  const n = nombre.toLowerCase();
  if (n.includes('sentadilla') || n.includes('squat')) return 'sq';
  if (n.includes('banca') || n.includes('bench')) return 'bp';
  if (n.includes('muerto') || n.includes('deadlift') || n.includes('sumo')) return 'dl';
  return null;
}

function linearRegression(points: { x: number; y: number }[]): { slope: number; intercept: number } | null {
  const n = points.length;
  if (n < 3) return null;
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  const athlete = await prisma.athleteProfile.findFirst({
    where: { id, coachId: coach.id },
    include: { user: { select: { nombre: true } } },
  });
  if (!athlete) return Response.json({ error: 'No encontrado' }, { status: 404 });

  const url = new URL(req.url);
  const semanasAtras = Number(url.searchParams.get('semanas') ?? '12');

  const desde = new Date();
  desde.setDate(desde.getDate() - semanasAtras * 7);

  const [registros, activePeriodi] = await Promise.all([
    prisma.seguimientoAtleta.findMany({
      where: { athleteId: id, fechaRealizacion: { gte: desde } },
      include: {
        ejercicioSesion: { select: { ejercicioNombre: true, tipoEjercicio: true } },
      },
      orderBy: { fechaRealizacion: 'asc' },
    }),
    prisma.periodizacion.findFirst({
      where: {
        athleteId: id,
        fechaCompetencia: { not: null },
        estado: { in: ['ACTIVE', 'DRAFT'] },
      },
      orderBy: { fechaCompetencia: 'asc' },
      select: { fechaCompetencia: true, nombre: true },
    }),
  ]);

  // Group by ISO week
  const byWeek = new Map<string, typeof registros>();
  for (const r of registros) {
    const wk = getISOWeekKey(r.fechaRealizacion);
    if (!byWeek.has(wk)) byWeek.set(wk, []);
    byWeek.get(wk)!.push(r);
  }

  const sortedWeeks = [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b));

  const semanas = sortedWeeks.map(([, rows], idx) => {
    const tonelaje = rows.reduce((sum, r) => sum + r.pesoUsado * r.repsRealizadas, 0);
    const rpePromedio = rows.reduce((sum, r) => sum + r.rpeReportado, 0) / rows.length;

    const rmEst: Record<string, number> = {};
    for (const r of rows) {
      if (r.ejercicioSesion.tipoEjercicio !== 'COMPETITIVO') continue;
      const lift = detectLift(r.ejercicioSesion.ejercicioNombre);
      if (!lift) continue;
      const est = estimateOneRM(r.pesoUsado, r.repsRealizadas);
      if (!rmEst[lift] || est > rmEst[lift]) rmEst[lift] = Math.round(est * 10) / 10;
    }

    const diasUnicos = new Set(rows.map(r => r.fechaRealizacion.toISOString().split('T')[0])).size;

    return {
      label: `S${idx + 1}`,
      tonelaje: Math.round(tonelaje),
      rpePromedio: Math.round(rpePromedio * 2) / 2,
      rmSq: rmEst['sq'] ?? null,
      rmBp: rmEst['bp'] ?? null,
      rmDl: rmEst['dl'] ?? null,
      sesiones: diasUnicos,
    };
  });

  // Fatigue state — last 7 days
  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 7);
  const ultimos7 = registros.filter(r => r.fechaRealizacion >= hace7);
  const rpe7 = ultimos7.length > 0
    ? ultimos7.reduce((s, r) => s + r.rpeReportado, 0) / ultimos7.length
    : 0;

  const diasDesc = [...new Map(
    [...registros].reverse().map(r => [r.fechaRealizacion.toISOString().split('T')[0], r])
  ).values()];
  let consecutivasAltas = 0;
  for (const r of diasDesc) {
    if (r.rpeReportado > 8.7) consecutivasAltas++;
    else break;
  }

  let estadoFatiga: 'VERDE' | 'AMARILLA' | 'ROJA' = 'VERDE';
  if (rpe7 > 8.5) estadoFatiga = 'AMARILLA';
  if (rpe7 > 8.7 && consecutivasAltas >= 5) estadoFatiga = 'ROJA';

  // ── Prediction ───────────────────────────────────────────────────────────────
  const now = new Date();
  const fechaCompetencia = activePeriodi?.fechaCompetencia ?? null;
  const weeksUntilComp = fechaCompetencia && fechaCompetencia > now
    ? Math.round((fechaCompetencia.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000))
    : null;

  type LiftPrediction = { actual: number; proyectado: number; delta: number; tendencia_kg_semana: number };
  type LiftTrend = {
    actual: number;
    tendencia_kg_semana: number;
    en4w: number;
    en8w: number;
    en12w: number;
    estado: 'subiendo' | 'plateau' | 'bajando';
  };

  let prediccion: { sq: LiftPrediction | null; bp: LiftPrediction | null; dl: LiftPrediction | null } | null = null;
  let tendencia: { sq: LiftTrend | null; bp: LiftTrend | null; dl: LiftTrend | null } | null = null;

  const liftKeys = ['sq', 'bp', 'dl'] as const;
  const dataKeys = { sq: 'rmSq', bp: 'rmBp', dl: 'rmDl' } as const;

  if (semanas.length >= 3) {
    const predResults = {} as Record<'sq' | 'bp' | 'dl', LiftPrediction | null>;
    const trendResults = {} as Record<'sq' | 'bp' | 'dl', LiftTrend | null>;

    for (const lift of liftKeys) {
      const points = semanas
        .map((s, i) => ({ x: i, y: s[dataKeys[lift]] }))
        .filter((p): p is { x: number; y: number } => p.y !== null);

      const reg = linearRegression(points);
      if (!reg || points.length < 3) {
        predResults[lift] = null;
        trendResults[lift] = null;
        continue;
      }

      const lastPoint = points.at(-1)!;
      const actual = Math.round(lastPoint.y);
      const slope = Math.round(reg.slope * 10) / 10;

      // Always build trend projection
      trendResults[lift] = {
        actual,
        tendencia_kg_semana: slope,
        en4w:  Math.round(reg.slope * (lastPoint.x + 4)  + reg.intercept),
        en8w:  Math.round(reg.slope * (lastPoint.x + 8)  + reg.intercept),
        en12w: Math.round(reg.slope * (lastPoint.x + 12) + reg.intercept),
        estado: slope >= 0.5 ? 'subiendo' : slope <= -0.2 ? 'bajando' : 'plateau',
      };

      // Competition projection only if applicable
      if (weeksUntilComp && weeksUntilComp > 0) {
        const projX = lastPoint.x + weeksUntilComp;
        predResults[lift] = {
          actual,
          proyectado: Math.round(reg.slope * projX + reg.intercept),
          delta: Math.round(reg.slope * projX + reg.intercept) - actual,
          tendencia_kg_semana: slope,
        };
      } else {
        predResults[lift] = null;
      }
    }

    if (predResults.sq || predResults.bp || predResults.dl) {
      prediccion = { sq: predResults.sq ?? null, bp: predResults.bp ?? null, dl: predResults.dl ?? null };
    }
    if (trendResults.sq || trendResults.bp || trendResults.dl) {
      tendencia = { sq: trendResults.sq ?? null, bp: trendResults.bp ?? null, dl: trendResults.dl ?? null };
    }
  }

  return Response.json({
    atleta: { nombre: athlete.user.nombre },
    semanas,
    estadoFatiga,
    rpe7dias: Math.round(rpe7 * 2) / 2,
    totalSesiones: new Set(registros.map(r => r.fechaRealizacion.toISOString().split('T')[0])).size,
    prediccion,
    tendencia,
    fechaCompetencia: fechaCompetencia?.toISOString() ?? null,
    semanasHastaComp: weeksUntilComp ?? null,
    competenciaNombre: activePeriodi?.nombre ?? null,
  });
}
