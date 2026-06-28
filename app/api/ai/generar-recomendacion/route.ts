import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const bodySchema = z.object({ athlete_id: z.string().min(1) });

import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { callClaudeJSON } from '@/lib/anthropic';
import { PROMPTS } from '@/lib/ai-prompts';
import { calcTonnage } from '@/lib/formulas';

type RecomendacionResult = {
  tipo_recomendacion: string;
  necesario_cambio: boolean;
  descripcion_breve: string;
  descripcion_detallada: string;
  razon_datos: string;
  acciones_concretas: string[];
  urgencia: string;
  prioridad_coach: string;
};

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { data: parsed, error: parseErr } = await parseBody(req, bodySchema);
  if (parseErr) return parseErr;
  const { athlete_id } = parsed;

  const athlete = await prisma.athleteProfile.findUnique({
    where: { id: athlete_id },
    include: { user: true },
  });
  if (!athlete) return Response.json({ error: 'Atleta no encontrado' }, { status: 404 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  // Last 10 days of sets + recent session notes
  const desde = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const [registros, notasSesion] = await Promise.all([
  prisma.seguimientoAtleta.findMany({
    where: { athleteId: athlete_id, fechaRealizacion: { gte: desde } },
    orderBy: { fechaRealizacion: 'asc' },
    select: { rpeReportado: true, pesoUsado: true, repsRealizadas: true, fechaRealizacion: true },
  }),
  prisma.notaSesion.findMany({
    where: { athleteId: athlete_id, fecha: { gte: desde } },
    orderBy: { fecha: 'desc' },
    take: 5,
    select: { fecha: true, contenido: true },
  }),
  ]);

  const rpePromedio = registros.length
    ? registros.reduce((a, r) => a + r.rpeReportado, 0) / registros.length
    : 0;
  const tonelajeTotal = registros.reduce((a, r) => a + calcTonnage(r.pesoUsado, r.repsRealizadas, 1), 0);

  const periodizacion = await prisma.periodizacion.findFirst({
    where: { athleteId: athlete_id, estado: 'ACTIVE' },
    select: { tipo: true, objetivo: true, nombre: true },
  });

  const userMessage = `
ATLETA: ${athlete.user.nombre} | Experiencia: ${athlete.experienciaPowerlifting}
EQUIPAMIENTO: ${athlete.equipamiento?.length > 0 ? athlete.equipamiento.join(', ') : 'no especificado'}
DÍAS DISPONIBLES: ${athlete.diasDisponibles?.length > 0 ? athlete.diasDisponibles.join(', ') : 'no especificado'}
LESIONES: ${athlete.lesionesActuales?.length > 0 ? athlete.lesionesActuales.join(', ') : 'ninguna'}
PLAN ACTIVO: ${periodizacion?.nombre ?? 'Sin plan activo'} | Tipo: ${periodizacion?.tipo ?? '-'} | Objetivo: ${periodizacion?.objetivo ?? '-'}

DATOS ÚLTIMOS 10 DÍAS:
- Registros totales: ${registros.length} sets
- RPE promedio: ${rpePromedio.toFixed(2)}
- Tonelaje total: ${tonelajeTotal}kg

DISTRIBUCIÓN POR DÍA:
${Object.entries(
  registros.reduce<Record<string, { rpe: number[]; tonelaje: number }>>((acc, r) => {
    const fecha = r.fechaRealizacion.toISOString().split('T')[0];
    if (!acc[fecha]) acc[fecha] = { rpe: [], tonelaje: 0 };
    acc[fecha].rpe.push(r.rpeReportado);
    acc[fecha].tonelaje += calcTonnage(r.pesoUsado, r.repsRealizadas, 1);
    return acc;
  }, {})
).map(([fecha, d]) => `  ${fecha}: RPE prom ${(d.rpe.reduce((a, b) => a + b, 0) / d.rpe.length).toFixed(1)}, Tonelaje ${d.tonelaje}kg`).join('\n')}
${notasSesion.length > 0 ? `
NOTAS DEL ATLETA (últimas sesiones):
${notasSesion.map(n => `  ${n.fecha.toISOString().split('T')[0]}: "${n.contenido}"`).join('\n')}
` : ''}
`;

  try {
    const resultado = await callClaudeJSON<RecomendacionResult>(PROMPTS.GENERAR_RECOMENDACION, userMessage);

    if (resultado.necesario_cambio) {
      await prisma.recomendacionAI.create({
        data: {
          coachId: coach.id,
          athleteId: athlete_id,
          tipo: mapTipo(resultado.tipo_recomendacion),
          descripcion: resultado.descripcion_breve,
          razonGenerada: resultado.razon_datos,
          parametrosSugeridos: { acciones: resultado.acciones_concretas, urgencia: resultado.urgencia },
        },
      });
    }

    return Response.json(resultado);
  } catch (err) {
    console.error('Claude recommendation error:', err);
    return Response.json({ error: 'Error al generar recomendación' }, { status: 500 });
  }
}

function mapTipo(tipo: string) {
  const map: Record<string, 'AJUSTE_RPE' | 'CAMBIO_VOLUMEN' | 'CAMBIO_EJERCICIO' | 'RECUPERACION' | 'MOVILIDAD' | 'TECNICA'> = {
    ajuste_intensidad: 'AJUSTE_RPE',
    cambio_volumen: 'CAMBIO_VOLUMEN',
    cambio_ejercicio: 'CAMBIO_EJERCICIO',
    recuperacion: 'RECUPERACION',
    cambio_enfoque: 'AJUSTE_RPE',
  };
  return map[tipo] ?? 'AJUSTE_RPE';
}
