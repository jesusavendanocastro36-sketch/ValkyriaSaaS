import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { calcTonnage } from '@/lib/formulas';
import { callClaudeJSON } from '@/lib/anthropic';
import { PROMPTS } from '@/lib/ai-prompts';
import { z } from 'zod';

const completarSchema = z.object({
  sesion_id: z.string().cuid(),
  nota_general: z.string().max(1000).optional(),
  video_link: z.string().url().optional(),
});

type AnalisisResult = {
  fatiga_detectada: boolean;
  nivel_alerta: string;
  alerta_descripcion: string | null;
  resumen_ejecutivo: string;
  analisis_detallado: string;
};

export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  try {
    const body = await req.json();
    const { sesion_id, nota_general, video_link } = completarSchema.parse(body);

    const athlete = await prisma.athleteProfile.findUnique({
      where: { userId: payload.userId },
      include: { user: true },
    });
    if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

    const registros = await prisma.seguimientoAtleta.findMany({
      where: { athleteId: athlete.id, ejercicioSesion: { sesionId: sesion_id } },
      include: { ejercicioSesion: true },
    });

    // Save session note if provided
    if (nota_general?.trim()) {
      await prisma.notaSesion.create({
        data: {
          athleteId: athlete.id,
          sesionId: sesion_id,
          contenido: nota_general.trim(),
        },
      });
    }

    const tonelajeTotal = registros.reduce((acc, r) => acc + calcTonnage(r.pesoUsado, r.repsRealizadas, 1), 0);
    const rpePromedio = registros.length
      ? registros.reduce((acc, r) => acc + r.rpeReportado, 0) / registros.length
      : 0;

    // Send video link to coach as a message
    if (video_link?.trim()) {
      const coach = await prisma.coachProfile.findFirst({
        where: { athletes: { some: { id: athlete.id } } },
        select: { userId: true },
      });
      if (coach) {
        await prisma.mensaje.create({
          data: {
            senderId: athlete.user.id,
            athleteId: athlete.id,
            contenido: video_link.trim(),
            tipo: 'VIDEO_LINK',
          },
        });
      }
    }

    triggerAIAnalysis(athlete, sesion_id, registros, rpePromedio, tonelajeTotal, nota_general).catch(console.error);
    triggerEstancamiento(athlete.id).catch(console.error);

    return Response.json({
      sesion_id,
      estado: 'completada',
      tonelaje_total: tonelajeTotal,
      rpe_promedio: Math.round(rpePromedio * 2) / 2,
      sets_registrados: registros.length,
      analisis_ia_pendiente: true,
    });
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
}

async function triggerEstancamiento(athleteId: string) {
  // Only run every ~4 sessions to avoid overhead
  const count = await prisma.seguimientoAtleta.count({
    where: { athleteId, fechaRealizacion: { gte: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000) } },
  });
  if (count % 4 !== 0) return;

  const origin = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  await fetch(`${origin}/api/ai/detectar-estancamiento`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ athleteId }),
  });
}

async function triggerAIAnalysis(
  athlete: { id: string; user: { nombre: string }; experienciaPowerlifting: string },
  sesionId: string,
  registros: Array<{ rpeReportado: number; pesoUsado: number; repsRealizadas: number; ejercicioSesion: { ejercicioNombre: string; rpeProgramado: number; setsProgramados: number; repsProgramadas: number } }>,
  rpePromedio: number,
  tonelajeTotal: number,
  notaGeneral?: string,
) {
  const userMessage = `
ATLETA: ${athlete.user.nombre} | Experiencia: ${athlete.experienciaPowerlifting}
SESIÓN ID: ${sesionId}

SETS REGISTRADOS (${registros.length} total):
${registros.slice(0, 10).map((r) =>
  `- ${r.ejercicioSesion.ejercicioNombre}: ${r.pesoUsado}kg x ${r.repsRealizadas} reps RPE ${r.rpeReportado} (programado RPE ${r.ejercicioSesion.rpeProgramado})`
).join('\n')}
${registros.length > 10 ? `... y ${registros.length - 10} sets más` : ''}

RESUMEN:
- Tonelaje total: ${tonelajeTotal}kg
- RPE promedio: ${rpePromedio.toFixed(1)}
- Sets completados: ${registros.length}
${notaGeneral ? `\nNOTA DEL ATLETA (cómo se sintió): "${notaGeneral}"` : ''}
`;

  const analisis = await callClaudeJSON<AnalisisResult>(PROMPTS.ANALISIS_SESION, userMessage);

  if (analisis.fatiga_detectada && analisis.nivel_alerta !== 'None') {
    const coach = await prisma.coachProfile.findFirst({
      where: { athletes: { some: { id: athlete.id } } },
    });
    if (coach) {
      await prisma.recomendacionAI.create({
        data: {
          coachId: coach.id,
          athleteId: athlete.id,
          tipo: 'RECUPERACION',
          descripcion: analisis.alerta_descripcion ?? analisis.resumen_ejecutivo,
          razonGenerada: analisis.analisis_detallado,
          parametrosSugeridos: { nivel_alerta: analisis.nivel_alerta },
        },
      });
    }
  }
}
