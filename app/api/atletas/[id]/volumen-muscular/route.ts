import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

// ── Muscle normalization ────────────────────────────────────────────────────

const MUSCLE_ALIASES: Record<string, string> = {
  cuadriceps: 'cuádriceps', cuádriceps: 'cuádriceps', quad: 'cuádriceps', quads: 'cuádriceps',
  'cuádricep': 'cuádriceps',
  isquiotibiales: 'isquiotibiales', femoral: 'isquiotibiales', femorales: 'isquiotibiales', hamstrings: 'isquiotibiales',
  gluteos: 'glúteos', glúteos: 'glúteos', gluteo: 'glúteos', glúteo: 'glúteos', 'glute': 'glúteos',
  'espalda baja': 'espalda baja', lumbares: 'espalda baja', lumbar: 'espalda baja', erectors: 'espalda baja', 'espalda lumbar': 'espalda baja',
  'espalda alta': 'espalda alta', dorsal: 'espalda alta', dorsales: 'espalda alta', espalda: 'espalda alta',
  trapecio: 'espalda alta', trapecios: 'espalda alta', romboides: 'espalda alta', 'dorsal ancho': 'espalda alta',
  pecho: 'pecho', pectoral: 'pecho', pectorales: 'pecho', 'pec': 'pecho',
  hombros: 'hombros', hombro: 'hombros', deltoides: 'hombros', deltoide: 'hombros', 'hombro anterior': 'hombros', 'hombro lateral': 'hombros', 'hombro posterior': 'hombros',
  triceps: 'tríceps', tríceps: 'tríceps', 'tricep': 'tríceps',
  biceps: 'bíceps', bíceps: 'bíceps', 'bicep': 'bíceps',
  core: 'core', abdomen: 'core', abdominales: 'core', oblicuos: 'core', 'abdomen / core': 'core', abdominal: 'core',
  pantorrillas: 'pantorrillas', gemelos: 'pantorrillas', soleo: 'pantorrillas', sóleos: 'pantorrillas', calves: 'pantorrillas',
  aductores: 'aductores', aductor: 'aductores',
  antebrazos: 'antebrazos', antebrazo: 'antebrazos',
};

function normalizeMusculo(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return MUSCLE_ALIASES[lower] ?? lower;
}

// ── Keyword inference for exercises not found in either library ────────────

const KEYWORD_MAP: { keywords: string[]; muscles: string[] }[] = [
  { keywords: ['sentadilla', 'squat', 'goblet'], muscles: ['cuádriceps', 'glúteos', 'isquiotibiales', 'core'] },
  { keywords: ['peso muerto', 'deadlift', 'rdl', 'sldl', 'rumano', 'sumo'], muscles: ['isquiotibiales', 'glúteos', 'espalda baja', 'espalda alta'] },
  { keywords: ['buenos días', 'good morning'], muscles: ['isquiotibiales', 'glúteos', 'espalda baja'] },
  { keywords: ['press de banca', 'bench press', 'banca', 'bench'], muscles: ['pecho', 'tríceps', 'hombros'] },
  { keywords: ['press militar', 'overhead press', 'ohp', 'press sobre cabeza'], muscles: ['hombros', 'tríceps', 'core'] },
  { keywords: ['press inclinado', 'incline press'], muscles: ['pecho', 'tríceps', 'hombros'] },
  { keywords: ['remo', 'row', 'jalón', 'jalon', 'pulldown', 'pull down', 'dominada', 'chin up', 'pull up'], muscles: ['espalda alta', 'bíceps'] },
  { keywords: ['curl', 'predicador', 'martillo', 'hammer'], muscles: ['bíceps', 'antebrazos'] },
  { keywords: ['extensión de codo', 'extensión tríceps', 'skull crusher', 'jalón tríceps', 'press francés'], muscles: ['tríceps'] },
  { keywords: ['hip thrust', 'puente de glúteos', 'glute bridge'], muscles: ['glúteos', 'isquiotibiales'] },
  { keywords: ['elevación lateral', 'lateral raise', 'elevación frontal', 'front raise', 'pájaro', 'rear delt'], muscles: ['hombros'] },
  { keywords: ['face pull'], muscles: ['hombros', 'espalda alta'] },
  { keywords: ['plancha', 'plank', 'hollow', 'ab wheel', 'crunch', 'sit up'], muscles: ['core'] },
  { keywords: ['extensión de cadera', 'leg press', 'prensa'], muscles: ['cuádriceps', 'glúteos'] },
  { keywords: ['zancada', 'lunges', 'split squat', 'búlgaro', 'bulgaras'], muscles: ['cuádriceps', 'glúteos', 'isquiotibiales'] },
  { keywords: ['pantorrilla', 'gemelo', 'soleo', 'calf raise'], muscles: ['pantorrillas'] },
  { keywords: ['aductor', 'abductor'], muscles: ['aductores'] },
];

