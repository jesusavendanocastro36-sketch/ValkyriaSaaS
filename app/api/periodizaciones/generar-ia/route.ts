import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const generarSchema = z.object({
  atletaId: z.string().min(1),
  tipo: z.string().min(1),
  duracion: z.coerce.number().int().min(1).max(52),
  objetivo: z.string().min(1),
  faseInicio: z.string().default(''),
  notas: z.string().optional(),
  fechaCompetencia: z.string().optional(),
  rmsOverride: z.object({
    sq: z.number().nullable(),
    bp: z.number().nullable(),
    dl: z.number().nullable(),
  }).optional(),
});

import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { callClaudeJSON } from '@/lib/anthropic';
import { PROMPTS } from '@/lib/ai-prompts';

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil de coach no encontrado' }, { status: 404 });

  const { data: parsed, error: parseErr } = await parseBody(req, generarSchema);
  if (parseErr) return parseErr;
  const { atletaId, tipo, duracion, objetivo, faseInicio, notas, fechaCompetencia, rmsOverride } = parsed;

  const FASE_SEMANAS: Record<string, { min: number; max: number }> = {
    Hipertrofia: { min: 4, max: 12 },
    'Fuerza Base': { min: 3, max: 8 },
    Volumen: { min: 4, max: 8 },
    Peaking: { min: 2, max: 4 },
  };
  const limites = FASE_SEMANAS[faseInicio] ?? { min: 4, max: 12 };

  const athlete = await prisma.athleteProfile.findFirst({
    where: { id: atletaId, coachId: coach.id },
    include: { user: { select: { nombre: true } } },
  });
  if (!athlete) return Response.json({ error: 'Atleta no encontrado' }, { status: 404 });

  // Fetch recent RPE history (last 30 days) for context
  const hace30dias = new Date();
  hace30dias.setDate(hace30dias.getDate() - 30);
  const recentSets = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: atletaId, fechaRealizacion: { gte: hace30dias } },
    select: { rpeReportado: true, fechaRealizacion: true },
    orderBy: { fechaRealizacion: 'asc' },
  });

  const rpeHistory = recentSets.map(s => s.rpeReportado);
  const rpePromedio = rpeHistory.length > 0
    ? Math.round((rpeHistory.reduce((a, b) => a + b, 0) / rpeHistory.length) * 10) / 10
    : null;

  // Use coach-provided overrides, fall back to DB values
  const rmSq = rmsOverride?.sq ?? athlete.rmSquat;
  const rmBp = rmsOverride?.bp ?? athlete.rmBench;
  const rmDl = rmsOverride?.dl ?? athlete.rmDeadlift;

  const userMessage = `
## Perfil del atleta: ${athlete.user.nombre}

**1RMs actuales:**
- Sentadilla: ${rmSq ?? 'desconocido'} kg
- Banca: ${rmBp ?? 'desconocido'} kg
- Peso Muerto: ${rmDl ?? 'desconocido'} kg

**Datos del atleta:**
- Experiencia: ${athlete.experienciaPowerlifting}
- Peso actual: ${athlete.pesoActual ?? 'no registrado'} kg
- Categoría de peso: ${athlete.categoriaPeso ?? 'no registrada'}
- Lesiones activas: ${athlete.lesionesActuales.length > 0 ? athlete.lesionesActuales.join(', ') : 'ninguna'}
- Objetivos declarados: ${athlete.objetivos.length > 0 ? athlete.objetivos.join(', ') : 'no especificados'}
- Equipamiento disponible: ${athlete.equipamiento.length > 0 ? athlete.equipamiento.join(', ') : 'no especificado (asumir gym completo)'}
- Días disponibles para entrenar: ${athlete.diasDisponibles.length > 0 ? athlete.diasDisponibles.join(', ') : 'no especificado (usar lunes, miércoles, viernes, sábado)'}

**Historial reciente (últimos 30 días):**
- Sets registrados: ${recentSets.length}
- RPE promedio: ${rpePromedio ?? 'sin datos'}

**Parámetros del plan:**
- Tipo de periodización: ${tipo}
- Fase de inicio: ${faseInicio}
- Duración: ${duracion} semanas (límite para ${faseInicio}: ${limites.min}–${limites.max} semanas)
- Objetivo del coach: ${objetivo}
- Fecha de competencia: ${fechaCompetencia ?? 'no definida'}
${notas ? `- Notas adicionales del coach: ${notas}` : ''}

IMPORTANTE: El plan debe comenzar EXACTAMENTE en la fase "${faseInicio}".
No incluyas fases anteriores en la secuencia RV.
La duración total del plan es ${duracion} semanas y debe cubrir solo la fase "${faseInicio}" (y la siguiente si el tiempo lo permite según la secuencia canónica RV).
Incluye 3-4 días de entrenamiento por semana en cada bloque.
Los ejercicios deben ser apropiados para el nivel "${athlete.experienciaPowerlifting}" con los 1RMs indicados.
${athlete.equipamiento.length > 0 ? `RESTRICCIÓN DE EQUIPAMIENTO: Solo proponer ejercicios que se puedan realizar con el equipamiento disponible: ${athlete.equipamiento.join(', ')}. No incluir ejercicios que requieran máquinas o implementos no listados.` : ''}
${athlete.diasDisponibles.length > 0 ? `RESTRICCIÓN DE DÍAS: El atleta SOLO puede entrenar los siguientes días: ${athlete.diasDisponibles.join(', ')}. Asignar cada sesión exactamente a uno de esos días. No programar sesiones en otros días.` : ''}
`;

  try {
    const plan = await callClaudeJSON(PROMPTS.GENERAR_PERIODIZACION, userMessage, 8000);
    return Response.json({
      plan,
      atleta: { nombre: athlete.user.nombre, rmSquat: rmSq, rmBench: rmBp, rmDeadlift: rmDl },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error generando plan IA:', msg);
    return Response.json({ error: `Error al generar plan: ${msg}` }, { status: 500 });
  }
}
