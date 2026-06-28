import { extractToken, verifyToken } from '@/lib/auth';
import { callClaudeJSON } from '@/lib/anthropic';
import { PROMPTS } from '@/lib/ai-prompts';
import { z } from 'zod';

const schema = z.object({
  ejercicio: z.string(),
  razon: z.enum(['lesion', 'falta_progreso', 'rotacion', 'otra']),
  lesion: z.string().optional(),
  nivel: z.string().optional(),
});

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const { ejercicio, razon, lesion, nivel } = schema.parse(body);

    const userMessage = `
EJERCICIO ACTUAL: ${ejercicio}
RAZÓN DE BÚSQUEDA: ${razon}
${lesion ? `LESIÓN REPORTADA: ${lesion}` : ''}
NIVEL TÉCNICO: ${nivel ?? 'intermedio'}
OBJETIVO: fuerza y rendimiento en powerlifting
`;

    const resultado = await callClaudeJSON(PROMPTS.SUGERIR_VARIANTES, userMessage);
    return Response.json(resultado);
  } catch (err) {
    console.error('Claude variants error:', err);
    return Response.json({ error: 'Error al sugerir variantes' }, { status: 500 });
  }
}
