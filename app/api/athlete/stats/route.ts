import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { calcTonnage, estimateOneRM } from '@/lib/formulas';

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
  if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const inicioSemana = new Date();
  inicioSemana.setHours(0, 0, 0, 0);
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay() + 1);

  const registrosSemana = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: athlete.id, fechaRealizacion: { gte: inicioSemana } },
    include: { ejercicioSesion: { select: { ejercicioNombre: true } } },
  });

  const tonelajeSemana = registrosSemana.reduce(
    (sum, r) => sum + calcTonnage(r.pesoUsado, r.repsRealizadas, 1),
    0
  );
  const diasSemana = new Set(
    registrosSemana.map(r => r.fechaRealizacion.toISOString().split('T')[0])
  ).size;

  // Latest 1RM estimate for squat
  const squatKeywords = ['squat', 'sentadilla'];
  const squatSets = registrosSemana.filter(r =>
    squatKeywords.some(k => r.ejercicioSesion.ejercicioNombre.toLowerCase().includes(k))
  );
  const oneRMSquat = squatSets.length > 0
    ? Math.max(...squatSets.map(r => estimateOneRM(r.pesoUsado, r.repsRealizadas)))
    : null;

  // Adherence: completed sessions / programmed sessions this week
  const sesionPrograma = await prisma.sesionEntrenamiento.count({
    where: {
      bloque: {
        periodizacion: { athleteId: athlete.id, estado: 'ACTIVE' },
      },
      numeroSemana: 1, // current week in block — simplified
    },
  });

  const adherencia = sesionPrograma > 0
    ? Math.min(100, Math.round((diasSemana / sesionPrograma) * 100))
    : null;

  // Active periodization name
  const periodizacion = await prisma.periodizacion.findFirst({
    where: { athleteId: athlete.id, estado: 'ACTIVE' },
    select: { nombre: true, tipo: true, fechaCompetencia: true, fechaInicio: true, duracionSemanas: true },
  });

  // Last 30d tonnage for trend + streak calculation (90 days back)
  const hace90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const registros90d = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: athlete.id, fechaRealizacion: { gte: hace90 } },
    select: { pesoUsado: true, repsRealizadas: true, rpeReportado: true, fechaRealizacion: true },
    orderBy: { fechaRealizacion: 'desc' },
  });

  const rpePromedio30d = registros90d.length
    ? (() => {
        const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const r30 = registros90d.filter(r => r.fechaRealizacion >= hace30);
        return r30.length ? r30.reduce((a, r) => a + r.rpeReportado, 0) / r30.length : null;
      })()
    : null;

  // Streak: consecutive calendar days with at least one logged set
  const diasConSet = new Set(registros90d.map(r => r.fechaRealizacion.toISOString().slice(0, 10)));

  const hoy = new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);
  let cursor = new Date(hoy);
  // If no sets today yet, start counting from yesterday (streak stays alive)
  if (!diasConSet.has(hoyStr)) cursor.setDate(cursor.getDate() - 1);

  let rachaDias = 0;
  for (let i = 0; i < 90; i++) {
    if (diasConSet.has(cursor.toISOString().slice(0, 10))) {
      rachaDias++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }

  // Last 7 days activity map (index 0 = 6 days ago, index 6 = today)
  const ultimos7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - (6 - i));
    return diasConSet.has(d.toISOString().slice(0, 10));
  });

  // Competition countdown
  const fechaComp = periodizacion?.fechaCompetencia ?? null;
  const now = new Date();
  const diasHastaComp = fechaComp && fechaComp > now
    ? Math.ceil((fechaComp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Progress through the plan (0-100%)
  const progresoPlan = (() => {
    if (!periodizacion?.fechaInicio || !periodizacion.duracionSemanas) return null;
    const inicio = new Date(periodizacion.fechaInicio);
    const totalMs = periodizacion.duracionSemanas * 7 * 24 * 60 * 60 * 1000;
    const transcurridoMs = now.getTime() - inicio.getTime();
    return Math.min(100, Math.max(0, Math.round((transcurridoMs / totalMs) * 100)));
  })();

  return Response.json({
    sesiones_semana: diasSemana,
    tonelaje_semana_kg: Math.round(tonelajeSemana),
    one_rm_squat: oneRMSquat ? Math.round(oneRMSquat) : null,
    adherencia_pct: adherencia,
    rpe_promedio_30d: rpePromedio30d ? Math.round(rpePromedio30d * 2) / 2 : null,
    plan_activo: periodizacion?.nombre ?? null,
    plan_tipo: periodizacion?.tipo ?? null,
    racha_dias: rachaDias,
    ultimos7,
    fecha_competencia: fechaComp?.toISOString() ?? null,
    dias_hasta_comp: diasHastaComp,
    progreso_plan: progresoPlan,
  });
}
