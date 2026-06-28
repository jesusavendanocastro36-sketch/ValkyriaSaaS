import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const bodySchema = z.object({
  sesion_id: z.string().min(1),
  athlete_id: z.string().nullish(),
});

import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { callClaudeJSON } from '@/lib/anthropic';
import { PROMPTS } from '@/lib/ai-prompts';
import { calcTonnage } from '@/lib/formulas';

type AnalisisResult = {
  conformidad_plan: string;
  evaluacion_general: string;
  analisis_detallado: string;
  carga_tonelaje: { estado: string; observacion: string };
  fatiga_detectada: boolean;
  nivel_alerta: string;
  alerta_descripcion: string | null;
  resumen_ejecutivo: string;
};

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { data: parsed, error: parseErr } = await parseBody(req, bodySchema);
  if (parseErr) return parseErr;
  const { sesion_id, athlete_id } = parsed;

  // Fetch athlete profile
  const athlete = athlete_id
    ? await prisma.athleteProfile.findUnique({ where: { id: athlete_id }, include: { user: true } })
    : await prisma.athleteProfile.findUnique({ where: { userId: payload.userId }, include: { user: true } });

  if (!athlete) return Response.json({ error: 'Atleta no encontrado' }, { status: 404 });

  // Fetch session exercises and logged sets
  const sesion = await prisma.sesionEntrenamiento.findUnique({
    where: { id: sesion_id },
    include: { ejercicios: { include: { seguimiento: { where: { athleteId: athlete.id } } } } },
  });
  if (!sesion) return Response.json({ error: 'Sesión no encontrada' }, { status: 404 });

  // Last 5 session RPE averages
  const recientes = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: athlete.id },
    orderBy: { fechaRealizacion: 'desc' },
    take: 30,
    select: { rpeReportado: true, pesoUsado: true, repsRealizadas: true, fechaRealizacion: true },
  });

  const totalTonelaje = sesion.ejercicios.reduce((acc, ej) =>
    acc + ej.seguimiento.reduce((s, r) => s + calcTonnage(r.pesoUsado, r.repsRealizadas, 1), 0), 0);

  const rpePromedio = sesion.ejercicios.flatMap((e) => e.seguimiento).reduce(
    (acc, r, _, arr) => acc + r.rpeReportado / arr.length, 0
  );

  const userMessage = `
ATLETA: ${athlete.user.nombre} | Experiencia: ${athlete.experienciaPowerlifting}
SESIÓN ID: ${sesion_id}
MOVIMIENTO PRINCIPAL: ${sesion.movimientoPrincipal} | ÉNFASIS: ${sesion.enfocuoDia}

EJERCICIOS REGISTRADOS:
${sesion.ejercicios.map((ej) => {
  const sets = ej.seguimiento;
  const tonelaje = sets.reduce((a, r) => a + calcTonnage(r.pesoUsado, r.repsRealizadas, 1), 0);
  const rpeReal = sets.length ? sets.reduce((a, r) => a + r.rpeReportado, 0) / sets.length : 0;
  return `- ${ej.ejercicioNombre}: Programado ${ej.setsProgramados}x${ej.repsProgramadas} RPE ${ej.rpeProgramado} | Realizado: ${sets.length} sets, RPE prom ${rpeReal.toFixed(1)}, Tonelaje: ${tonelaje}kg`;
}).join('\n')}

TONELAJE SESIÓN: ${totalTonelaje}kg
RPE PROMEDIO SESIÓN: ${rpePromedio.toFixed(1)}
HISTORIAL RECIENTE (${recientes.length} sets): RPE promedio = ${recientes.length ? (recientes.reduce((a, r) => a + r.rpeReportado, 0) / recientes.length).toFixed(1) : 'N/A'}
`;

  try {
    const analisis = await callClaudeJSON<AnalisisResult>(PROMPTS.ANALISIS_SESION, userMessage);

    // If alert detected, create recommendation
    if (analisis.fatiga_detectada && analisis.nivel_alerta !== 'None') {
      const coach = await prisma.coachProfile.findFirst({ where: { athletes: { some: { id: athlete.id } } } });
      if (coach) {
        await prisma.recomendacionAI.create({
          data: {
            coachId: coach.id,
            athleteId: athlete.id,
            tipo: 'RECUPERACION',
            descripcion: analisis.alerta_descripcion ?? analisis.resumen_ejecutivo,
            razonGenerada: analisis.analisis_detallado,
          },
        });
      }
    }

    return Response.json(analisis);
  } catch (err) {
    console.error('Claude analysis error:', err);
    return Response.json({ error: 'Error al analizar con IA' }, { status: 500 });
  }
}
