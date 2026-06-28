import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { z } from 'zod';

const bloqueSchema = z.object({
  periodizacion_id: z.string().cuid(),
  numero_bloque: z.number().int().min(1),
  nombre: z.string().min(1),
  semana_inicio: z.number().int().min(1),
  semana_fin: z.number().int().min(1),
  enfasis: z.string().min(1),
  intensidad_rpe_min: z.number().min(6).max(10),
  intensidad_rpe_max: z.number().min(6).max(10),
  volumen_reps_min: z.number().int().optional(),
  volumen_reps_max: z.number().int().optional(),
});

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const data = bloqueSchema.parse(body);

    const bloque = await prisma.bloqueEntrenamiento.create({
      data: {
        periodizacionId: data.periodizacion_id,
        numeroBloque: data.numero_bloque,
        nombre: data.nombre,
        semanaInicio: data.semana_inicio,
        semanaFin: data.semana_fin,
        enfasis: data.enfasis,
        intensidadRpeMin: data.intensidad_rpe_min,
        intensidadRpeMax: data.intensidad_rpe_max,
        volumenRepsMin: data.volumen_reps_min,
        volumenRepsMax: data.volumen_reps_max,
      },
    });

    return Response.json(bloque, { status: 201 });
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
}
