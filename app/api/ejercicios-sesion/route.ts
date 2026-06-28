import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { z } from 'zod';

const ejercicioSchema = z.object({
  sesion_id: z.string().cuid(),
  ejercicio_nombre: z.string().min(1),
  tipo_ejercicio: z.enum(['COMPETITIVO', 'VARIANTE', 'AUXILIAR', 'COMPENSATORIO', 'MOVILIDAD']),
  orden_grupo: z.string().optional(),
  carga_ref: z.string().optional(),
  rir_label: z.string().optional(),
  sets_programados: z.number().int().min(1),
  reps_programadas: z.number().int().min(1),
  rpe_programado: z.number().min(6).max(10),
  peso_programado: z.number().optional(),
  rest_minutos: z.number().int().default(3),
  notas_tecnicas: z.string().optional(),
  video_url: z.string().nullable().optional(),
  orden: z.number().int(),
});

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const data = ejercicioSchema.parse(body);

    // Inherit video URL from any existing record with same exercise name
    let inheritedVideoUrl: string | null = data.video_url ?? null;
    if (!inheritedVideoUrl) {
      const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
      if (coach) {
        const existing = await prisma.ejercicioSesion.findFirst({
          where: {
            ejercicioNombre: { equals: data.ejercicio_nombre, mode: 'insensitive' },
            videoUrl: { not: null },
            sesion: { bloque: { periodizacion: { coachId: coach.id } } },
          },
          select: { videoUrl: true },
        });
        inheritedVideoUrl = existing?.videoUrl ?? null;

        // Also check biblioteca
        if (!inheritedVideoUrl) {
          const bib = await prisma.ejercicioBiblioteca.findFirst({
            where: {
              coachId: coach.id,
              nombre: { equals: data.ejercicio_nombre, mode: 'insensitive' },
              videoUrl: { not: null },
            },
            select: { videoUrl: true },
          });
          inheritedVideoUrl = bib?.videoUrl ?? null;
        }
      }
    }

    const ejercicio = await prisma.ejercicioSesion.create({
      data: {
        sesionId: data.sesion_id,
        ejercicioNombre: data.ejercicio_nombre,
        tipoEjercicio: data.tipo_ejercicio,
        ordenGrupo: data.orden_grupo,
        cargaRef: data.carga_ref,
        rirLabel: data.rir_label,
        setsProgramados: data.sets_programados,
        repsProgramadas: data.reps_programadas,
        rpeProgramado: data.rpe_programado,
        pesoProgramado: data.peso_programado,
        restMinutos: data.rest_minutos,
        notasTecnicas: data.notas_tecnicas,
        videoUrl: inheritedVideoUrl,
        orden: data.orden,
      },
    });

    return Response.json(ejercicio, { status: 201 });
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
}
