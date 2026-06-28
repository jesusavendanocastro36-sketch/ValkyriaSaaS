import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { periodizacionSchema } from '@/lib/validators';

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get('estado') ?? undefined;
  const athleteId = searchParams.get('athlete_id') ?? undefined;

  let where: Record<string, unknown> = {};

  if (payload.rol === 'ADMIN') {
    const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
    if (!coach) return Response.json({ error: 'Perfil de coach no encontrado' }, { status: 404 });
    where = { coachId: coach.id, ...(estado && { estado }), ...(athleteId && { athleteId }) };
  } else {
    const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
    if (!athlete) return Response.json({ error: 'Perfil de atleta no encontrado' }, { status: 404 });
    where = { athleteId: athlete.id, estado: 'ACTIVE' };
  }

  const data = await prisma.periodizacion.findMany({
    where,
    include: {
      athlete: { include: { user: { select: { nombre: true } } } },
      _count: { select: { bloques: true } },
      bloques: {
        select: { semanaInicio: true, semanaFin: true, nombre: true, enfasis: true },
        orderBy: { numeroBloque: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({ data, total: data.length });
}

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const { nombre, tipo, athlete_id, fecha_inicio, fecha_fin, duracion_semanas, objetivo, descripcion, fecha_competencia } =
      periodizacionSchema.parse(body);

    const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
    if (!coach) return Response.json({ error: 'Perfil de coach no encontrado' }, { status: 404 });

    const periodizacion = await prisma.periodizacion.create({
      data: {
        coachId: coach.id,
        athleteId: athlete_id,
        nombre,
        tipo,
        fechaInicio: new Date(fecha_inicio),
        fechaFin: new Date(fecha_fin),
        duracionSemanas: duracion_semanas,
        objetivo,
        descripcion,
        ...(fecha_competencia ? { fechaCompetencia: new Date(fecha_competencia) } : {}),
      },
    });

    return Response.json(periodizacion, { status: 201 });
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
}
