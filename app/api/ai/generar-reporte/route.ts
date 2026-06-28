import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const bodySchema = z.object({
  athlete_id: z.string().min(1),
  rango_fechas: z.any().optional(),
  tipo: z.string().default('mensual'),
});

import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { callClaude } from '@/lib/anthropic';
import { PROMPTS } from '@/lib/ai-prompts';
import { calcTonnage, estimateOneRM } from '@/lib/formulas';

// In-memory job store (use Redis in production)
export const reportJobs: Record<string, { status: 'procesando' | 'completado' | 'error'; resultado?: string; error?: string }> = {};

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { data: parsed, error: parseErr } = await parseBody(req, bodySchema);
  if (parseErr) return parseErr;
  const { athlete_id, rango_fechas, tipo } = parsed;

  const athlete = await prisma.athleteProfile.findUnique({
    where: { id: athlete_id },
    include: { user: true },
  });
  if (!athlete) return Response.json({ error: 'Atleta no encontrado' }, { status: 404 });

  const jobId = `${athlete_id}-${Date.now()}`;
  reportJobs[jobId] = { status: 'procesando' };

  // Async generation — don't await
  generateReport(jobId, athlete, rango_fechas, tipo).catch((err) => {
    console.error('Report generation error:', err);
    reportJobs[jobId] = { status: 'error', error: String(err) };
  });

  return Response.json({ job_id: jobId, status: 'procesando', estimado_en_segundos: 45 }, { status: 202 });
}

async function generateReport(
  jobId: string,
  athlete: { id: string; user: { nombre: string }; experienciaPowerlifting: string },
  rango_fechas: { inicio: string; fin: string },
  tipo: string
) {
  const desde = new Date(rango_fechas.inicio);
  const hasta = new Date(rango_fechas.fin);

  const registros = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: athlete.id, fechaRealizacion: { gte: desde, lte: hasta } },
    include: { ejercicioSesion: true },
    orderBy: { fechaRealizacion: 'asc' },
  });

  const totalSets = registros.length;
  const tonelajeTotal = registros.reduce((a, r) => a + calcTonnage(r.pesoUsado, r.repsRealizadas, 1), 0);
  const rpePromedio = totalSets ? registros.reduce((a, r) => a + r.rpeReportado, 0) / totalSets : 0;

  // 1RM by Big 3
  const big3 = ['squat', 'sentadilla', 'bench', 'banca', 'deadlift', 'peso muerto'];
  const oneRMByLift: Record<string, number[]> = {};
  for (const r of registros) {
    const nombre = r.ejercicioSesion.ejercicioNombre.toLowerCase();
    const lift = big3.find((b) => nombre.includes(b));
    if (!lift || r.repsRealizadas === 0) continue;
    if (!oneRMByLift[lift]) oneRMByLift[lift] = [];
    oneRMByLift[lift].push(estimateOneRM(r.pesoUsado, r.repsRealizadas));
  }

  const oneRMSummary = Object.entries(oneRMByLift).map(([lift, values]) => {
    const first = values[0];
    const last = values[values.length - 1];
    const diff = last - first;
    return `${lift}: ${first}kg → ${last}kg (${diff >= 0 ? '+' : ''}${diff}kg)`;
  }).join('\n');

  const userMessage = `
ATLETA: ${athlete.user.nombre}
PERÍODO: ${rango_fechas.inicio} a ${rango_fechas.fin} (${tipo})
EXPERIENCIA: ${athlete.experienciaPowerlifting}

MÉTRICAS GENERALES:
- Total sets registrados: ${totalSets}
- Tonelaje total: ${tonelajeTotal.toLocaleString()} kg
- RPE promedio: ${rpePromedio.toFixed(2)}

EVOLUCIÓN 1RM ESTIMADO:
${oneRMSummary || 'Sin datos de Big 3 en el período'}

DISTRIBUCIÓN DE CARGA:
${Object.entries(
  registros.reduce<Record<string, number>>((acc, r) => {
    const semana = new Date(r.fechaRealizacion);
    semana.setDate(semana.getDate() - semana.getDay() + 1);
    const key = semana.toISOString().split('T')[0];
    acc[key] = (acc[key] ?? 0) + calcTonnage(r.pesoUsado, r.repsRealizadas, 1);
    return acc;
  }, {})
).map(([sem, ton]) => `  Semana ${sem}: ${ton.toLocaleString()} kg`).join('\n')}
`;

  const markdown = await callClaude(PROMPTS.GENERAR_REPORTE, userMessage);
  reportJobs[jobId] = { status: 'completado', resultado: markdown };
}
