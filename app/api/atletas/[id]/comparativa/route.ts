import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  const athlete = await prisma.athleteProfile.findFirst({ where: { id, coachId: coach.id } });
  if (!athlete) return Response.json({ error: 'No encontrado' }, { status: 404 });

  const url = new URL(req.url);
  const weeks = Number(url.searchParams.get('semanas') ?? '8');
  const desde = new Date();
  desde.setDate(desde.getDate() - weeks * 7);

  const seguimientos = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: id, fechaRealizacion: { gte: desde } },
    include: {
      ejercicioSesion: {
        include: {
          sesion: {
            include: {
              bloque: { select: { nombre: true } },
            },
          },
        },
      },
    },
    orderBy: { fechaRealizacion: 'desc' },
  });

  // Group by (date, sesionId)
  type EjEntry = {
    nombre: string;
    tipo: string;
    programado: { sets: number; reps: number; rpe: number; peso: number | null; carga_ref: string | null; rir_label: string | null };
    setsLog: Array<{ reps: number; peso: number; rpe: number; numeroSet: number }>;
  };
  type SesEntry = {
    fecha: string;
    sesionId: string;
    movimientoPrincipal: string;
    enfoqueDia: string;
    bloqueNombre: string;
    ejMap: Map<string, EjEntry>;
  };

  const sesionMap = new Map<string, SesEntry>();

  for (const seg of seguimientos) {
    const ej = seg.ejercicioSesion;
    const ses = ej.sesion;
    const fecha = seg.fechaRealizacion.toISOString().slice(0, 10);
    const key = `${fecha}__${ses.id}`;

    if (!sesionMap.has(key)) {
      sesionMap.set(key, {
        fecha,
        sesionId: ses.id,
        movimientoPrincipal: ses.movimientoPrincipal,
        enfoqueDia: ses.enfocuoDia,
        bloqueNombre: ses.bloque.nombre,
        ejMap: new Map(),
      });
    }

    const entry = sesionMap.get(key)!;
    if (!entry.ejMap.has(ej.id)) {
      entry.ejMap.set(ej.id, {
        nombre: ej.ejercicioNombre,
        tipo: ej.tipoEjercicio,
        programado: {
          sets: ej.setsProgramados,
          reps: ej.repsProgramadas,
          rpe: ej.rpeProgramado,
          peso: ej.pesoProgramado,
          carga_ref: ej.cargaRef,
          rir_label: ej.rirLabel,
        },
        setsLog: [],
      });
    }

    entry.ejMap.get(ej.id)!.setsLog.push({
      reps: seg.repsRealizadas,
      peso: seg.pesoUsado,
      rpe: seg.rpeReportado,
      numeroSet: seg.numeroSet,
    });
  }

  const sesiones = [...sesionMap.values()].map(ses => {
    const ejercicios = [...ses.ejMap.values()].map(ej => {
      const n = ej.setsLog.length;
      const repsPromedio = n > 0 ? +(ej.setsLog.reduce((s, x) => s + x.reps, 0) / n).toFixed(1) : 0;
      const pesoPromedio = n > 0 ? +(ej.setsLog.reduce((s, x) => s + x.peso, 0) / n).toFixed(1) : 0;
      const rpePromedio = n > 0 ? Math.round((ej.setsLog.reduce((s, x) => s + x.rpe, 0) / n) * 2) / 2 : 0;

      return {
        nombre: ej.nombre,
        tipo: ej.tipo,
        programado: ej.programado,
        ejecutado: { sets: n, reps_promedio: repsPromedio, peso_promedio: pesoPromedio, rpe_promedio: rpePromedio },
        rpe_vs_programado: +(rpePromedio - ej.programado.rpe).toFixed(2),
        sets_pct: ej.programado.sets > 0 ? Math.min(100, Math.round((n / ej.programado.sets) * 100)) : 0,
      };
    });

    const rpePromSesion = ejercicios.length > 0
      ? Math.round((ejercicios.reduce((s, e) => s + e.ejecutado.rpe_promedio, 0) / ejercicios.length) * 2) / 2
      : 0;
    const conformidad = ejercicios.length > 0
      ? Math.round(ejercicios.reduce((s, e) => s + e.sets_pct, 0) / ejercicios.length)
      : 0;

    return {
      fecha: ses.fecha,
      sesion_id: ses.sesionId,
      movimiento_principal: ses.movimientoPrincipal,
      enfoque_dia: ses.enfoqueDia,
      bloque_nombre: ses.bloqueNombre,
      rpe_promedio: rpePromSesion,
      conformidad,
      ejercicios,
    };
  });

  return Response.json({ sesiones });
}