function inferMusclesFromName(nombre: string): string[] {
  const lower = nombre.toLowerCase();
  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some(k => lower.includes(k))) {
      return entry.muscles;
    }
  }
  return [];
}

// ── MEV / MAV / MRV thresholds (series por semana) ─────────────────────────

export const MUSCULOS_PRINCIPALES = [
  'cuádriceps', 'isquiotibiales', 'glúteos', 'espalda baja',
  'espalda alta', 'pecho', 'hombros', 'tríceps', 'bíceps', 'core',
];

// MV = mantenimiento · MEV = mínimo efectivo · MAV = adaptativo máx · MRV = máximo recuperable
const UMBRALES: Record<string, { mv: number; mev: number; mav: number; mrv: number }> = {
  'cuádriceps':     { mv: 6, mev: 8,  mav: 12, mrv: 20 },
  'isquiotibiales': { mv: 4, mev: 6,  mav: 10, mrv: 16 },
  'glúteos':        { mv: 4, mev: 6,  mav: 10, mrv: 16 },
  'espalda baja':   { mv: 4, mev: 6,  mav: 10, mrv: 14 },
  'espalda alta':   { mv: 8, mev: 10, mav: 15, mrv: 22 },
  'pecho':          { mv: 6, mev: 8,  mav: 12, mrv: 20 },
  'hombros':        { mv: 6, mev: 8,  mav: 14, mrv: 20 },
  'tríceps':        { mv: 4, mev: 6,  mav: 10, mrv: 18 },
  'bíceps':         { mv: 4, mev: 6,  mav: 10, mrv: 18 },
  'core':           { mv: 6, mev: 8,  mav: 12, mrv: 16 },
};

// ── Route ───────────────────────────────────────────────────────────────────

