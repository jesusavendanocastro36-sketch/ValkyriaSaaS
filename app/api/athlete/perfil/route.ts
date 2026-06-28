import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { z } from 'zod';

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const athlete = await prisma.athleteProfile.findUnique({
    where: { userId: payload.userId },
    select: {
      id: true,
      pesoActual: true,
      altura: true,
      edad: true,
      categoriaPeso: true,
      experienciaPowerlifting: true,
      lesionesActuales: true,
      objetivos: true,
      equipamiento: true,
      diasDisponibles: true,
      rmSquat: true,
      rmBench: true,
      rmDeadlift: true,
      user: { select: { nombre: true, email: true } },
    },
  });

  if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });
  return Response.json(athlete);
}

const DIAS_VALIDOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;

const perfilSchema = z.object({
  equipamiento: z.array(z.string()).optional(),
  diasDisponibles: z.array(z.enum(DIAS_VALIDOS)).optional(),
  pesoActual: z.number().positive().nullable().optional(),
  altura: z.number().positive().nullable().optional(),
  edad: z.number().int().positive().nullable().optional(),
  categoriaPeso: z.string().nullable().optional(),
  experienciaPowerlifting: z.enum(['principiante', 'intermedio', 'avanzado', 'elite']).optional(),
  rmSquat: z.number().positive().nullable().optional(),
  rmBench: z.number().positive().nullable().optional(),
  rmDeadlift: z.number().positive().nullable().optional(),
  lesionesActuales: z.array(z.string()).optional(),
  objetivos: z.array(z.string()).optional(),
});

export async function PATCH(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
  if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const body = await req.json();
  const parsed = perfilSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });

  const updated = await prisma.athleteProfile.update({
    where: { id: athlete.id },
    data: parsed.data,
  });

  return Response.json(updated);
}
