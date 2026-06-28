// Tipos, constantes y helpers compartidos del editor de periodizaciones

export type SeguimientoSet = {
  numeroSet: number;
  repsRealizadas: number;
  pesoUsado: number;
  rpeReportado: number;
  completado: boolean;
  notasAtleta: string | null;
};

export type Ejercicio = {
  id: string;
  ejercicioNombre: string;
  tipoEjercicio: string;
  ordenGrupo: string | null;
  cargaRef: string | null;
  rirLabel: string | null;
  setsProgramados: number;
  repsProgramadas: number;
  rpeProgramado: number;
  pesoProgramado: number | null;
  restMinutos: number;
  notasTecnicas: string | null;
  videoUrl: string | null;
  orden: number;
  seguimiento: SeguimientoSet[];
};

export type Sesion = {
  id: string;
  numeroSemana: number;
  diaSemana: string;
  movimientoPrincipal: string;
  enfocuoDia: string;
  descripcion: string | null;
  ordenSecuencia: number | null;
  bloqueado: boolean;
  ejercicios: Ejercicio[];
};

export type Bloque = {
  id: string;
  numeroBloque: number;
  nombre: string;
  semanaInicio: number;
  semanaFin: number;
  enfasis: string;
  intensidadRpeMin: number;
  intensidadRpeMax: number;
  sesiones: Sesion[];
};

export type PctEntry = { sq: number; bp: number; dl: number };

export type TaperingResult = {
  tipo_tapering: 'IDEAL' | 'FATIGADO' | 'INCANSABLE' | 'PEOR';
  razon_tipo: string;
  semanas_tapering: number;
  recomendacion_general: string;
  sesiones_creadas: number;
};

export type EfectividadBloque = {
  id: string;
  nombre: string;
  semanaInicio: number;
  semanaFin: number;
  enfasis: string;
  stats: {
    sesiones: number;
    tonelaje: number;
    rpe_promedio: number | null;
    rm_inicio: { sq: number | null; bp: number | null; dl: number | null };
    rm_fin: { sq: number | null; bp: number | null; dl: number | null };
    mejora: { sq: number | null; bp: number | null; dl: number | null };
  };
};

export type BasicoMovimiento = 'SENTADILLA' | 'PRESS_BANCA' | 'PESO_MUERTO';

export type FaseBasico = {
  id: string;
  basico: BasicoMovimiento;
  bloque: string;
  semanaInicio: number;
  semanaFin: number;
  rpeMin: number;
  rpeMax: number;
  porcentajeRmMin: number | null;
  porcentajeRmMax: number | null;
  repsMin: number | null;
  repsMax: number | null;
  notas: string | null;
};

export type Periodizacion = {
  id: string;
  nombre: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  duracionSemanas: number;
  objetivo: string;
  descripcion: string | null;
  estado: 'DRAFT' | 'ACTIVE' | 'COMPLETED';
  progresionPct: Record<string, PctEntry> | null;
  fechaCompetencia: string | null;
  semanaMaxVisible: number | null;
  fasesBasico: FaseBasico[];
  athlete: {
    id: string;
    pesoActual: number | null;
    altura: number | null;
    edad: number | null;
    categoriaPeso: string | null;
    experienciaPowerlifting: string;
    lesionesActuales: string[];
    objetivos: string[];
    rmSquat: number | null;
    rmBench: number | null;
    rmDeadlift: number | null;
    user: { nombre: string };
  };
  bloques: Bloque[];
};

export const TIPO_LABEL: Record<string, string> = {
  LINEAL: 'Lineal', ONDULANTE: 'Ondulante (DUP)', CONJUGADA: 'Conjugada', POR_BLOQUES: 'Por Bloques',
};
export const ESTADO_COLOR: Record<string, string> = {
  DRAFT: 'text-yellow-400 bg-yellow-400/10', ACTIVE: 'text-green-400 bg-green-400/10', COMPLETED: 'text-gray-400 bg-gray-400/10',
};
export const DIA_MAP: Record<string, string> = {
  lunes: 'Lun', martes: 'Mar', miercoles: 'Mié', jueves: 'Jue', viernes: 'Vie', sabado: 'Sáb', domingo: 'Dom',
};
export const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
export const TIPOS_EJ = ['COMPETITIVO', 'VARIANTE', 'AUXILIAR', 'COMPENSATORIO', 'MOVILIDAD'];

