import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody, strOrNull } from '@/lib/api-validation';

// Solo campos editables — antes el PUT pasaba el body completo a Prisma
const putSchema = z.object({
  nombre: z.string().min(1).optional(),
  tipo: z.enum(['LINEAL', 'ONDULANTE', 'CONJUGADA', 'POR_BLOQUES']).optional(),
  objetivo: z.string().optional(),
  descripcion: strOrNull.optional(),
  fechaInicio: z.coerce.date().optional(),
  fechaFin: z.coerce.date().optional(),
  duracionSemanas: z.coerce.number().int().min(1).max(52).optional(),
});

const patchSchema = z.object({
  semanaMaxVisible: z.coerce.number().int().min(1).nullable(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  try {
    const data = await prisma.periodizacion.findUnique({
      where: { id },
      include: {
        athlete: {
          select: {
            id: true,
            pesoActual: true,
            altura: true,
            edad: true,
            categoriaPeso: true,
            experienciaPowerlifting: true,
            lesionesActuales: true,
            objetivos: true,
            rmSquat: true,
            rmBench: true,
            rmDeadlift: true,
            user: { select: { nombre: true } },
          },
        },
        fasesBasico: {
          orderBy: [{ basico: 'asc' }, { semanaInicio: 'asc' }],
        },
        bloques: {
          orderBy: { numeroBloque: 'asc' },
          include: {
            sesiones: {
              orderBy: [{ numeroSemana: 'asc' }, { ordenSecuencia: 'asc' }],
              include: {
                ejercicios: {
                  orderBy: { orden: 'asc' },
                  include: {
                    seguimiento: {
                      orderBy: { numeroSet: 'asc' },
                      select: {
                        numeroSet: true,
                        repsRealizadas: true,
                        pesoUsado: true,
                        rpeReportado: true,
                        completado: true,
                        notasAtleta: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!data) return Response.json({ error: 'No encontrado' }, { status: 404 });
    return Response.json(data);
  } catch (e) {
    console.error('[GET /api/periodizaciones/[id]]', e);
    return Response.json({ error: 'Error interno', detail: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { data: body, error } = await parseBody(req, putSchema);
  if (error) return error;

  const existing = await prisma.periodizacion.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: 'No encontrado' }, { status: 404 });
  if (existing.estado !== 'DRAFT') return Response.json({ error: 'Solo se puede editar en estado DRAFT' }, { status: 400 });

  const data = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
  const updated = await prisma.periodizacion.update({ where: { id }, data });
  return Response.json(updated);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { data: body, error } = await parseBody(req, patchSchema);
  if (error) return error;

  const updated = await prisma.periodizacion.update({
    where: { id },
    data: { semanaMaxVisible: body.semanaMaxVisible },
  });
  return Response.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.periodizacion.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: 'No encontrado' }, { status: 404 });
  if (existing.estado !== 'DRAFT') return Response.json({ error: 'Solo se puede eliminar en estado DRAFT' }, { status: 400 });

  await prisma.periodizacion.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