// Estímulo de un ejercicio: músculos primarios (1.0 serie) y secundarios (0.5 serie)
type Estimulo = { primary: string[]; secondary: string[] };

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const { id: atletaId } = await params;
  const { searchParams } = new URL(req.url);
  const periodizacionId = searchParams.get('periodizacionId');

  const coach = await prisma.coachProfile.findUnique({ where: { userId: payload.userId } });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  // Find periodization
  const periodizacion = periodizacionId
    ? await prisma.periodizacion.findFirst({
        where: { id: periodizacionId, coachId: coach.id },
        include: { bloques: { orderBy: { numeroBloque: 'asc' }, include: { sesiones: { include: { ejercicios: true } } } } },
      })
    : await prisma.periodizacion.findFirst({
        where: { coachId: coach.id, athleteId: atletaId, estado: { not: 'COMPLETED' } },
        orderBy: { createdAt: 'desc' },
        include: { bloques: { orderBy: { numeroBloque: 'asc' }, include: { sesiones: { include: { ejercicios: true } } } } },
      });

  if (!periodizacion) return Response.json({ error: 'Sin periodización activa' }, { status: 404 });

  // Build exercise-to-muscles lookup from both libraries (batch fetch once)
  const [rvEjercicios, bibEjercicios] = await Promise.all([
    prisma.ejercicioRV.findMany({ select: { nombre: true, altNombre: true, musculosObjetivo: true } }),
    prisma.ejercicioBiblioteca.findMany({ where: { coachId: coach.id }, select: { nombre: true, gruposMusculares: true, musculosSecundarios: true } }),
  ]);

  // Cada ejercicio aporta estímulo a sus músculos primarios (1.0) y secundarios (0.5)
  const muscleLookup = new Map<string, Estimulo>();
  for (const e of rvEjercicios) {
    // La biblioteca RV no separa primario/secundario → todos cuentan como primarios
    const est: Estimulo = { primary: e.musculosObjetivo.map(normalizeMusculo), secondary: [] };
    muscleLookup.set(e.nombre.toLowerCase(), est);
    if (e.altNombre) muscleLookup.set(e.altNombre.toLowerCase(), est);
  }
  for (const e of bibEjercicios) {
    const key = e.nombre.toLowerCase();
    if (!muscleLookup.has(key)) muscleLookup.set(key, {
      primary: e.gruposMusculares.map(normalizeMusculo),
      secondary: (e.musculosSecundarios ?? []).map(normalizeMusculo),
    });
  }

  // Process each block
  const bloques = periodizacion.bloques.map(bloque => {
    const semanas = bloque.semanaFin - bloque.semanaInicio + 1;

    // Accumulate sets per muscle across all sessions in block
    const musculoSeries: Record<string, { total: number; ejercicios: Set<string> }> = {};

    const addSeries = (musculo: string, sets: number, nombre: string) => {
      if (!musculoSeries[musculo]) musculoSeries[musculo] = { total: 0, ejercicios: new Set() };
      musculoSeries[musculo].total += sets;
      musculoSeries[musculo].ejercicios.add(nombre);
    };

    for (const sesion of bloque.sesiones) {
      for (const ej of sesion.ejercicios) {
        const key = ej.ejercicioNombre.toLowerCase();
        let est = muscleLookup.get(key);

        // Partial match fallback
        if (!est) {
          for (const [libKey, libEst] of muscleLookup.entries()) {
            if (key.includes(libKey) || libKey.includes(key.split(' ')[0])) {
              est = libEst;
              break;
            }
          }
        }

        // Keyword inference fallback (todo como primario)
        if (!est || (est.primary.length === 0 && est.secondary.length === 0)) {
          est = { primary: inferMusclesFromName(ej.ejercicioNombre), secondary: [] };
        }

        // Conteo fraccionado: primario = serie completa, secundario = media serie
        for (const m of est.primary)   addSeries(m, ej.setsProgramados, ej.ejercicioNombre);
        for (const m of est.secondary) addSeries(m, ej.setsProgramados * 0.5, ej.ejercicioNombre);
      }
    }

    // Build output with series per week
    const musculosData: Record<string, { totalSeries: number; seriesPorSemana: number; ejercicios: string[]; estado: string }> = {};

    for (const [musculo, data] of Object.entries(musculoSeries)) {
      const spw = Math.round((data.total / semanas) * 10) / 10;
      const u = UMBRALES[musculo];
      let estado = 'ok';
      if (u) {
        if (spw === 0) estado = 'sin_estimulo';
        else if (spw < u.mv) estado = 'bajo_mv';          // ni siquiera mantiene
        else if (spw < u.mev) estado = 'mantenimiento';   // mantiene pero no crece
        else if (spw >= u.mrv) estado = 'sobre_mrv';      // riesgo de no recuperar
        else if (spw >= u.mav) estado = 'optimo';         // rango adaptativo alto
        else estado = 'ok';                               // rango efectivo
      }
      musculosData[musculo] = {
        totalSeries: data.total,
        seriesPorSemana: spw,
        ejercicios: Array.from(data.ejercicios),
        estado,
      };
    }

    // Alertas: check all principal muscles
    const alertas: { tipo: 'error' | 'advertencia' | 'info'; musculo: string; mensaje: string }[] = [];

    for (const musculo of MUSCULOS_PRINCIPALES) {
      const u = UMBRALES[musculo];
      const data = musculosData[musculo];
      const spw = data?.seriesPorSemana ?? 0;

      if (!data || spw === 0) {
        alertas.push({ tipo: 'error', musculo, mensaje: `Sin estimulación de ${musculo}` });
      } else if (u && spw < u.mev) {
        alertas.push({ tipo: 'advertencia', musculo, mensaje: `${musculo}: ${spw} series/sem — por debajo del MEV (${u.mev})` });
      } else if (u && spw >= u.mrv) {
        alertas.push({ tipo: 'info', musculo, mensaje: `${musculo}: ${spw} series/sem — cerca del MRV (${u.mrv}). Considera reducir.` });
      }
    }

    return {
      id: bloque.id,
      nombre: bloque.nombre,
      numeroBloque: bloque.numeroBloque,
      semanaInicio: bloque.semanaInicio,
      semanaFin: bloque.semanaFin,
      semanas,
      enfasis: bloque.enfasis,
      musculosData,
      alertas,
      totalSesiones: bloque.sesiones.length,
      totalEjercicios: bloque.sesiones.reduce((acc, s) => acc + s.ejercicios.length, 0),
    };
  });

  return Response.json({
    periodizacion: { id: periodizacion.id, nombre: periodizacion.nombre, tipo: periodizacion.tipo },
    bloques,
    umbrales: UMBRALES,
    musculosPrincipales: MUSCULOS_PRINCIPALES,
  });
}
