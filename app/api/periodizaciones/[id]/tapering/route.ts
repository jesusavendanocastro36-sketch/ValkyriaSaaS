import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { callClaudeJSON } from '@/lib/anthropic';
import { PROMPTS } from '@/lib/ai-prompts';
import { parseBody } from '@/lib/api-validation';

const patchSchema = z.object({
  fechaCompetencia: z.string().nullable(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const { data, error } = await parseBody(req, patchSchema);
  if (error) return error;
  const { fechaCompetencia } = data;

  const updated = await prisma.periodizacion.update({
    where: { id },
    data: { fechaCompetencia: fechaCompetencia ? new Date(fechaCompetencia) : null },
    select: { id: true, fechaCompetencia: true },
  });

  return Response.json(updated);
}

type TaperingAI = {
  tipo_tapering: 'IDEAL' | 'FATIGADO' | 'INCANSABLE' | 'PEOR';
  razon_tipo: string;
  semanas_tapering: number;
  recomendacion_general: string;
  bloque: {
    nombre: string;
    enfasis: string;
    intensidad_rpe_min: number;
    intensidad_rpe_max: number;
    sesiones: Array<{
      semana: number;
      dia_semana: string;
      movimiento_principal: string;
      enfoque_dia: string;
      descripcion?: string;
      ejercicios: Array<{
        nombre: string;
        tipo: string;
        orden_grupo?: string;
        sets: number;
        reps: number;
        rpe: number;
        peso_pct_rm?: number;
        rir_label?: string;
        rest_minutos?: number;
        notas_tecnicas?: string;
      }>;
    }>;
  };
};

type TipoEjEnum = 'COMPETITIVO' | 'VARIANTE' | 'AUXILIAR' | 'COMPENSATORIO' | 'MOVILIDAD';
const VALID_TIPOS = new Set<string>(['COMPETITIVO', 'VARIANTE', 'AUXILIAR', 'COMPENSATORIO', 'MOVILIDAD']);
const TIPO_EJ_MAP: Record<string, TipoEjEnum> = {
  COMPETITIVO: 'COMPETITIVO', VARIANTE: 'VARIANTE', AUXILIAR: 'AUXILIAR',
  COMPENSATORIO: 'COMPENSATORIO', MOVILIDAD: 'MOVILIDAD',
  competitivo: 'COMPETITIVO', variante: 'VARIANTE', auxiliar: 'AUXILIAR',
  compensatorio: 'COMPENSATORIO', movilidad: 'MOVILIDAD',
  accesorio: 'AUXILIAR', ACCESORIO: 'AUXILIAR',
};

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  const periodi = await prisma.periodizacion.findUnique({
    where: { id },
    include: {
      athlete: {
        include: {
          user: { select: { nombre: true } },
          seguimiento: {
            orderBy: { fechaRealizacion: 'desc' },
            take: 50,
            include: {
              ejercicioSesion: { select: { ejercicioNombre: true, tipoEjercicio: true } },
            },
          },
        },
      },
      bloques: { orderBy: { numeroBloque: 'asc' } },
    },
  });

  if (!periodi) return Response.json({ error: 'No encontrado' }, { status: 404 });

  const { athlete, bloques } = periodi;
  const fechaCompetencia = periodi.fechaCompetencia;
  if (!fechaCompetencia) return Response.json({ error: 'Configura la fecha de competencia primero' }, { status: 400 });

  // Weeks until competition
  const now = new Date();
  const weeksUntil = Math.max(1, Math.round((fechaCompetencia.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)));

  // RPE stats last 14 days
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const recent = athlete.seguimiento.filter(s => s.fechaRealizacion >= twoWeeksAgo);
  const rpeAvg14d = recent.length > 0
    ? +(recent.reduce((sum, s) => sum + s.rpeReportado, 0) / recent.length).toFixed(2)
    : null;

  // Group by session day (last 10 sessions)
  const byDay = recent.reduce<Record<string, { rpes: number[]; lifts: Set<string> }>>((acc, s) => {
    const day = s.fechaRealizacion.toISOString().slice(0, 10);
    if (!acc[day]) acc[day] = { rpes: [], lifts: new Set() };
    acc[day].rpes.push(s.rpeReportado);
    acc[day].lifts.add(s.ejercicioSesion.ejercicioNombre);
    return acc;
  }, {});

  const lastBlock = bloques.at(-1);

  const userPrompt = JSON.stringify({
    atleta: {
      nombre: athlete.user.nombre,
      rm_sentadilla_kg: athlete.rmSquat,
      rm_banca_kg: athlete.rmBench,
      rm_muerto_kg: athlete.rmDeadlift,
      peso_actual_kg: athlete.pesoActual,
      categoria_peso: athlete.categoriaPeso,
      experiencia: athlete.experienciaPowerlifting,
    },
    periodizacion: {
      nombre: periodi.nombre,
      tipo: periodi.tipo,
      duracion_semanas: periodi.duracionSemanas,
      ultimo_bloque: lastBlock ? {
        nombre: lastBlock.nombre,
        enfasis: lastBlock.enfasis,
        semana_fin: lastBlock.semanaFin,
        rpe_min: lastBlock.intensidadRpeMin,
        rpe_max: lastBlock.intensidadRpeMax,
      } : null,
    },
    competencia: {
      fecha: fechaCompetencia.toISOString().slice(0, 10),
      semanas_hasta_competencia: weeksUntil,
    },
    fatiga: {
      rpe_promedio_14d: rpeAvg14d,
      sesiones_recientes: Object.entries(byDay)
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 10)
        .map(([day, d]) => ({
          fecha: day,
          rpe_promedio: +(d.rpes.reduce((a, b) => a + b, 0) / d.rpes.length).toFixed(2),
          ejercicios: [...d.lifts].slice(0, 3),
        })),
    },
  }, null, 2);

  let aiResult: TaperingAI;
  try {
    aiResult = await callClaudeJSON<TaperingAI>(PROMPTS.TAPERING_AUTOMATICO, userPrompt, 4096);
  } catch {
    return Response.json({ error: 'Error generando tapering con IA. Intenta nuevamente.' }, { status: 500 });
  }

  // Determine block position
  const nextNumBloque = (lastBlock?.numeroBloque ?? 0) + 1;
  const semanaInicio = (lastBlock?.semanaFin ?? 0) + 1;
  const semanaFin = semanaInicio + Math.max(aiResult.semanas_tapering - 1, 0);

  // Create block + sessions + exercises in one transaction
  const bloque = await prisma.$transaction(async tx => {
    const newBloque = await tx.bloqueEntrenamiento.create({
      data: {
        periodizacionId: id,
        numeroBloque: nextNumBloque,
        nombre: aiResult.bloque.nombre,
        semanaInicio,
        semanaFin,
        enfasis: aiResult.bloque.enfasis,
        intensidadRpeMin: aiResult.bloque.intensidad_rpe_min,
        intensidadRpeMax: aiResult.bloque.intensidad_rpe_max,
      },
    });

    for (let sIdx = 0; sIdx < aiResult.bloque.sesiones.length; sIdx++) {
      const ses = aiResult.bloque.sesiones[sIdx];
      const newSesion = await tx.sesionEntrenamiento.create({
        data: {
          bloqueId: newBloque.id,
          numeroSemana: semanaInicio + ses.semana - 1,
          diaSemana: ses.dia_semana.toLowerCase(),
          movimientoPrincipal: ses.movimiento_principal,
          enfocuoDia: ses.enfoque_dia,
          descripcion: ses.descripcion ?? null,
          ordenSecuencia: sIdx + 1,
        },
      });

      for (let eIdx = 0; eIdx < ses.ejercicios.length; eIdx++) {
        const ej = ses.ejercicios[eIdx];
        const nombre = ej.nombre.toLowerCase();
        const rm = nombre.includes('sentadilla') ? athlete.rmSquat
          : nombre.includes('banca') ? athlete.rmBench
          : (nombre.includes('muerto') || nombre.includes('sumo')) ? athlete.rmDeadlift
          : null;
        const pesoProgramado = rm && ej.peso_pct_rm
          ? Math.round(rm * ej.peso_pct_rm / 100 / 2.5) * 2.5
          : null;

        await tx.ejercicioSesion.create({
          data: {
            sesionId: newSesion.id,
            ejercicioNombre: ej.nombre,
            tipoEjercicio: TIPO_EJ_MAP[ej.tipo] ?? 'COMPETITIVO',
            ordenGrupo: ej.orden_grupo ?? null,
            setsProgramados: ej.sets,
            repsProgramadas: ej.reps,
            rpeProgramado: ej.rpe,
            pesoProgramado,
            rirLabel: ej.rir_label ?? null,
            restMinutos: ej.rest_minutos ?? 5,
            notasTecnicas: ej.notas_tecnicas ?? null,
            orden: eIdx + 1,
          },
        });
      }
    }

    return newBloque;
  });

  return Response.json({
    bloque,
    tipo_tapering: aiResult.tipo_tapering,
    razon_tipo: aiResult.razon_tipo,
    semanas_tapering: aiResult.semanas_tapering,
    recomendacion_general: aiResult.recomendacion_general,
    sesiones_creadas: aiResult.bloque.sesiones.length,
  });
}
