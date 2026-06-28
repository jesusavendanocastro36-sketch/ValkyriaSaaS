import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { z } from 'zod';

const patchSchema = z.object({
  dia_semana: z.string().optional(),
  movimiento_principal: z.string().min(1).optional(),
  enfocuo_dia: z.string().optional(),
  numero_semana: z.number().int().min(1).optional(),
  orden_secuencia: z.number().int().optional(),
  descripcion: z.string().nullable().optional(),
  bloqueado: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const data = patchSchema.parse(body);

    const updated = await prisma.sesionEntrenamiento.update({
      where: { id },
      data: {
        ...(data.dia_semana !== undefined && { diaSemana: data.dia_semana }),
        ...(data.movimiento_principal !== undefined && { movimientoPrincipal: data.movimiento_principal }),
        ...(data.enfocuo_dia !== undefined && { enfocuoDia: data.enfocuo_dia }),
        ...(data.numero_semana !== undefined && { numeroSemana: data.numero_semana }),
        ...(data.orden_secuencia !== undefined && { ordenSecuencia: data.orden_secuencia }),
        ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
        ...(data.bloqueado !== undefined && { bloqueado: data.bloqueado }),
      },
    });

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
    await prisma.sesionEntrenamiento.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: 'No encontrado' }, { status: 404 });
  }
}
