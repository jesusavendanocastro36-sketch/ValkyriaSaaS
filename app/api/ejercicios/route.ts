import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { z } from 'zod';

const createSchema = z.object({
  nombre: z.string().min(2),
  categoria: z.enum(['COMPETITIVO', 'VARIANTE', 'AUXILIAR', 'COMPENSATORIO', 'MOVILIDAD']),
  gruposMusculares: z.array(z.string()).default([]),
  musculosSecundarios: z.array(z.string()).default([]),
  descripcion: z.string().optional(),
  cuesTecnicos: z.array(z.string()).default([]),
  notasSeguridad: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
  equipamientoReq: z.array(z.string()).default([]),
  parentId: z.string().optional(),
});

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const categoria = searchParams.get('categoria') ?? undefined;

  // Return only root exercises (parentId null) with two levels of variantes nested
  const data = await prisma.ejercicioBiblioteca.findMany({
    where: {
      coachId: coach.id,
      parentId: null,
      ...(categoria && { categoria: categoria as never }),
    },
    include: {
      variantes: {
        orderBy: { nombre: 'asc' },
        include: {
          variantes: {
            orderBy: { nombre: 'asc' },
          },
        },
      },
    },
    orderBy: [{ categoria: 'asc' }, { nombre: 'asc' }],
  });

  const total = data.reduce((acc, e) => acc + 1 + e.variantes.length, 0);
  return Response.json({ data, total });
}

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  try {
    const body = createSchema.parse(await req.json());
    const data = await prisma.ejercicioBiblioteca.create({
      data: {
        ...body,
        coachId: coach.id,
        videoUrl: body.videoUrl || null,
        parentId: body.parentId || null,
      },
    });
    return Response.json(data, { status: 201 });
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
}
