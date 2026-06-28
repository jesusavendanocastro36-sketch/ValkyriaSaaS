import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

function detectLift(nombre: string): 'sq' | 'bp' | 'dl' | null {
  const n = nombre.toLowerCase();
  if (n.includes('sentadilla') || n.includes('squat')) return 'sq';
  if (n.includes('banca') || n.includes('bench')) return 'bp';
  if (n.includes('muerto') || n.includes('deadlift') || n.includes('sumo')) return 'dl';
  return null;
}

// Returns ISO week string "YYYY-Www" for a given date
function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  // athleteId param allows coach to query any of their athletes
  const athleteIdParam = searchParams.get('athleteId');

  let athlete;
  if (athleteIdParam && payload.rol === 'ADMIN') {
    athlete = await prisma.athleteProfile.findFirst({
      where: { id: athleteIdParam, coachId: (await prisma.coachProfile.findUnique({ where: { userId: payload.userId } }))!.id },
    });
  } else {
    athlete = await prisma.athleteProfile.findUnique({ where: { userId: payload.userId } });
  }

  if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const semanas = parseInt(searchParams.get('semanas') ?? '8');
  const desde = new Date(Date.now() - semanas * 7 * 24 * 60 * 60 * 1000);

  const seguimientos = await prisma.seguimientoAtleta.findMany({
    where: { athleteId: athlete.id, fechaRealizacion: { gte: desde } },
    include: { ejercicioSesion: { select: { ejercicioNombre: true } } },
    orderBy: { fechaRealizacion: 'asc' },
  });

  // Aggregate sets per week per lift
  type WeekData = { sq: number; bp: number; dl: number };
  const weekMap = new Map<string, WeekData>();

  for (const s of seguimientos) {
    const week = isoWeek(s.fechaRealizacion);
    const lift = detectLift(s.ejercicioSesion.ejercicioNombre);
    if (!lift) continue;
    if (!weekMap.has(week)) weekMap.set(week, { sq: 0, bp: 0, dl: 0 });
    weekMap.get(week)![lift]++;
  }

  // Sort weeks and build array
  const semanasSeries = [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([semana, data]) => ({ semana, ...data }));

  return Response.json({
    semanas_series: semanasSeries,
    landmarks: {
      sq: { mev: athlete.sqMev, mav: athlete.sqMav, mrv: athlete.sqMrv },
      bp: { mev: athlete.bpMev, mav: athlete.bpMav, mrv: athlete.bpMrv },
      dl: { mev: athlete.dlMev, mav: athlete.dlMav, mrv: athlete.dlMrv },
    },
  });
}