export const DEFAULT_PCT: PctEntry[] = [
  { sq: 78, bp: 77, dl: 80 },
  { sq: 80, bp: 79, dl: 82 },
  { sq: 83, bp: 81, dl: 84 },
  { sq: 86, bp: 84, dl: 86 },
  { sq: 89, bp: 87, dl: 88 },
];

export function tipoColor(tipo: string): string {
  const t = tipo.toUpperCase();
  if (t === 'COMPETITIVO') return 'text-[#FF4500] bg-[#FF4500]/10';
  if (t === 'VARIANTE') return 'text-blue-300 bg-blue-400/10';
  if (t === 'ACCESORIO' || t === 'AUXILIAR') return 'text-orange-300 bg-orange-400/10';
  if (t === 'COMPENSATORIO') return 'text-purple-300 bg-purple-400/10';
  if (t === 'MOVILIDAD') return 'text-green-400 bg-green-400/10';
  return 'text-gray-400 bg-gray-800';
}

export function grupoColor(grupo: string | null): string {
  if (!grupo) return 'text-gray-500';
  if (grupo.startsWith('A')) return 'text-[#FFB800] font-bold';
  if (grupo.startsWith('B')) return 'text-blue-300 font-semibold';
  return 'text-gray-400';
}

// ── RPE / RIR helpers ────────────────────────────────────────────────────────

export const RPE_TO_RIR: Record<string, number> = {
  '10': 0, '9.5': 1, '9': 2, '8.5': 3, '8': 4, '7.5': 5, '7': 6, '6.5': 7, '6': 8,
};

// % of 1RM by RPE (rows) and reps 1-12 (columns). Zourdos / Helms table.
export const RPE_PCTS: Record<number, number[]> = {
  10:  [100, 96, 92, 89, 86, 84, 82, 79, 77, 75, 72, 70],
  9.5: [98,  94, 91, 88, 85, 82, 80, 77, 75, 73, 71, 69],
  9:   [96,  92, 89, 86, 83, 81, 79, 76, 74, 72, 70, 68],
  8.5: [94,  91, 88, 85, 82, 80, 78, 75, 73, 71, 69, 67],
  8:   [92,  89, 86, 83, 81, 78, 76, 74, 72, 70, 68, 65],
  7.5: [91,  88, 85, 82, 79, 77, 75, 73, 71, 69, 67, 64],
  7:   [89,  86, 83, 80, 78, 76, 74, 72, 70, 68, 66, 63],
  6.5: [88,  85, 82, 79, 76, 74, 72, 70, 68, 67, 65, 62],
  6:   [86,  83, 80, 77, 75, 73, 71, 69, 67, 65, 63, 60],
};

export function calcRpeForWeek(semana: number, semIni: number, semFin: number, rpeMin: number, rpeMax: number): number {
  const total = semFin - semIni;
  if (total <= 0) return rpeMin;
  const progress = (semana - semIni) / total;
  return Math.round((rpeMin + progress * (rpeMax - rpeMin)) * 2) / 2;
}

export function getRirLabel(rpe: number): string {
  const rir = RPE_TO_RIR[String(rpe)];
  return rir !== undefined ? `RIR ${rir}` : '';
}

export function getPesoSugerido(rm1: number, factor: number, rpe: number, reps: number): { peso: number; pct: number; rmEfectivo: number } | null {
  const row = RPE_PCTS[rpe];
  if (!rm1 || !row || factor <= 0) return null;
  const idx = Math.min(Math.max(reps - 1, 0), 11);
  const pct = row[idx];
  if (!pct) return null;
  const rmEfectivo = Math.round(rm1 * factor * 10) / 10;
  return { peso: Math.round((rmEfectivo * pct / 100) / 2.5) * 2.5, pct, rmEfectivo };
}

export const BLANK_SESION = {
  numero_semana: 1, dia_semana: 'lunes', movimiento_principal: '', enfocuo_dia: '', descripcion: '', orden_secuencia: 1,
};
export const BLANK_EJ = {
  ejercicio_nombre: '', tipo_ejercicio: 'COMPETITIVO', orden_grupo: '', carga_ref: '', rir_label: '',
  sets_programados: 4, reps_programadas: 3, rpe_programado: 8, peso_programado: '', peso_rm: '', factor_variante: '1', rest_minutos: 3, notas_tecnicas: '', video_url: '',
};
