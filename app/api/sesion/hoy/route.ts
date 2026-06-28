import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

const DIAS: Record<number, string> = {
  0: 'domingo', 1: 'lunes', 2: 'martes', 3: 'miercoles',
  4: 'jueves', 5: 'viernes', 6: 'sabado',
};

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
  if (!athlete) return Response.json({ error: 'Perfil de atleta no encontrado' }, { status: 404 });

  const periodizacion = await prisma.periodizacion.findFirst({
    where: { athleteId: athlete.id, estado: 'ACTIVE' },
    include: {
      bloques: {
        include: {
          sesiones: {
            include: { ejercicios: { orderBy: { orden: 'asc' } } },
          },
        },
      },
    },
  });

  if (!periodizacion) return Response.json({ error: 'Sin periodización activa' }, { status: 404 });

  const hoy = DIAS[new Date().getDay()];
  const now = new Date();
  const startDate = new Date(periodizacion.fechaInicio);
  const weekNumber = Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  let sesionHoy = null;
  let bloqueInfo: { nombre: string; enfasis: string } | null = null;

  for (const bloque of periodizacion.bloques) {
    if (weekNumber >= bloque.semanaInicio && weekNumber <= bloque.semanaFin) {
      sesionHoy = bloque.sesiones.find(
        (s) => s.diaSemana === hoy && s.numeroSemana === weekNumber
      ) ?? bloque.sesiones.find((s) => s.diaSemana === hoy) ?? null;
      bloqueInfo = { nombre: bloque.nombre, enfasis: bloque.enfasis };
      break;
    }
  }

  // Look back up to 2 calendar days for sessions with no logged sets
  const seenIds = new Set<string>(sesionHoy ? [sesionHoy.id] : []);
  const pendientes: { id: string; movimientoPrincipal: string; diaSemana: string; numeroSemana: number }[] = [];

  for (let daysBack = 1; daysBack <= 2; daysBack++) {
    const checkDate = new Date(now);
    checkDate.setDate(checkDate.getDate() - daysBack);
    const checkDia = DIAS[checkDate.getDay()];
    const checkWeek = Math.max(1, Math.floor((checkDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1);

    for (const bloque of periodizacion.bloques) {
      if (checkWeek >= bloque.semanaInicio && checkWeek <= bloque.semanaFin) {
        const s = bloque.sesiones.find((s) => s.diaSemana === checkDia && s.numeroSemana === checkWeek)
          ?? bloque.sesiones.find((s) => s.diaSemana === checkDia)
          ?? null;
        if (s && !seenIds.has(s.id)) {
          seenIds.add(s.id);
          const count = await prisma.seguimientoAtleta.count({
            where: { athleteId: athlete.id, ejercicioSesion: { sesionId: s.id } },
          });
          if (count === 0) {
            pendientes.push({
              id: s.id,
              movimientoPrincipal: s.movimientoPrincipal,
              diaSemana: s.diaSemana,
              numeroSemana: s.numeroSemana,
            });
          }
        }
        break;
      }
    }
  }

  return Response.json({
    sesion: sesionHoy,
    semana_actual: weekNumber,
    bloque: bloqueInfo,
    sesiones_pendientes: pendientes,
  });
}
