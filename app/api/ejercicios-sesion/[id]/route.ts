import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { z } from 'zod';

const patchSchema = z.object({
  ejercicio_nombre: z.string().min(1).optional(),
  tipo_ejercicio: z.enum(['COMPETITIVO', 'VARIANTE', 'AUXILIAR', 'COMPENSATORIO', 'MOVILIDAD']).optional(),
  orden_grupo: z.string().nullable().optional(),
  carga_ref: z.string().nullable().optional(),
  rir_label: z.string().nullable().optional(),
  sets_programados: z.number().int().min(1).optional(),
  reps_programadas: z.number().int().min(1).optional(),
  rpe_programado: z.number().min(6).max(10).optional(),
  peso_programado: z.number().nullable().optional(),
  rest_minutos: z.number().int().optional(),
  notas_tecnicas: z.string().nullable().optional(),
  video_url: z.string().nullable().optional(),
  orden: z.number().int().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    const updated = await prisma.ejercicioSesion.update({
      where: { id },
      data: {
        ...(data.ejercicio_nombre !== undefined && { ejercicioNombre: data.ejercicio_nombre }),
        ...(data.tipo_ejercicio !== undefined && { tipoEjercicio: data.tipo_ejercicio }),
        ...(data.orden_grupo !== undefined && { ordenGrupo: data.orden_grupo }),
        ...(data.carga_ref !== undefined && { cargaRef: data.carga_ref }),
        ...(data.rir_label !== undefined && { rirLabel: data.rir_label }),
        ...(data.sets_programados !== undefined && { setsProgramados: data.sets_programados }),
        ...(data.reps_programadas !== undefined && { repsProgramadas: data.reps_programadas }),
        ...(data.rpe_programado !== undefined && { rpeProgramado: data.rpe_programado }),
        ...(data.peso_programado !== undefined && { pesoProgramado: data.peso_programado }),
        ...(data.rest_minutos !== undefined && { restMinutos: data.rest_minutos }),
        ...(data.notas_tecnicas !== undefined && { notasTecnicas: data.notas_tecnicas }),
        ...(data.video_url !== undefined && { videoUrl: data.video_url }),
        ...(data.orden !== undefined && { orden: data.orden }),
      },
    });

    // Propagate video URL to all sessions with same exercise name across coach's periodizations
    if (data.video_url !== undefined) {
      const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
      if (coach) {
        await prisma.ejercicioSesion.updateMany({
          where: {
            id: { not: id },
            ejercicioNombre: { equals: updated.ejercicioNombre, mode: 'insensitive' },
            sesion: { bloque: { periodizacion: { coachId: coach.id } } },
          },
          data: { videoUrl: data.video_url },
        });

        // Also sync to biblioteca if the exercise exists there
        await prisma.ejercicioBiblioteca.updateMany({
          where: {
            coachId: coach.id,
            nombre: { equals: updated.ejercicioNombre, mode: 'insensitive' },
          },
          data: { videoUrl: data.video_url },
        });
      }
    }

    return Response.json(updated);
  } catch (e) {
    return Response.json({ error: 'Datos inválidos', detail: String(e) }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    await prisma.ejercicioSesion.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: 'No encontrado' }, { status: 404 });
  }
}
