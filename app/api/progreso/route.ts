import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { calcTonnage, estimateOneRM } from '@/lib/formulas';

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
  if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const periodo = searchParams.get('periodo') ?? '30d';
  const days = periodo === '7d' ? 7 : periodo === '90d' ? 90 : 30;
  const desde = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const registros = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: athlete.id, fechaRealizacion: { gte: desde } },
    include: { ejercicioSesion: true },
    orderBy: { fechaRealizacion: 'asc' },
  });

  // Tonelaje por semana
  const tonelajePorSemana: Record<string, number> = {};
  for (const r of registros) {
    const semana = new Date(r.fechaRealizacion);
    semana.setHours(0, 0, 0, 0);
    semana.setDate(semana.getDate() - semana.getDay() + 1);
    const key = semana.toISOString().split('T')[0];
    tonelajePorSemana[key] = (tonelajePorSemana[key] ?? 0) + calcTonnage(r.pesoUsado, r.repsRealizadas, 1);
  }

  // 1RM estimado por movimiento (Big 3)
  const big3 = ['squat', 'bench', 'deadlift', 'sentadilla', 'banca', 'peso muerto'];
  const oneRMByLift: Record<string, { fecha: string; valor: number }[]> = {};
  for (const r of registros) {
    const nombre = r.ejercicioSesion.ejercicioNombre.toLowerCase();
    const lift = big3.find((b) => nombre.includes(b));
    if (!lift || r.repsRealizadas === 0) continue;
    const oneRM = estimateOneRM(r.pesoUsado, r.repsRealizadas);
    if (!oneRMByLift[lift]) oneRMByLift[lift] = [];
    oneRMByLift[lift].push({ fecha: r.fechaRealizacion.toISOString().split('T')[0], valor: oneRM });
  }

  return Response.json({
    tonelaje_por_semana: Object.entries(tonelajePorSemana).map(([semana, tonelaje]) => ({ semana, tonelaje })),
    one_rm_estimado: oneRMByLift,
    total_registros: registros.length,
    periodo,
  });
}
