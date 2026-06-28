import { z } from 'zod';
import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';
import { parseBody } from '@/lib/api-validation';

type LiftKey = 'sq' | 'bp' | 'dl';
type PctEntry = Record<LiftKey, number>;

const postSchema = z.object({
  pct: z.record(
    z.string(),
    z.object({ sq: z.coerce.number().min(0).max(120), bp: z.coerce.number().min(0).max(120), dl: z.coerce.number().min(0).max(120) })
  ),
  save_config: z.boolean().optional(),
});

function roundTo2_5(val: number) {
  return Math.round(val / 2.5) * 2.5;
}

function detectLift(nombre: string): LiftKey | null {
  const n = nombre.toLowerCase();
  if (n.includes('sentadilla') || n.includes('squat')) return 'sq';
  if (n.includes('banca') || n.includes('bench')) return 'bp';
  if (n.includes('muerto') || n.includes('deadlift') || n.includes('sumo')) return 'dl';
  return null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  const plan = await prisma.periodizacion.findFirst({
    where: { id, coachId: coach.id },
    include: {
      athlete: { select: { rmSquat: true, rmBench: true, rmDeadlift: true } },
      bloques: { include: { sesiones: { include: { ejercicios: true } } } },
    },
  });
  if (!plan) return Response.json({ error: 'No encontrado' }, { status: 404 });

  const { data: body, error } = await parseBody(req, postSchema);
  if (error) return error;
  const pct: Record<string, PctEntry> = body.pct;
  const saveConfig: boolean = body.save_config ?? false;

  const rms: Record<LiftKey, number> = {
    sq: plan.athlete.rmSquat ?? 0,
    bp: plan.athlete.rmBench ?? 0,
    dl: plan.athlete.rmDeadlift ?? 0,
  };

  const updates: { id: string; peso: number }[] = [];

  for (const bloque of plan.bloques) {
    for (const sesion of bloque.sesiones) {
      const semanaConfig = pct[String(sesion.numeroSemana)];
      if (!semanaConfig) continue;

      for (const ej of sesion.ejercicios) {
        if (ej.tipoEjercicio !== 'COMPETITIVO') continue;
        const lift = detectLift(ej.ejercicioNombre);
        if (!lift) continue;
        const rm = rms[lift];
        if (!rm) continue;
        const pctVal = semanaConfig[lift];
        if (!pctVal) continue;
        const peso = roundTo2_5(rm * pctVal / 100);
        if (peso > 0) updates.push({ id: ej.id, peso });
      }
    }
  }

  await Promise.all(
    updates.map(u =>
      prisma.ejercicioSesion.update({ where: { id: u.id }, data: { pesoProgramado: u.peso } })
    )
  );

  if (saveConfig) {
    await prisma.periodizacion.update({ where: { id }, data: { progresionPct: pct } });
  }

  return Response.json({ updated: updates.length });
}
