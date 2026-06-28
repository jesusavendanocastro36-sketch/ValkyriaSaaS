import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const guardarSchema = z.object({
  plan: z.looseObject({
    nombre: z.string().min(1),
    bloques: z.array(z.looseObject({ semana_fin: z.coerce.number() })).min(1),
  }),
  atletaId: z.string().min(1),
  fechaInicio: z.string().min(1),
  fechaCompetencia: z.string().optional(),
});

import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

type EjercicioIA = {
  nombre: string;
  tipo: 'COMPETITIVO' | 'VARIANTE' | 'AUXILIAR' | 'COMPENSATORIO' | 'MOVILIDAD';
  grupo: string;
  series: number;
  reps: number;
  rpe_inicial: number;
  rpe_final: number;
  pct_rm: number;
  rest_min: number;
  rir: string;
  notas: string;
};

type DiaIA = {
  dia_semana: string;
  movimiento_principal: string;
  enfoque_dia: string;
  orden: number;
  ejercicios: EjercicioIA[];
};

type BloqueIA = {
  nombre: string;
  numero_bloque: number;
  semana_inicio: number;
  semana_fin: number;
  enfasis: string;
  intensidad_rpe_min: number;
  intensidad_rpe_max: number;
  razon: string;
  dias: DiaIA[];
};

type PlanIA = {
  nombre: string;
  tipo: string;
  objetivo: string;
  descripcion: string;
  bloques: BloqueIA[];
};

function detectLift(nombre: string): 'sq' | 'bp' | 'dl' | null {
  const n = nombre.toLowerCase();
  if (n.includes('sentadilla') || n.includes('squat')) return 'sq';
  if (n.includes('banca') || n.includes('bench')) return 'bp';
  if (n.includes('muerto') || n.includes('deadlift') || n.includes('sumo')) return 'dl';
  return null;
}

function calcPeso(pctRm: number, rms: { sq: number | null; bp: number | null; dl: number | null }, nombre: string): number | null {
  const lift = detectLift(nombre);
  const rm = lift ? rms[lift] : null;
  if (!rm || !pctRm) return null;
  return Math.round(rm * pctRm / 100 / 2.5) * 2.5;
}

function interpolateRpe(rpeInicial: number, rpeFinal: number, semana: number, semanaInicio: number, semanaFin: number): number {
  const totalSemanas = semanaFin - semanaInicio;
  if (totalSemanas === 0) return rpeInicial;
  const t = (semana - semanaInicio) / totalSemanas;
  const rpe = rpeInicial + t * (rpeFinal - rpeInicial);
  return Math.round(rpe * 2) / 2; // round to nearest 0.5
}

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const { data: parsed, error: parseErr } = await parseBody(req, guardarSchema);
  if (parseErr) return parseErr;
  const { atletaId, fechaInicio, fechaCompetencia } = parsed;
  const plan = parsed.plan as unknown as PlanIA;

  const athlete = await prisma.athleteProfile.findFirst({
    where: { id: atletaId, coachId: coach.id },
  });
  if (!athlete) return Response.json({ error: 'Atleta no encontrado' }, { status: 404 });

  const rms = { sq: athlete.rmSquat, bp: athlete.rmBench, dl: athlete.rmDeadlift };

  const duracionSemanas = plan.bloques.reduce((max, b) => Math.max(max, b.semana_fin), 0);
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaInicio);
  fin.setDate(fin.getDate() + duracionSemanas * 7);

  const TIPO_MAP: Record<string, string> = {
    LINEAL: 'LINEAL', ONDULANTE: 'ONDULANTE', CONJUGADA: 'CONJUGADA', POR_BLOQUES: 'POR_BLOQUES',
  };
  const tipoValido = TIPO_MAP[plan.tipo] ?? 'LINEAL';

  try {
    const periodizacion = await prisma.$transaction(async (tx) => {
      const p = await tx.periodizacion.create({
        data: {
          coachId: coach.id,
          athleteId: atletaId,
          nombre: plan.nombre,
          tipo: tipoValido as 'LINEAL' | 'ONDULANTE' | 'CONJUGADA' | 'POR_BLOQUES',
          fechaInicio: inicio,
          fechaFin: fin,
          duracionSemanas,
          objetivo: plan.objetivo,
          descripcion: plan.descripcion,
          ...(fechaCompetencia ? { fechaCompetencia: new Date(fechaCompetencia) } : {}),
        },
      });

      for (const bloque of plan.bloques) {
        const b = await tx.bloqueEntrenamiento.create({
          data: {
            periodizacionId: p.id,
            numeroBloque: bloque.numero_bloque,
            nombre: bloque.nombre,
            semanaInicio: bloque.semana_inicio,
            semanaFin: bloque.semana_fin,
            enfasis: bloque.enfasis,
            intensidadRpeMin: bloque.intensidad_rpe_min,
            intensidadRpeMax: bloque.intensidad_rpe_max,
          },
        });

        // Expand template days into per-week sessions
        for (let semana = bloque.semana_inicio; semana <= bloque.semana_fin; semana++) {
          for (const dia of bloque.dias) {
            const s = await tx.sesionEntrenamiento.create({
              data: {
                bloqueId: b.id,
                numeroSemana: semana,
                diaSemana: dia.dia_semana,
                movimientoPrincipal: dia.movimiento_principal,
                enfocuoDia: dia.enfoque_dia,
                ordenSecuencia: dia.orden,
              },
            });

            let orden = 1;
            for (const ej of dia.ejercicios) {
              const rpeInterpolado = interpolateRpe(ej.rpe_inicial, ej.rpe_final, semana, bloque.semana_inicio, bloque.semana_fin);
              const pesoProgramado = calcPeso(ej.pct_rm, rms, ej.nombre);
              await tx.ejercicioSesion.create({
                data: {
                  sesionId: s.id,
                  ejercicioNombre: ej.nombre,
                  tipoEjercicio: ej.tipo as 'COMPETITIVO' | 'VARIANTE' | 'AUXILIAR' | 'COMPENSATORIO' | 'MOVILIDAD',
                  ordenGrupo: ej.grupo || null,
                  cargaRef: ej.pct_rm ? `${ej.pct_rm}% RM` : null,
                  rirLabel: ej.rir || null,
                  setsProgramados: ej.series,
                  repsProgramadas: ej.reps,
                  rpeProgramado: rpeInterpolado,
                  pesoProgramado,
                  restMinutos: ej.rest_min,
                  notasTecnicas: ej.notas || null,
                  orden,
                },
              });
              orden++;
            }
          }
        }
      }

      return p;
    });

    return Response.json({ id: periodizacion.id, nombre: periodizacion.nombre }, { status: 201 });
  } catch (err) {
    console.error('Error guardando plan IA:', err);
    return Response.json({ error: 'Error al guardar el plan' }, { status: 500 });
  }
}
