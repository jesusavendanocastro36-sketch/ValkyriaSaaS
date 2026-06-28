import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody } from '@/lib/api-validation';

const postSchema = z.object({ targetSesionId: z.string().min(1) });

// Copies all exercises from one session into another session (same or different week)
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id: sourceSesionId } = await params;
  const { data, error } = await parseBody(req, postSchema);
  if (error) return error;
  const { targetSesionId } = data;

  const source = await prisma.sesionEntrenamiento.findUnique({
    where: { id: sourceSesionId },
    include: { ejercicios: { orderBy: { orden: 'asc' } } },
  });
  if (!source) return Response.json({ error: 'Sesión origen no encontrada' }, { status: 404 });

  const target = await prisma.sesionEntrenamiento.findUnique({ where: { id: targetSesionId } });
  if (!target) return Response.json({ error: 'Sesión destino no encontrada' }, { status: 404 });

  // Delete existing exercises in target to replace them
  await prisma.ejercicioSesion.deleteMany({ where: { sesionId: targetSesionId } });

  // Clone all exercises from source to target
  await prisma.ejercicioSesion.createMany({
    data: source.ejercicios.map(ej => ({
      sesionId: targetSesionId,
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

  return Response.json({ copiados: source.ejercicios.length });
}
