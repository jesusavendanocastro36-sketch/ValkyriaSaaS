import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { estimateOneRM } from '@/lib/formulas';

function esLevantamiento(nombre: string): 'sq' | 'bp' | 'dl' | null {
  const n = nombre.toLowerCase();
  if (n.includes('sentadilla') || n.includes('squat')) return 'sq';
  if (n.includes('banca') || n.includes('bench') || n.includes('press de banca')) return 'bp';
  if (n.includes('peso muerto') || n.includes('deadlift') || n.includes('sumo')) return 'dl';
  return null;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  const athlete = await prisma.athleteProfile.findFirst({ where: { id, coachId: coach.id }, select: { id: true } });
  if (!athlete) return Response.json({ error: 'No encontrado' }, { status: 404 });

  // Fetch all sets with full block context
  const sets = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: id },
    select: {
      fechaRealizacion: true,
      rpeReportado: true,
      pesoUsado: true,
      repsRealizadas: true,
      ejercicioSesion: {
        select: {
          ejercicioNombre: true,
          tipoEjercicio: true,
          sesion: {
            select: {
              bloque: {
                select: {
                  id: true,
                  nombre: true,
                  enfasis: true,
                  numeroBloque: true,
                  semanaInicio: true,
                  semanaFin: true,
                  intensidadRpeMin: true,
                  intensidadRpeMax: true,
                  periodizacion: {
                    select: { nombre: true, tipo: true, id: true },
                  },
                  _count: { select: { sesiones: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  // Group sets by block
  type SetEntry = typeof sets[number];
  const bloqueMap = new Map<string, { meta: SetEntry['ejercicioSesion']['sesion']['bloque']; sets: SetEntry[] }>();

  for (const s of sets) {
    const bloque = s.ejercicioSesion.sesion.bloque;
    if (!bloqueMap.has(bloque.id)) bloqueMap.set(bloque.id, { meta: bloque, sets: [] });
    bloqueMap.get(bloque.id)!.sets.push(s);
  }

  const resultado = [...bloqueMap.entries()].map(([, { meta: b, sets: bSets }]) => {
    const semanas = b.semanaFin - b.semanaInicio + 1;
    const sesionesProgramadas = b._count.sesiones * semanas;

    const dias = new Set(bSets.map(s => s.fechaRealizacion.toISOString().slice(0, 10)));
    const sesionesRealizadas = dias.size;

    const rpePromedio = bSets.length > 0
      ? +(bSets.reduce((acc, s) => acc + s.rpeReportado, 0) / bSets.length).toFixed(2)
      : null;

    const tonelajeTotal = Math.round(bSets.reduce((acc, s) => acc + s.pesoUsado * s.repsRealizadas, 0));
    const adherencia = sesionesProgramadas > 0
      ? Math.min(100, Math.round((sesionesRealizadas / sesionesProgramadas) * 100))
      : 0;

    // 1RM comparison: first 25% of days vs last 25%
    const diasOrdenados = [...dias].sort();
    const corte = Math.max(1, Math.floor(diasOrdenados.length * 0.25));
    const diasInicio = new Set(diasOrdenados.slice(0, corte));
    const diasFin = new Set(diasOrdenados.slice(-corte));

    const lifts: Record<'sq' | 'bp' | 'dl', { inicio: number; fin: number; delta: number } | null> = { sq: null, bp: null, dl: null };

    for (const lift of ['sq', 'bp', 'dl'] as const) {
      const liftSets = bSets.filter(
        s => esLevantamiento(s.ejercicioSesion.ejercicioNombre) === lift && s.ejercicioSesion.tipoEjercicio === 'COMPETITIVO'
      );
      if (liftSets.length < 2) continue;

      const rmsInicio = liftSets
        .filter(s => diasInicio.has(s.fechaRealizacion.toISOString().slice(0, 10)))
        .map(s => estimateOneRM(s.pesoUsado, s.repsRealizadas));
      const rmsFin = liftSets
        .filter(s => diasFin.has(s.fechaRealizacion.toISOString().slice(0, 10)))
        .map(s => estimateOneRM(s.pesoUsado, s.repsRealizadas));

      if (!rmsInicio.length || !rmsFin.length) continue;

      const inicio = Math.round(Math.max(...rmsInicio));
      const fin = Math.round(Math.max(...rmsFin));
      lifts[lift] = { inicio, fin, delta: fin - inicio };
    }

    return {
      bloqueId: b.id,
      periId: b.periodizacion.id,
      periNombre: b.periodizacion.nombre,
      periTipo: b.periodizacion.tipo,
      bloqueNombre: b.nombre,
      enfasis: b.enfasis,
      numeroBloque: b.numeroBloque,
      semanaInicio: b.semanaInicio,
      semanaFin: b.semanaFin,
      rpeTarget: { min: b.intensidadRpeMin, max: b.intensidadRpeMax },
      sesionesRealizadas,
      sesionesProgramadas,
      adherencia,
      rpePromedio,
      tonelajeTotal,
      lifts,
    };
  });

  // Sort by periodization then block number
  resultado.sort((a, b) => a.periId.localeCompare(b.periId) || a.numeroBloque - b.numeroBloque);

  return Response.json({ bloques: resultado });
}
