import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

const schema = z.object({
  // Periodización destino. Si se omite, se duplica dentro de la misma del bloque origen.
  periodizacion_id: z.string().cuid().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const raw = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });

  // Bloque origen con sus sesiones y ejercicios (no se copia el seguimiento del atleta).
  const source = await prisma.bloqueEntrenamiento.findUnique({
    where: { id },
    include: { sesiones: { include: { ejercicios: true } } },
  });
  if (!source) return Response.json({ error: 'Bloque no encontrado' }, { status: 404 });

  const periodizacionId = parsed.data.periodizacion_id ?? source.periodizacionId;

  const target = await prisma.periodizacion.findUnique({ where: { id: periodizacionId } });
  if (!target) return Response.json({ error: 'Periodización destino no encontrada' }, { status: 404 });

  // El bloque pegado va al final (mayor numeroBloque + 1).
  const agg = await prisma.bloqueEntrenamiento.aggregate({
    where: { periodizacionId },
    _max: { numeroBloque: true },
  });
  const numeroBloque = (agg._max.numeroBloque ?? 0) + 1;

  const nuevo = await prisma.bloqueEntrenamiento.create({
    data: {
      periodizacionId,
      numeroBloque,
      nombre: `${source.nombre} (copia)`,
      semanaInicio: source.semanaInicio,
      semanaFin: source.semanaFin,
      enfasis: source.enfasis,
      intensidadRpeMin: source.intensidadRpeMin,
      intensidadRpeMax: source.intensidadRpeMax,
      volumenRepsMin: source.volumenRepsMin,
      volumenRepsMax: source.volumenRepsMax,
      sesiones: {
        create: source.sesiones.map(s => ({
          numeroSemana: s.numeroSemana,
          diaSemana: s.diaSemana,
          // No se copia la fecha concreta: el destino puede ser otra periodización.
          fecha: null,
          movimientoPrincipal: s.movimientoPrincipal,
          enfocuoDia: s.enfocuoDia,
          descripcion: s.descripcion,
          ordenSecuencia: s.ordenSecuencia,
          bloqueado: false,
          ejercicios: {
            create: s.ejercicios.map(ej => ({
              ejercicioNombre: ej.ejercicioNombre,
              tipoEjercicio: ej.tipoEjercicio,
              setsProgramados: ej.setsProgramados,
              repsProgramadas: ej.repsProgramadas,
              rpeProgramado: ej.rpeProgramado,
              pesoProgramado: ej.pesoProgramado,
              restMinutos: ej.restMinutos,
              notasTecnicas: ej.notasTecnicas,
              orden: ej.orden,
              cargaRef: ej.cargaRef,
              ordenGrupo: ej.ordenGrupo,
              rirLabel: ej.rirLabel,
              videoUrl: ej.videoUrl,
            })),
          },
        })),
      },
    },
    include: { sesiones: { include: { ejercicios: true } } },
  });

  return Response.json(nuevo, { status: 201 });
}
