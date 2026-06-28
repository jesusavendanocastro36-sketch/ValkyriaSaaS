import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { calcTonnage } from '@/lib/formulas';

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const athletes = await prisma.athleteProfile.findMany({
    where: { coachId: coach.id },
    select: { id: true },
  });
  const athleteIds = athletes.map(a => a.id);

  const inicioSemana = new Date();
  inicioSemana.setHours(0, 0, 0, 0);
  inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay() + 1); // Monday

  const registrosSemana = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: { in: athleteIds }, fechaRealizacion: { gte: inicioSemana } },
    select: { pesoUsado: true, repsRealizadas: true, rpeReportado: true, athleteId: true },
  });

  const tonelajeSemana = registrosSemana.reduce(
    (sum, r) => sum + calcTonnage(r.pesoUsado, r.repsRealizadas, 1),
    0
  );

  // Sessions this week = distinct (athleteId + day) pairs
  const diasUnicos = new Set(
    registrosSemana.map(r => r.athleteId + '_' + new Date().toISOString().split('T')[0])
  );

  // Fatigue alerts: athletes with RPE avg > 8.5 in last 7 days
  const hace7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const registros7d = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: { in: athleteIds }, fechaRealizacion: { gte: hace7 } },
    select: { athleteId: true, rpeReportado: true },
  });

  const rpeByAthlete: Record<string, number[]> = {};
  for (const r of registros7d) {
    if (!rpeByAthlete[r.athleteId]) rpeByAthlete[r.athleteId] = [];
    rpeByAthlete[r.athleteId].push(r.rpeReportado);
  }
  const alertasFatiga = Object.values(rpeByAthlete).filter(
    rpeLista => rpeLista.reduce((a, b) => a + b, 0) / rpeLista.length > 8.5
  ).length;

  const periodizacionesActivas = await prisma.periodizacion.count({
    where: { coachId: coach.id, estado: 'ACTIVE' },
  });

  return Response.json({
    atletas_activos: athleteIds.length,
    sesiones_semana: diasUnicos.size,
    tonelaje_semana_kg: Math.round(tonelajeSemana),
    alertas_fatiga: alertasFatiga,
    periodizaciones_activas: periodizacionesActivas,
  });
}
