import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { seguimientoSchema } from '@/lib/validators';
import { calcTonnage } from '@/lib/formulas';

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const { ejercicio_sesion_id, numero_set, reps_realizadas, peso_usado, rpe_reportado, notas } =
      seguimientoSchema.parse(body);

    const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
    if (!athlete) return Response.json({ error: 'Perfil de atleta no encontrado' }, { status: 404 });

    const registro = await prisma.seguimientoAtleta.create({
      data: {
        ejercicioSesionId: ejercicio_sesion_id,
        athleteId: athlete.id,
        fechaRealizacion: new Date(),
        numeroSet: numero_set,
        repsRealizadas: reps_realizadas,
        pesoUsado: peso_usado,
        rpeReportado: rpe_reportado,
        notasAtleta: notas,
      },
    });

    const tonelaje = calcTonnage(peso_usado, reps_realizadas, 1);
    return Response.json({ id: registro.id, tonelaje, mensaje: 'Set registrado' }, { status: 201 });
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
}

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sesionId = searchParams.get('sesion_id');
  if (!sesionId) return Response.json({ error: 'Falta sesion_id' }, { status: 400 });

  const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
  if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const registros = await prisma.seguimientoAtleta.findMany({
    where: {
      athleteId: athlete.id,
      ejercicioSesion: { sesionId },
    },
    include: { ejercicioSesion: true },
    orderBy: [{ ejercicioSesionId: 'asc' }, { numeroSet: 'asc' }],
  });

  const tonelajeTotal = registros.reduce((acc, r) => acc + calcTonnage(r.pesoUsado, r.repsRealizadas, 1), 0);
  return Response.json({ seguimiento: registros, tonelaje_total: tonelajeTotal });
}
