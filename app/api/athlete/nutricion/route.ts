import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

// ── Caloric multiplier based on training days/week ────────────────────────────
function activityKcalPerKg(dias: number): number {
  if (dias >= 5) return 38;
  if (dias >= 4) return 36;
  if (dias >= 3) return 34;
  return 32;
}

// ── Phase adjustments ─────────────────────────────────────────────────────────
type PhaseConfig = {
  caloricFactor: number;   // multiplier on top of TDEE
  proteinPerKg: number;    // g / kg body weight
  label: string;
  razon: string;
};

function phaseConfig(enfasis: string | null): PhaseConfig {
  const e = (enfasis ?? '').toLowerCase();
  if (e.includes('hipertrofia'))   return { caloricFactor: 1.10, proteinPerKg: 2.2, label: 'Hipertrofia', razon: 'Superávit calórico (~10%) para maximizar adaptaciones musculares.' };
  if (e.includes('volumen'))       return { caloricFactor: 1.05, proteinPerKg: 2.0, label: 'Volumen', razon: 'Ligero superávit para sostener el alto volumen de entrenamiento.' };
  if (e.includes('fuerza'))        return { caloricFactor: 1.00, proteinPerKg: 2.0, label: 'Fuerza Base', razon: 'Mantenimiento calórico. Prioridad en recuperación y fuerza.' };
  if (e.includes('peaking'))       return { caloricFactor: 0.97, proteinPerKg: 2.2, label: 'Peaking', razon: 'Leve déficit posible. Proteína alta para preservar masa en intensidad máxima.' };
  if (e.includes('tapering'))      return { caloricFactor: 0.93, proteinPerKg: 2.2, label: 'Tapering', razon: 'Actividad reducida: calorías bajan. Proteína alta para conservar músculo.' };
  return { caloricFactor: 1.00, proteinPerKg: 2.0, label: 'General', razon: 'Sin fase activa detectada. Valores de mantenimiento.' };
}

export async function GET(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload) return Response.json({ error: 'No autorizado' }, { status: 401 });

  const athlete = await prisma.athleteProfile.findUnique({
    where: { userId: payload.userId },
    select: {
      pesoActual: true,
      altura: true,
      edad: true,
      diasDisponibles: true,
      experienciaPowerlifting: true,
      periodizaciones: {
        where: { estado: 'ACTIVE' },
        select: {
          fechaInicio: true,
          bloques: {
            select: { semanaInicio: true, semanaFin: true, enfasis: true, nombre: true },
          },
        },
        take: 1,
      },
    },
  });

  if (!athlete) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

  if (!athlete.pesoActual) {
    return Response.json({ peso_no_configurado: true });
  }

  const peso = athlete.pesoActual;
  const diasCount = athlete.diasDisponibles.length || 3;

  // Find current block
  const peri = athlete.periodizaciones[0] ?? null;
  let enfasisActual: string | null = null;
  if (peri) {
    const now = new Date();
    const start = new Date(peri.fechaInicio);
    const semanaActual = Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
    const bloqueActual = peri.bloques.find(b => semanaActual >= b.semanaInicio && semanaActual <= b.semanaFin);
    enfasisActual = bloqueActual?.enfasis ?? peri.bloques.at(-1)?.enfasis ?? null;
  }

  const phase = phaseConfig(enfasisActual);
  const tdeeBase = peso * activityKcalPerKg(diasCount);
  const calorias = Math.round(tdeeBase * phase.caloricFactor);
  const caloriasMin = Math.round(calorias * 0.95);
  const caloriasMax = Math.round(calorias * 1.05);

  const proteinaMin = Math.round(peso * phase.proteinPerKg);
  const proteinaMax = Math.round(peso * (phase.proteinPerKg + 0.3));

  // Fat: ~1.1 g/kg
  const grasaMin = Math.round(peso * 1.0);
  const grasaMax = Math.round(peso * 1.2);

  // Carbs: fill remaining kcal (protein = 4 kcal/g, fat = 9 kcal/g, carbs = 4 kcal/g)
  const kcalProteina = proteinaMin * 4;
  const kcalGrasa = grasaMin * 9;
  const carbsMin = Math.round(Math.max(0, (caloriasMin - kcalProteina - kcalGrasa) / 4));
  const carbsMax = Math.round(Math.max(0, (caloriasMax - kcalProteina - kcalGrasa) / 4));

  return Response.json({
    peso,
    fase: phase.label,
    razon: phase.razon,
    diasEntrenamiento: diasCount,
    calorias: { min: caloriasMin, max: caloriasMax, referencia: calorias },
    macros: {
      proteina: { min: proteinaMin, max: proteinaMax, porKg: phase.proteinPerKg },
      carbohidratos: { min: carbsMin, max: carbsMax },
      grasa: { min: grasaMin, max: grasaMax },
    },
    nota: 'Estimaciones basadas en peso corporal, días de entrenamiento y fase del bloque. Consulta a un nutricionista deportivo para un plan personalizado.',
  });
}
