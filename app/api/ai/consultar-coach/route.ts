import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const bodySchema = z.object({
  pregunta: z.string().min(1, 'Pregunta requerida'),
  athlete_id: z.string().nullish(),
});

import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { callClaudeJSON } from '@/lib/anthropic';
import { PROMPTS } from '@/lib/ai-prompts';
import { calcTonnage } from '@/lib/formulas';

type ConsultaResult = {
  pregunta_interpretada: string;
  perfil_atleta_relevante: string;
  bloque_actual: string;
  posicion_volumen: string;
  diagnostico: string;
  opciones: {
    opcion: string;
    descripcion: string;
    justificacion_rv: string;
    pros: string[];
    contras: string[];
    cuando_elegir: string;
  }[];
  recomendacion_principal: string;
  proximos_pasos: string[];
  conceptos_rv_aplicados: string[];
};

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data: parsed, error: parseErr } = await parseBody(req, bodySchema);
  if (parseErr) return parseErr;
  const { pregunta, athlete_id } = parsed;

  // Build athlete context if provided
  let atletaContext = 'Sin atleta específico seleccionado.';

  if (athlete_id) {
    const athlete = await prisma.athleteProfile.findUnique({
      where: { id: athlete_id },
      include: {
        user: { select: { nombre: true } },
        periodizaciones: {
          where: { estado: 'ACTIVE' },
          include: {
            bloques: {
              include: {
                sesiones: {
                  include: { ejercicios: true },
                  orderBy: { numeroSemana: 'asc' },
                  take: 5,
                },
              },
            },
          },
          take: 1,
        },
      },
    });

    if (athlete) {
      // Last 14 days of tracking data
      const desde = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const registros = await prisma.seguimientoAtleta.findMany({
        where: { athleteId: athlete_id, fechaRealizacion: { gte: desde } },
        orderBy: { fechaRealizacion: 'asc' },
        include: {
          ejercicioSesion: { select: { ejercicioNombre: true, tipoEjercicio: true } },
        },
      });

      const rpePromedio = registros.length
        ? registros.reduce((a, r) => a + r.rpeReportado, 0) / registros.length
        : null;
      const tonelajeTotal = registros.reduce(
        (a, r) => a + calcTonnage(r.pesoUsado, r.repsRealizadas, 1),
        0
      );

      // Group by date for trend analysis
      const porDia = registros.reduce<
        Record<string, { rpeList: number[]; tonelaje: number; ejercicios: string[] }>
      >((acc, r) => {
        const fecha = r.fechaRealizacion.toISOString().split('T')[0];
        if (!acc[fecha]) acc[fecha] = { rpeList: [], tonelaje: 0, ejercicios: [] };
        acc[fecha].rpeList.push(r.rpeReportado);
        acc[fecha].tonelaje += calcTonnage(r.pesoUsado, r.repsRealizadas, 1);
        if (r.ejercicioSesion?.ejercicioNombre) {
          acc[fecha].ejercicios.push(r.ejercicioSesion.ejercicioNombre);
        }
        return acc;
      }, {});

      const tendenciaDia = Object.entries(porDia)
        .map(([fecha, d]) => {
          const rpe = (d.rpeList.reduce((a, b) => a + b, 0) / d.rpeList.length).toFixed(1);
          return `  ${fecha}: RPE ${rpe}, Tonelaje ${d.tonelaje}kg, Ejercicios: ${[...new Set(d.ejercicios)].join(', ')}`;
        })
        .join('\n');

      const peri = athlete.periodizaciones[0];
      const bloques = peri?.bloques ?? [];

      atletaContext = `
ATLETA: ${athlete.user.nombre}
  Peso: ${athlete.pesoActual}kg | Altura: ${athlete.altura}cm | Edad: ${athlete.edad} años
  Categoría: ${athlete.categoriaPeso} | Experiencia: ${athlete.experienciaPowerlifting}
  Objetivos: ${athlete.objetivos.join(', ')}
  Lesiones activas: ${athlete.lesionesActuales.length > 0 ? athlete.lesionesActuales.join(', ') : 'Ninguna'}

PERIODIZACIÓN ACTIVA: ${peri ? `${peri.nombre} (${peri.tipo})` : 'Sin plan activo'}
  Objetivo: ${peri?.objetivo ?? '-'}
  Bloques configurados: ${bloques.length}
${bloques.map(b => `  - Bloque ${b.numeroBloque}: ${b.nombre} | Semanas ${b.semanaInicio}-${b.semanaFin} | RPE ${b.intensidadRpeMin}-${b.intensidadRpeMax}`).join('\n')}

DATOS ÚLTIMOS 14 DÍAS (${registros.length} sets registrados):
  RPE promedio: ${rpePromedio !== null ? rpePromedio.toFixed(2) : 'Sin datos'}
  Tonelaje total: ${tonelajeTotal}kg

TENDENCIA POR DÍA:
${tendenciaDia || '  Sin sesiones registradas'}
`;
    }
  }

  const userMessage = `
${atletaContext}

PREGUNTA DEL COACH:
${pregunta}

Razona con el Método RV. Presenta 2-3 opciones concretas con justificación, luego indica cuál es tu recomendación principal.
`;

  try {
    const resultado = await callClaudeJSON<ConsultaResult>(
      PROMPTS.CONSULTA_COACH,
      userMessage
    );
    return Response.json(resultado);
  } catch (err) {
    console.error('Claude consulta error:', err);
    return Response.json({ error: 'Error al consultar la IA' }, { status: 500 });
  }
}
