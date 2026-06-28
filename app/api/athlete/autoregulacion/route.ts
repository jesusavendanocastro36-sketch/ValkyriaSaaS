import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { suggestNextWeight } from '@/lib/formulas';

function calcFatiga(registros: { rpeReportado: number; fechaRealizacion: Date }[]): 'VERDE' | 'AMARILLA' | 'ROJA' {
  const hace7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const ultimos7 = registros.filter(r => r.fechaRealizacion >= hace7);
  const rpe7 = ultimos7.length > 0
    ? ultimos7.reduce((s, r) => s + r.rpeReportado, 0) / ultimos7.length
    : 0;

  const diasDesc = [...new Map(
    [...registros].sort((a, b) => b.fechaRealizacion.getTime() - a.fechaRealizacion.getTime())
      .map(r => [r.fechaRealizacion.toISOString().split('T')[0], r])
  ).values()];
  let consecutivas = 0;
  for (const r of diasDesc) {
    if (r.rpeReportado > 8.7) consecutivas++;
    else break;
  }

  if (rpe7 > 8.7 && consecutivas >= 5) return 'ROJA';
  if (rpe7 > 8.5) return 'AMARILLA';
  return 'VERDE';
}

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const url = new URL(req.url);
  const sesionId = url.searchParams.get('sesionId');
  if (!sesionId) return Response.json({ error: 'sesionId requerido' }, { status: 400 });

  const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
  if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  // Fatigue state from last 30 days
  const hace30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const registrosFatiga = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: athlete.id, fechaRealizacion: { gte: hace30 } },
    select: { rpeReportado: true, fechaRealizacion: true },
    orderBy: { fechaRealizacion: 'desc' },
  });
  const estadoFatiga = calcFatiga(registrosFatiga);

  // Get exercises for the requested session
  const ejercicios = await prisma.ejercicioSesion.findMany({
    where: { sesionId },
    select: {
      id: true,
      ejercicioNombre: true,
      rpeProgramado: true,
      pesoProgramado: true,
    },
  });

  if (!ejercicios.length) return Response.json({ sugerencias: {} });

  // For each exercise, find the most recent logged set by this athlete
  const nombreList = [...new Set(ejercicios.map(e => e.ejercicioNombre))];

  const [ultimosPorNombre, todosLosSets] = await Promise.all([
    Promise.all(
      nombreList.map(nombre =>
        prisma.seguimientoAtleta.findFirst({
          where: { athleteId: athlete.id, ejercicioSesion: { ejercicioNombre: nombre } },
          orderBy: { fechaRealizacion: 'desc' },
          select: {
            pesoUsado: true,
            repsRealizadas: true,
            rpeReportado: true,
            fechaRealizacion: true,
            ejercicioSesion: { select: { rpeProgramado: true } },
          },
        })
      )
    ),
    // All historical sets per exercise to find all-time best 1RM
    Promise.all(
      nombreList.map(nombre =>
        prisma.seguimientoAtleta.findMany({
          where: { athleteId: athlete.id, ejercicioSesion: { ejercicioNombre: nombre } },
          select: { pesoUsado: true, repsRealizadas: true },
        })
      )
    ),
  ]);

  const ultimosMap = new Map(nombreList.map((nombre, i) => [nombre, ultimosPorNombre[i]]));

  // Best all-time estimated 1RM per exercise name
  const maxRmMap = new Map<string, number>(
    nombreList.map((nombre, i) => {
      const sets = todosLosSets[i];
      if (!sets.length) return [nombre, 0];
      const best = Math.max(...sets.map(s =>
        s.repsRealizadas === 1 ? s.pesoUsado : s.pesoUsado * (1 + s.repsRealizadas / 30)
      ));
      return [nombre, Math.round(best * 10) / 10];
    })
  );

  type Sugerencia = {
    ultimoPeso: number;
    ultimoRpe: number;
    rpeProgramado: number;
    pesoProgramado: number | null;
    pesoPropuesto: number;
    delta: number;
    fecha: string;
  };

  const sugerencias: Record<string, Sugerencia> = {};
  const maxrm: Record<string, number> = {};

  for (const ej of ejercicios) {
    const ultimo = ultimosMap.get(ej.ejercicioNombre);
    const best = maxRmMap.get(ej.ejercicioNombre) ?? 0;
    if (best > 0) maxrm[ej.id] = best;

    if (!ultimo) continue;

    const pesoPropuesto = suggestNextWeight(ultimo.pesoUsado, ultimo.rpeReportado, ej.rpeProgramado);
    const delta = pesoPropuesto - ultimo.pesoUsado;

    sugerencias[ej.id] = {
      ultimoPeso: ultimo.pesoUsado,
      ultimoRpe: ultimo.rpeReportado,
      rpeProgramado: ej.rpeProgramado,
      pesoProgramado: ej.pesoProgramado,
      pesoPropuesto,
      delta,
      fecha: ultimo.fechaRealizacion.toISOString().split('T')[0],
    };
  }

  return Response.json({ sugerencias, estadoFatiga, maxrm });
}
