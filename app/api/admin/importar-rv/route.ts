import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

const MOV_TO_BASE: Record<string, string> = {
  sq: 'Sentadilla Trasera',
  bp: 'Press de Banca',
  dl: 'Peso Muerto',
};

const TIPO_TO_CAT: Record<string, 'VARIANTE' | 'AUXILIAR' | 'COMPENSATORIO'> = {
  variante: 'VARIANTE',
  auxiliar: 'AUXILIAR',
  compensatorio: 'COMPENSATORIO',
};

// GET: preview count of missing RV exercises
export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const [rvAll, existentes] = await Promise.all([
    prisma.ejercicioRV.findMany({ select: { nombre: true } }),
    prisma.ejercicioBiblioteca.findMany({ where: { coachId: coach.id }, select: { nombre: true } }),
  ]);

  const existentesSet = new Set(existentes.map(e => e.nombre.toLowerCase()));
  const faltantes = rvAll.filter(rv => !existentesSet.has(rv.nombre.toLowerCase())).length;

  return Response.json({ faltantes, total: rvAll.length });
}

// POST: import all missing RV exercises into Mi Biblioteca
export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  const [rvAll, existentes] = await Promise.all([
    prisma.ejercicioRV.findMany({ orderBy: { nombre: 'asc' } }),
    prisma.ejercicioBiblioteca.findMany({ where: { coachId: coach.id }, select: { id: true, nombre: true } }),
  ]);

  const existentesSet = new Set(existentes.map(e => e.nombre.toLowerCase()));

  // Build Big3 parent id map
  const big3Map: Record<string, string> = {};
  for (const [mov, baseName] of Object.entries(MOV_TO_BASE)) {
    const base = existentes.find(e => e.nombre === baseName);
    if (base) big3Map[mov] = base.id;
  }

  let importados = 0;
  let saltados = 0;

  for (const rv of rvAll) {
    if (existentesSet.has(rv.nombre.toLowerCase())) { saltados++; continue; }
    const categoria = TIPO_TO_CAT[rv.tipo] ?? 'AUXILIAR';
    const parentId = (rv.tipo === 'variante' && rv.movimiento in big3Map) ? big3Map[rv.movimiento] : null;
    await prisma.ejercicioBiblioteca.create({
      data: {
        coachId: coach.id,
        nombre: rv.nombre,
        categoria,
        gruposMusculares: rv.musculosObjetivo,
        descripcion: rv.cuandoUsarlo || null,
        cuesTecnicos: rv.tecnicaClave ? [rv.tecnicaClave] : [],
        notasSeguridad: null,
        videoUrl: rv.videoUrl || null,
        equipamientoReq: [],
        parentId,
      },
    });
    importados++;
  }

  return Response.json({ ok: true, importados, saltados, message: `${importados} ejercicios importados, ${saltados} ya existían.` });
}
