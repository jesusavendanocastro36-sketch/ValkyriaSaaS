import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody } from '@/lib/api-validation';

const postSchema = z.object({
  bloqueId: z.string().min(1),
  semanaOrigen: z.coerce.number().int().min(1),
  semanaDestino: z.coerce.number().int().min(1),
}).refine(d => d.semanaOrigen !== d.semanaDestino, {
  message: 'El origen y destino deben ser semanas diferentes',
});

// POST: copy all sessions (with exercises) from semanaOrigen to semanaDestino within a bloque
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id: periodizacionId } = await params;
  const { data, error } = await parseBody(req, postSchema);
  if (error) return error;
  const { bloqueId, semanaOrigen, semanaDestino } = data;

  // Fetch all sessions of semanaOrigen in the given bloque with their exercises
  const sesionesOrigen = await prisma.sesionEntrenamiento.findMany({
    where: { bloqueId, numeroSemana: Number(semanaOrigen) },
    include: { ejercicios: { orderBy: { orden: 'asc' } } },
    orderBy: { ordenSecuencia: 'asc' },
  });

  if (sesionesOrigen.length === 0) {
    return Response.json({ error: 'No hay sesiones en la semana origen' }, { status: 404 });
  }

  // Verify the bloque belongs to this periodizacion
  const bloque = await prisma.bloqueEntrenamiento.findFirst({
    where: { id: bloqueId, periodizacionId },
  });
  if (!bloque) return Response.json({ error: 'Bloque no encontrado' }, { status: 404 });

  // Delete existing sessions in semanaDestino within the same bloque to replace them
  await prisma.sesionEntrenamiento.deleteMany({
    where: { bloqueId, numeroSemana: Number(semanaDestino) },
  });

  // Clone each session into semanaDestino
  let totalEjercicios = 0;
  for (const sesion of sesionesOrigen) {
    const nuevaSesion = await prisma.sesionEntrenamiento.create({
      data: {
        bloqueId,
        numeroSemana: Number(semanaDestino),
        diaSemana: sesion.diaSemana,
        movimientoPrincipal: sesion.movimientoPrincipal,
        enfocuoDia: sesion.enfocuoDia,
        descripcion: sesion.descripcion,
        ordenSecuencia: sesion.ordenSecuencia,
      },
    });

    if (sesion.ejercicios.length > 0) {
      await prisma.ejercicioSesion.createMany({
        data: sesion.ejercicios.map(ej => ({
          sesionId: nuevaSesion.id,
          ejercicioNombre: ej.ejercicioNombre,
          tipoEjercicio: ej.tipoEjercicio,
          ordenGrupo: ej.ordenGrupo,
          cargaRef: ej.cargaRef,
          rirLabel: ej.rirLabel,
          setsProgramados: ej.setsProgramados,
          repsProgramadas: ej.repsProgramadas,
          rpeProgramado: ej.rpeProgramado,
          pesoProgramado: ej.pesoProgramado,
          restMinutos: ej.restMinutos,
          notasTecnicas: ej.notasTecnicas,
          videoUrl: ej.videoUrl,
          orden: ej.orden,
        })),
      });
      totalEjercicios += sesion.ejercicios.length;
    }
  }

  return Response.json({
    ok: true,
    sesionesCopiadas: sesionesOrigen.length,
    ejerciciosCopiados: totalEjercicios,
  });
}
