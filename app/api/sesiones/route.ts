import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { z } from 'zod';

const sesionSchema = z.object({
  bloque_id: z.string().cuid(),
  numero_semana: z.number().int().min(1),
  dia_semana: z.enum(['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']),
  movimiento_principal: z.string().min(1),
  enfocuo_dia: z.string().min(1),
  descripcion: z.string().optional(),
  orden_secuencia: z.number().int().optional(),
});

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const data = sesionSchema.parse(body);

    const sesion = await prisma.sesionEntrenamiento.create({
      data: {
        bloqueId: data.bloque_id,
        numeroSemana: data.numero_semana,
        diaSemana: data.dia_semana,
        movimientoPrincipal: data.movimiento_principal,
        enfocuoDia: data.enfocuo_dia,
        descripcion: data.descripcion,
        ordenSecuencia: data.orden_secuencia,
      },
    });

    return Response.json(sesion, { status: 201 });
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
}
