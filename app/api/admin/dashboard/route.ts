import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

type FatigaEstado = 'VERDE' | 'AMARILLA' | 'ROJA';

function calcFatiga(regs7d: { rpeReportado: number; fecha: string }[]): { estado: FatigaEstado; rpe: number } {
  if (regs7d.length === 0) return { estado: 'VERDE', rpe: 0 };
  const rpe = regs7d.reduce((s, r) => s + r.rpeReportado, 0) / regs7d.length;

  const diasDesc = [...new Map(regs7d.map(r => [r.fecha, r])).values()].sort((a, b) =>
    b.fecha.localeCompare(a.fecha)
  );
  let consecutivas = 0;
  for (const r of diasDesc) {
    if (r.rpeReportado > 8.7) consecutivas++;
    else break;
  }

  let estado: FatigaEstado = 'VERDE';
  if (rpe > 8.5) estado = 'AMARILLA';
  if (rpe > 8.7 && consecutivas >= 5) estado = 'ROJA';

  return { estado, rpe: Math.round(rpe * 2) / 2 };
}

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  const ahora = new Date();
  const hace14 = new Date(ahora.getTime() - 14 * 24 * 60 * 60 * 1000);
  const hace7 = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
  const inicioSemana = new Date(ahora);
  inicioSemana.setHours(0, 0, 0, 0);
  inicioSemana.setDate(inicioSemana.getDate() - ((inicioSemana.getDay() + 6) % 7));

  const [athletes, registros, recsPendientes, periodizacionesActivas, periodActuales] = await Promise.all([
    prisma.athleteProfile.findMany({
      where: { coachId: coach.id },
      include: { user: { select: { nombre: true, activo: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.seguimientoAtleta.findMany({
      where: {
        athlete: { coachId: coach.id },
        fechaRealizacion: { gte: hace14 },
      },
      select: {
        athleteId: true,
        fechaRealizacion: true,
        rpeReportado: true,
        pesoUsado: true,
        repsRealizadas: true,
      },
      orderBy: { fechaRealizacion: 'desc' },
    }),
    prisma.recomendacionAI.findMany({
      where: { coachId: coach.id, estado: 'PENDIENTE' },
      include: { athlete: { include: { user: { select: { nombre: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 4,
    }),
    prisma.periodizacion.count({ where: { coachId: coach.id, estado: 'ACTIVE' } }),
    prisma.periodizacion.findMany({
      where: { coachId: coach.id, estado: 'ACTIVE' },
      select: {
        athleteId: true,
        fechaInicio: true,
        bloques: {
          select: { semanaInicio: true, semanaFin: true, nombre: true, enfasis: true },
          orderBy: { numeroBloque: 'asc' },
        },
      },
    }),
  ]);

  // Per-athlete stats
  const atletasData = athletes.map(a => {
    const regsAtleta = registros.filter(r => r.athleteId === a.id);
    const regs7d = regsAtleta
      .filter(r => r.fechaRealizacion >= hace7)
      .map(r => ({ rpeReportado: r.rpeReportado, fecha: r.fechaRealizacion.toISOString().split('T')[0] }));

    const { estado, rpe } = calcFatiga(regs7d);

    const regsSemana = regsAtleta.filter(r => r.fechaRealizacion >= inicioSemana);
    const sesionesEstaSemana = new Set(
      regsSemana.map(r => r.fechaRealizacion.toISOString().split('T')[0])
    ).size;

    const ultimaSesion = regsAtleta.length > 0
      ? regsAtleta[0].fechaRealizacion.toISOString().split('T')[0]
      : null;

    const periodActual = periodActuales.find(p => p.athleteId === a.id);
    let bloqueActual: { nombre: string; enfasis: string } | null = null;
    if (periodActual?.fechaInicio && periodActual.bloques.length > 0) {
      const semanaActual = Math.floor((ahora.getTime() - periodActual.fechaInicio.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      const bloque = periodActual.bloques.find(b => semanaActual >= b.semanaInicio && semanaActual <= b.semanaFin)
        ?? periodActual.bloques[periodActual.bloques.length - 1];
      bloqueActual = { nombre: bloque.nombre, enfasis: bloque.enfasis };
    }

    return {
      id: a.id,
      nombre: a.user.nombre,
      activo: a.user.activo,
      estadoFatiga: estado,
      rpe7dias: rpe,
      ultimaSesion,
      sesionesEstaSemana,
      bloqueActual,
    };
  });

  // Global stats
  const regsSemanaAll = registros.filter(r => r.fechaRealizacion >= inicioSemana);
  const tonelajeSemana = regsSemanaAll.reduce((s, r) => s + r.pesoUsado * r.repsRealizadas, 0);
  const sesionesGlobales = new Set(
    regsSemanaAll.map(r => `${r.athleteId}_${r.fechaRealizacion.toISOString().split('T')[0]}`)
  ).size;

  // Recent activity — unique athlete+day, latest first
  const actividadMap = new Map<string, { athleteId: string; fecha: string; rpeLista: number[] }>();
  for (const r of registros) {
    const dia = r.fechaRealizacion.toISOString().split('T')[0];
    const key = `${r.athleteId}_${dia}`;
    if (!actividadMap.has(key)) actividadMap.set(key, { athleteId: r.athleteId, fecha: dia, rpeLista: [] });
    actividadMap.get(key)!.rpeLista.push(r.rpeReportado);
  }

  const actividadReciente = [...actividadMap.values()]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 8)
    .map(entry => {
      const atleta = athletes.find(a => a.id === entry.athleteId);
      const rpePromedio = entry.rpeLista.reduce((s, v) => s + v, 0) / entry.rpeLista.length;
      return {
        athleteNombre: atleta?.user.nombre ?? 'Atleta',
        athleteId: entry.athleteId,
        fecha: entry.fecha,
        rpePromedio: Math.round(rpePromedio * 2) / 2,
        sets: entry.rpeLista.length,
      };
    });

  return Response.json({
    stats: {
      atletasActivos: athletes.filter(a => a.user.activo).length,
      sesionesEstaSemana: sesionesGlobales,
      tonelajeSemana: Math.round(tonelajeSemana),
      alertasFatiga: atletasData.filter(a => a.estadoFatiga !== 'VERDE').length,
      periodizacionesActivas,
      recomendacionesPendientes: recsPendientes.length,
    },
    atletas: atletasData,
    recomendacionesPendientes: recsPendientes.map(r => ({
      id: r.id,
      athleteNombre: r.athlete.user.nombre,
      tipo: r.tipo,
      descripcion: r.descripcion,
    })),
    actividadReciente,
  });
}
