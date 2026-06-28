import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const chatSchema = z.object({
  message: z.string().min(1, 'Mensaje requerido'),
  athlete_id: z.string().nullish(),
  history: z.array(z.any()).default([]),
});

import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') {
    return Response.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data: parsed, error: parseErr } = await parseBody(req, chatSchema);
  if (parseErr) return parseErr;
  const { message, athlete_id, history } = parsed;

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  // ── Build athlete context ────────────────────────────────────────────────
  let athleteContext = '';

  if (athlete_id) {
    const athlete = await prisma.athleteProfile.findFirst({
      where: { id: athlete_id, coachId: coach.id },
      include: {
        user: { select: { nombre: true, email: true } },
        periodizaciones: {
          where: { estado: 'ACTIVE' },
          include: {
            bloques: {
              include: {
                sesiones: {
                  include: {
                    ejercicios: {
                      include: {
                        seguimiento: {
                          orderBy: { createdAt: 'desc' },
                          take: 30,
                        },
                      },
                    },
                  },
                  orderBy: { numeroSemana: 'asc' },
                },
              },
              orderBy: { numeroBloque: 'asc' },
            },
          },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (athlete) {
      const plan = athlete.periodizaciones[0];

      athleteContext = `
=== ATLETA ACTIVO: ${athlete.user.nombre} ===
- Peso actual: ${athlete.pesoActual ?? 'N/D'} kg | Altura: ${athlete.altura ?? 'N/D'} cm | Edad: ${athlete.edad ?? 'N/D'} años
- Categoría de peso: ${athlete.categoriaPeso ?? 'N/D'}
- Experiencia en powerlifting: ${athlete.experienciaPowerlifting}
- Lesiones actuales: ${athlete.lesionesActuales.length ? athlete.lesionesActuales.join(', ') : 'ninguna'}
- Objetivos: ${athlete.objetivos.join(', ')}

`;

      if (plan) {
        athleteContext += `=== PERIODIZACIÓN ACTIVA: ${plan.nombre} ===
- Tipo: ${plan.tipo} | Duración: ${plan.duracionSemanas} semanas
- Objetivo: ${plan.objetivo}
- Estado: ${plan.estado}

`;

        for (const bloque of plan.bloques) {
          athleteContext += `BLOQUE ${bloque.numeroBloque}: ${bloque.nombre} (Semanas ${bloque.semanaInicio}-${bloque.semanaFin})
- Énfasis: ${bloque.enfasis} | RPE programado: ${bloque.intensidadRpeMin}-${bloque.intensidadRpeMax}

`;
          for (const sesion of bloque.sesiones) {
            athleteContext += `  Sesión: ${sesion.diaSemana} Semana ${sesion.numeroSemana} — ${sesion.movimientoPrincipal} (${sesion.enfocuoDia})\n`;
            for (const ej of sesion.ejercicios) {
              athleteContext += `    · ${ej.ejercicioNombre} ${ej.setsProgramados}×${ej.repsProgramadas} @ RPE ${ej.rpeProgramado}`;
              if (ej.cargaRef) athleteContext += ` [${ej.cargaRef}]`;
              if (ej.rirLabel) athleteContext += ` (${ej.rirLabel})`;
              athleteContext += '\n';

              const sets = ej.seguimiento.slice(0, 10);
              if (sets.length > 0) {
                const resumen = sets.map(s => `${s.pesoUsado}kg×${s.repsRealizadas} RPE${s.rpeReportado}`).join(' | ');
                athleteContext += `      Últimos registros: ${resumen}\n`;
              }
            }
          }
        }
      } else {
        athleteContext += 'No tiene periodización activa.\n';
      }
    }
  }

  // ── Fetch RV protocols for context ──────────────────────────────────────
  const protocolos = await prisma.protocoloRV.findMany({ take: 20 });
  const protocolosCtx = protocolos
    .map(p => `- ${p.nombre} (${p.categoria}): ${p.descripcion.slice(0, 120)}...`)
    .join('\n');

  // ── System prompt ────────────────────────────────────────────────────────
  const systemPrompt = `Eres el asistente de coaching del Método RV para powerlifting. Tu nombre es Valkyria AI.

Trabajas directamente con el coach Yisus. Eres experto en:
- Periodización para powerlifting (lineal, ondulante, conjugada, bottom-up)
- Autoregulación por RPE y RIR
- Los 3 movimientos competitivos: sentadilla, press de banca, peso muerto
- Análisis de fatiga, recuperación y progresión de carga
- El Método RV con sus protocolos y ejercicios específicos

PROTOCOLOS RV DISPONIBLES:
${protocolosCtx}

${athleteContext}

REGLAS:
- Responde siempre en español
- Sé directo y concreto: da números, porcentajes, recomendaciones específicas
- Si el coach menciona un resultado de sesión, analízalo en base al RPE programado vs reportado
- Cuando sugieras aumentar carga, da el número exacto (ej: +2.5 kg, +5 kg)
- Si hay señales de fatiga (RPE > programado en 3+ sesiones), recomiendar descarga
- Mantén el contexto del atleta seleccionado durante toda la conversación
- Máximo 3-4 párrafos por respuesta, sé preciso`;

  // ── Call Gemini ──────────────────────────────────────────────────────────
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
  });

  const chat = model.startChat({
    history: history.map((h: { role: string; text: string }) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.text }],
    })),
  });

  const result = await chat.sendMessage(message);
  const text = result.response.text();

  return Response.json({ reply: text });
}
