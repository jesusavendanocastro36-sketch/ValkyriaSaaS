// Periodización Paul Bustamante Solis — Pre-Competencia Nov 9 2026
// 5 días/semana — Lesión cuádriceps derecho activa
// Series mínimas respetadas por encima de MEV avanzado

const BASE = process.env.SEED_BASE_URL ?? 'https://valkyria-saas.vercel.app';
// Token de admin tomado del entorno — NUNCA hardcodear en un repo público.
// Uso: ADMIN_TOKEN="<jwt>" node scripts/seed-paul-periodizacion.mjs
const TOKEN = process.env.ADMIN_TOKEN;
if (!TOKEN) { console.error('Falta ADMIN_TOKEN en el entorno.'); process.exit(1); }
const PAUL_ID = 'cmpkm6dya000104jo5wqdzlxo';

const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined));
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, { method: 'POST', headers, body: JSON.stringify(clean(body)) });
  const data = await res.json();
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

// ─── PLANTILLAS DE SESIÓN ──────────────────────────────────────────────────────
// Volumen semanal con 5 días:
//   Sentadilla : 12-16 sets/sem → MAV avanzado ✓
//   Banca      : 14-18 sets/sem → MAV avanzado ✓
//   DL         : 5-7 sets/sem  → MEV–MAV ✓ (DL no necesita más por fatiga)

const S = {

  // ══════════════════════════════════════════════════════
  // BLOQUE INTRO (3 días lower + 2 días upper puro)
  // Quad lesionado → los días extra son upper sin estrés en cuád
  // ══════════════════════════════════════════════════════

  intro_lunes: {
    movimiento_principal: 'Box Squat',
    enfocuo_dia: 'Lower A — Box Squat + cadena posterior',
    descripcion: 'Primer día de sentadilla. Box por encima del paralelo. Sin dolor como criterio absoluto.',
    ejercicios: [
      { ejercicio_nombre: 'Box Squat', tipo_ejercicio: 'COMPETITIVO', sets_programados: 4, reps_programadas: 5, rpe_programado: 6, peso_programado: 50, rest_minutos: 4, notas_tecnicas: 'Caja por encima del paralelo. Parar si hay punzada. Reportar dolor 0-10.', orden: 1 },
      { ejercicio_nombre: 'Romanian Deadlift', tipo_ejercicio: 'VARIANTE', sets_programados: 4, reps_programadas: 8, rpe_programado: 6, peso_programado: 100, rest_minutos: 3, notas_tecnicas: 'Isquios y glúteos. Sin tensión en cuádricep.', orden: 2 },
      { ejercicio_nombre: 'Leg Press', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 10, rpe_programado: 6, peso_programado: 80, rest_minutos: 2, notas_tecnicas: 'ROM hasta 90° de rodilla máximo. Progresivo.', orden: 3 },
      { ejercicio_nombre: 'Leg Curl', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 12, rpe_programado: 6, peso_programado: 30, rest_minutos: 2, notas_tecnicas: 'Fortalece isquiotibiales para proteger la rodilla.', orden: 4 },
    ],
  },

  intro_martes: {
    movimiento_principal: 'Bench Press',
    enfocuo_dia: 'Upper A — Banca pesada + jalón',
    descripcion: 'Día de banca. Sin restricciones. Progresión normal. Aprovecha que no hay lesión en tren superior.',
    ejercicios: [
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 4, reps_programadas: 5, rpe_programado: 6.5, peso_programado: 82, rest_minutos: 3, notas_tecnicas: 'Pausa de 1s en el pecho. Control en la bajada 3 segundos.', orden: 1 },
      { ejercicio_nombre: 'Barbell Row', tipo_ejercicio: 'AUXILIAR', sets_programados: 4, reps_programadas: 8, rpe_programado: 6.5, peso_programado: 72, rest_minutos: 3, notas_tecnicas: 'Codo a 45°. Retracción escapular completa.', orden: 2 },
      { ejercicio_nombre: 'Overhead Press', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 8, rpe_programado: 6, peso_programado: 50, rest_minutos: 2, notas_tecnicas: 'Fortalece hombros y tríceps para la banca.', orden: 3 },
      { ejercicio_nombre: 'Tricep Pushdown', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 12, rpe_programado: 6, peso_programado: 25, rest_minutos: 2, orden: 4 },
      { ejercicio_nombre: 'Face Pull', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 15, rpe_programado: 6, peso_programado: 20, rest_minutos: 1, notas_tecnicas: 'Salud del manguito rotador.', orden: 5 },
    ],
  },

  intro_miercoles: {
    movimiento_principal: 'Deadlift Sumo',
    enfocuo_dia: 'Lower B — DL + Box Squat ligero',
    descripcion: 'Día de jalón sumo. Box squat como segunda pasada, más ligero. Monitorear cuádricep en el jalón.',
    ejercicios: [
      { ejercicio_nombre: 'Deadlift Sumo', tipo_ejercicio: 'COMPETITIVO', sets_programados: 4, reps_programadas: 4, rpe_programado: 6.5, peso_programado: 160, rest_minutos: 4, notas_tecnicas: 'Monitorear si el jalón provoca tensión en cuádricep derecho. Reportar.', orden: 1 },
      { ejercicio_nombre: 'Box Squat', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 5, rpe_programado: 6, peso_programado: 45, rest_minutos: 3, notas_tecnicas: 'Segunda pasada. Más ligero que el lunes. Foco en técnica.', orden: 2 },
      { ejercicio_nombre: 'Back Extension / GHD', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 10, rpe_programado: 6, peso_programado: 20, rest_minutos: 2, notas_tecnicas: 'Cadena posterior y lumbar.', orden: 3 },
      { ejercicio_nombre: 'Leg Curl', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 12, rpe_programado: 6, peso_programado: 32, rest_minutos: 2, orden: 4 },
    ],
  },

  intro_jueves: {
    movimiento_principal: 'Bench Press',
    enfocuo_dia: 'Upper B — Banca volumen + accesorios',
    descripcion: 'Segunda sesión de banca. Más volumen, menos intensidad que el martes. Sin carga en piernas.',
    ejercicios: [
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 4, reps_programadas: 8, rpe_programado: 6.5, peso_programado: 75, rest_minutos: 3, notas_tecnicas: 'Más reps, menos peso. Construye volumen en pecho.', orden: 1 },
      { ejercicio_nombre: 'Close Grip Bench Press', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 8, rpe_programado: 6, peso_programado: 65, rest_minutos: 2, notas_tecnicas: 'Énfasis tríceps. Variante para reforzar el lock-out.', orden: 2 },
      { ejercicio_nombre: 'Lat Pulldown', tipo_ejercicio: 'AUXILIAR', sets_programados: 4, reps_programadas: 10, rpe_programado: 6, peso_programado: 62, rest_minutos: 2, orden: 3 },
      { ejercicio_nombre: 'Tricep Extension', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 12, rpe_programado: 6, peso_programado: 30, rest_minutos: 1, orden: 4 },
    ],
  },

  intro_viernes: {
    movimiento_principal: 'Box Squat',
    enfocuo_dia: 'Lower C + Upper — Técnica SBD ligero',
    descripcion: 'Sesión técnica. Todos los movimientos presentes, cargas bajas. Foco en patrones de movimiento.',
    ejercicios: [
      { ejercicio_nombre: 'Box Squat', tipo_ejercicio: 'COMPETITIVO', sets_programados: 3, reps_programadas: 5, rpe_programado: 6, peso_programado: 47, rest_minutos: 4, notas_tecnicas: 'Más ligero que el lunes. Foco exclusivo en técnica y postura.', orden: 1 },
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 3, reps_programadas: 5, rpe_programado: 6, peso_programado: 77, rest_minutos: 3, notas_tecnicas: 'Técnico. Siente el patrón de movimiento, no la fatiga.', orden: 2 },
      { ejercicio_nombre: 'Deadlift Sumo', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 3, rpe_programado: 6, peso_programado: 140, rest_minutos: 3, notas_tecnicas: 'Más ligero que el miércoles. Consolida la técnica del jalón.', orden: 3 },
      { ejercicio_nombre: 'Romanian Deadlift', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 8, rpe_programado: 6, peso_programado: 95, rest_minutos: 2, orden: 4 },
    ],
  },

  // ══════════════════════════════════════════════════════
  // BLOQUE HIPERTROFIA — 5 días
  // SQ: 4+3+4+3+3 = 17 sets/sem (MAV) ✓
  // BP: 5+4+4+4+3 = 20 sets/sem (MAV) ✓
  // DL: 5+3+3 = 11 sets/sem (MAV) ✓ (spread 3 días)
  // ══════════════════════════════════════════════════════

  hiper_lunes: {
    movimiento_principal: 'Box Squat',
    enfocuo_dia: 'Lower A — Box Squat pesado',
    descripcion: 'Box squat principal. Progresión en carga. Intentar reducir altura de caja si no hay dolor.',
    ejercicios: [
      { ejercicio_nombre: 'Box Squat', tipo_ejercicio: 'COMPETITIVO', sets_programados: 4, reps_programadas: 5, rpe_programado: 7, peso_programado: 80, rest_minutos: 4, notas_tecnicas: 'Bajar altura de caja si no hay dolor. Meta: llegar al paralelo en sem 9.', orden: 1 },
      { ejercicio_nombre: 'Romanian Deadlift', tipo_ejercicio: 'VARIANTE', sets_programados: 4, reps_programadas: 8, rpe_programado: 7, peso_programado: 110, rest_minutos: 3, orden: 2 },
      { ejercicio_nombre: 'Hack Squat', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 10, rpe_programado: 7, peso_programado: 60, rest_minutos: 2, notas_tecnicas: 'ROM controlado. Sin dolor en cuádricep.', orden: 3 },
      { ejercicio_nombre: 'Leg Curl', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 12, rpe_programado: 7, peso_programado: 35, rest_minutos: 2, orden: 4 },
    ],
  },

  hiper_martes: {
    movimiento_principal: 'Bench Press',
    enfocuo_dia: 'Upper A — Banca pesada',
    descripcion: 'Día de banca intensidad. Menos reps, más peso. Construye fuerza base en banca.',
    ejercicios: [
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 5, reps_programadas: 4, rpe_programado: 7.5, peso_programado: 90, rest_minutos: 3, notas_tecnicas: 'Pausa de 1s. Baja el peso 3 segundos.', orden: 1 },
      { ejercicio_nombre: 'Barbell Row', tipo_ejercicio: 'AUXILIAR', sets_programados: 4, reps_programadas: 6, rpe_programado: 7.5, peso_programado: 80, rest_minutos: 3, orden: 2 },
      { ejercicio_nombre: 'Incline Dumbbell Press', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 10, rpe_programado: 7, peso_programado: 30, rest_minutos: 2, orden: 3 },
      { ejercicio_nombre: 'Tricep Pushdown', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 12, rpe_programado: 7, peso_programado: 28, rest_minutos: 1, orden: 4 },
    ],
  },

  hiper_miercoles: {
    movimiento_principal: 'Deadlift Sumo',
    enfocuo_dia: 'Lower B — DL pesado + accesorios',
    descripcion: 'Jalón sumo como movimiento principal. Volumen en accesorios de cadena posterior.',
    ejercicios: [
      { ejercicio_nombre: 'Deadlift Sumo', tipo_ejercicio: 'COMPETITIVO', sets_programados: 5, reps_programadas: 4, rpe_programado: 7.5, peso_programado: 170, rest_minutos: 4, notas_tecnicas: 'Monitorear cuádricep. Bajar a 160 si hay molestia.', orden: 1 },
      { ejercicio_nombre: 'Box Squat', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 5, rpe_programado: 7, peso_programado: 75, rest_minutos: 3, notas_tecnicas: 'Segunda pasada de sentadilla. Técnica y volumen.', orden: 2 },
      { ejercicio_nombre: 'Back Extension / GHD', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 10, rpe_programado: 7, peso_programado: 25, rest_minutos: 2, orden: 3 },
      { ejercicio_nombre: 'Leg Curl', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 12, rpe_programado: 7, peso_programado: 37, rest_minutos: 2, orden: 4 },
    ],
  },

  hiper_jueves: {
    movimiento_principal: 'Bench Press',
    enfocuo_dia: 'Upper B — Banca volumen',
    descripcion: 'Segunda sesión de banca. Más volumen, algo más ligero que el martes.',
    ejercicios: [
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 4, reps_programadas: 6, rpe_programado: 7, peso_programado: 85, rest_minutos: 3, notas_tecnicas: 'Más reps que el martes. Acumulación de volumen.', orden: 1 },
      { ejercicio_nombre: 'Close Grip Bench Press', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 8, rpe_programado: 7, peso_programado: 72, rest_minutos: 2, notas_tecnicas: 'Refuerza el lock-out. Tríceps fuerte = banca fuerte.', orden: 2 },
      { ejercicio_nombre: 'Lat Pulldown', tipo_ejercicio: 'AUXILIAR', sets_programados: 4, reps_programadas: 10, rpe_programado: 7, peso_programado: 65, rest_minutos: 2, orden: 3 },
      { ejercicio_nombre: 'Face Pull', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 15, rpe_programado: 6.5, peso_programado: 20, rest_minutos: 1, notas_tecnicas: 'Salud manguito rotador.', orden: 4 },
    ],
  },

  hiper_viernes: {
    movimiento_principal: 'Box Squat',
    enfocuo_dia: 'Lower C — SQ técnico + DL ligero',
    descripcion: 'Sesión de menor intensidad. Consolida los patrones de movimiento de la semana.',
    ejercicios: [
      { ejercicio_nombre: 'Box Squat', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 5, rpe_programado: 7, peso_programado: 72, rest_minutos: 3, notas_tecnicas: 'Más ligero que el lunes. Foco en la postura en la caja.', orden: 1 },
      { ejercicio_nombre: 'Deadlift Sumo', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 4, rpe_programado: 7, peso_programado: 155, rest_minutos: 3, notas_tecnicas: 'Más ligero que el miércoles. Consolida técnica.', orden: 2 },
      { ejercicio_nombre: 'Leg Press', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 10, rpe_programado: 7, peso_programado: 90, rest_minutos: 2, notas_tecnicas: 'ROM controlado.', orden: 3 },
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 5, rpe_programado: 7, peso_programado: 80, rest_minutos: 2, notas_tecnicas: 'Técnico. Cierre de la semana.', orden: 4 },
    ],
  },

  // ══════════════════════════════════════════════════════
  // BLOQUE FUERZA BASE — 5 días
  // SQ: 5+3+4+3 = 15 sets/sem ✓
  // BP: 5+4+3+4 = 16 sets/sem ✓
  // DL: 5+3+3 = 11 sets/sem ✓
  // ══════════════════════════════════════════════════════

  fbase_lunes: {
    movimiento_principal: 'Squat',
    enfocuo_dia: 'SQ pesado — Fuerza Base',
    descripcion: 'Retorno a sentadilla libre si el cuádricep lo permite. Si no, box squat hasta profundidad máxima tolerable.',
    ejercicios: [
      { ejercicio_nombre: 'Squat', tipo_ejercicio: 'COMPETITIVO', sets_programados: 5, reps_programadas: 3, rpe_programado: 8, peso_programado: 130, rest_minutos: 5, notas_tecnicas: 'Sentadilla libre solo si hay profundidad controlable sin dolor. Sino continuar box squat.', orden: 1 },
      { ejercicio_nombre: 'Paused Box Squat', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 3, rpe_programado: 7.5, peso_programado: 105, rest_minutos: 4, notas_tecnicas: '2 segundos de pausa en la caja. Refuerza posición baja.', orden: 2 },
      { ejercicio_nombre: 'Romanian Deadlift', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 6, rpe_programado: 7.5, peso_programado: 120, rest_minutos: 3, orden: 3 },
      { ejercicio_nombre: 'Leg Curl', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 10, rpe_programado: 7, peso_programado: 40, rest_minutos: 2, orden: 4 },
    ],
  },

  fbase_martes: {
    movimiento_principal: 'Bench Press',
    enfocuo_dia: 'BP pesado — Fuerza Base',
    descripcion: 'Banca pesada. Progresión hacia marcas máximas.',
    ejercicios: [
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 5, reps_programadas: 3, rpe_programado: 8.5, peso_programado: 95, rest_minutos: 4, notas_tecnicas: 'Descenso 3 seg. Pausa reglamentaria al pecho.', orden: 1 },
      { ejercicio_nombre: 'Close Grip Bench Press', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 5, rpe_programado: 8, peso_programado: 80, rest_minutos: 3, orden: 2 },
      { ejercicio_nombre: 'Barbell Row', tipo_ejercicio: 'AUXILIAR', sets_programados: 4, reps_programadas: 6, rpe_programado: 8, peso_programado: 85, rest_minutos: 3, orden: 3 },
      { ejercicio_nombre: 'Tricep Extension', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 10, rpe_programado: 7, peso_programado: 35, rest_minutos: 2, orden: 4 },
    ],
  },

  fbase_miercoles: {
    movimiento_principal: 'Deadlift Sumo',
    enfocuo_dia: 'DL pesado — Fuerza Base',
    descripcion: 'Jalón sumo pesado. Progresión lineal +2.5–5kg/semana.',
    ejercicios: [
      { ejercicio_nombre: 'Deadlift Sumo', tipo_ejercicio: 'COMPETITIVO', sets_programados: 5, reps_programadas: 3, rpe_programado: 8.5, peso_programado: 185, rest_minutos: 5, notas_tecnicas: 'Progresión +2.5-5kg/sem si RPE lo permite.', orden: 1 },
      { ejercicio_nombre: 'Deficit Deadlift Sumo', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 3, rpe_programado: 8, peso_programado: 155, rest_minutos: 4, notas_tecnicas: 'Déficit 5cm. Mejora el jalón desde el piso.', orden: 2 },
      { ejercicio_nombre: 'Back Extension / GHD', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 10, rpe_programado: 7, peso_programado: 25, rest_minutos: 2, orden: 3 },
    ],
  },

  fbase_jueves: {
    movimiento_principal: 'Squat',
    enfocuo_dia: 'SQ moderado + BP moderado',
    descripcion: 'Segunda pasada de sentadilla y banca. Menos intensa que lunes/martes. Refuerza volumen semanal.',
    ejercicios: [
      { ejercicio_nombre: 'Squat', tipo_ejercicio: 'COMPETITIVO', sets_programados: 4, reps_programadas: 3, rpe_programado: 7.5, peso_programado: 115, rest_minutos: 4, notas_tecnicas: 'Más ligero que el lunes. Foco en técnica y profundidad.', orden: 1 },
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 4, reps_programadas: 4, rpe_programado: 7.5, peso_programado: 88, rest_minutos: 3, orden: 2 },
      { ejercicio_nombre: 'Lat Pulldown', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 10, rpe_programado: 7, peso_programado: 68, rest_minutos: 2, orden: 3 },
      { ejercicio_nombre: 'Face Pull', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 15, rpe_programado: 6.5, peso_programado: 22, rest_minutos: 1, orden: 4 },
    ],
  },

  fbase_viernes: {
    movimiento_principal: 'Squat',
    enfocuo_dia: 'SBD técnico — cierre de semana',
    descripcion: 'Los tres movimientos. Pesos técnicos. Cierra la semana con foco en los patrones competitivos.',
    ejercicios: [
      { ejercicio_nombre: 'Squat', tipo_ejercicio: 'COMPETITIVO', sets_programados: 3, reps_programadas: 3, rpe_programado: 7, peso_programado: 105, rest_minutos: 4, notas_tecnicas: 'Más ligero. Imprimir los patrones de la semana.', orden: 1 },
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 3, rpe_programado: 7, peso_programado: 83, rest_minutos: 3, orden: 2 },
      { ejercicio_nombre: 'Deadlift Sumo', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 3, rpe_programado: 7, peso_programado: 165, rest_minutos: 3, notas_tecnicas: 'Técnico. Más ligero que el miércoles.', orden: 3 },
      { ejercicio_nombre: 'Romanian Deadlift', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 6, rpe_programado: 7, peso_programado: 115, rest_minutos: 2, orden: 4 },
    ],
  },

  // ══════════════════════════════════════════════════════
  // BLOQUE PEAKING — 5 días
  // 2 días muy pesados + 1 DL pesado + 2 técnicos/ligeros
  // SQ: 4+3+3+2 = 12 sets/sem ✓
  // BP: 4+3+4+2 = 13 sets/sem ✓
  // DL: 4+3+2 = 9 sets/sem ✓
  // ══════════════════════════════════════════════════════

  peak_lunes: {
    movimiento_principal: 'Squat',
    enfocuo_dia: 'SQ+BP pesado — Peaking',
    descripcion: 'Alta intensidad. Squat a full profundidad. Singles y dobles submáximos.',
    ejercicios: [
      { ejercicio_nombre: 'Squat', tipo_ejercicio: 'COMPETITIVO', sets_programados: 4, reps_programadas: 2, rpe_programado: 9, peso_programado: 160, rest_minutos: 6, notas_tecnicas: 'Full profundidad. Cinto si corresponde. Sigue comandos de juez.', orden: 1 },
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 4, reps_programadas: 2, rpe_programado: 9, peso_programado: 100, rest_minutos: 5, notas_tecnicas: 'Pausa reglamentaria. Siente el peso.', orden: 2 },
      { ejercicio_nombre: 'Romanian Deadlift', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 5, rpe_programado: 7.5, peso_programado: 120, rest_minutos: 3, orden: 3 },
    ],
  },

  peak_martes: {
    movimiento_principal: 'Bench Press',
    enfocuo_dia: 'Upper accesorios — recuperación activa',
    descripcion: 'Día de recuperación activa. Sin movimientos pesados de piernas. Banca moderada + accesorios.',
    ejercicios: [
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 3, rpe_programado: 7.5, peso_programado: 88, rest_minutos: 3, notas_tecnicas: 'Técnico. No forzar en este día.', orden: 1 },
      { ejercicio_nombre: 'Barbell Row', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 6, rpe_programado: 7, peso_programado: 80, rest_minutos: 3, orden: 2 },
      { ejercicio_nombre: 'Tricep Pushdown', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 12, rpe_programado: 7, peso_programado: 30, rest_minutos: 2, orden: 3 },
      { ejercicio_nombre: 'Face Pull', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 15, rpe_programado: 6.5, peso_programado: 22, rest_minutos: 1, notas_tecnicas: 'Mantener salud del hombro en el pico.', orden: 4 },
    ],
  },

  peak_miercoles: {
    movimiento_principal: 'Deadlift Sumo',
    enfocuo_dia: 'DL pesado — Peaking',
    descripcion: 'Jalón sumo a máxima intensidad. Singles submáximos en semanas 18-19.',
    ejercicios: [
      { ejercicio_nombre: 'Deadlift Sumo', tipo_ejercicio: 'COMPETITIVO', sets_programados: 4, reps_programadas: 2, rpe_programado: 9, peso_programado: 200, rest_minutos: 6, notas_tecnicas: 'Llegar a singles @9 en sem 18-19. Sentir el jalón limpio.', orden: 1 },
      { ejercicio_nombre: 'Squat', tipo_ejercicio: 'VARIANTE', sets_programados: 3, reps_programadas: 2, rpe_programado: 8, peso_programado: 145, rest_minutos: 4, notas_tecnicas: 'Segunda pasada de squat. Más ligero que el lunes.', orden: 2 },
      { ejercicio_nombre: 'Back Extension / GHD', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 3, reps_programadas: 8, rpe_programado: 7, peso_programado: 30, rest_minutos: 2, orden: 3 },
    ],
  },

  peak_jueves: {
    movimiento_principal: 'Squat',
    enfocuo_dia: 'SQ+BP técnico — 85%',
    descripcion: 'Sesión técnica al 85% aproximado. Consolida patrones antes del simulacro del viernes.',
    ejercicios: [
      { ejercicio_nombre: 'Squat', tipo_ejercicio: 'COMPETITIVO', sets_programados: 3, reps_programadas: 2, rpe_programado: 8, peso_programado: 148, rest_minutos: 5, notas_tecnicas: 'Técnico. No llegar al límite. Preparar el CNS para el viernes.', orden: 1 },
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 4, reps_programadas: 2, rpe_programado: 8, peso_programado: 92, rest_minutos: 4, notas_tecnicas: 'Pausa reglamentaria. Técnico.', orden: 2 },
      { ejercicio_nombre: 'Lat Pulldown', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 10, rpe_programado: 7, peso_programado: 68, rest_minutos: 2, orden: 3 },
    ],
  },

  peak_viernes: {
    movimiento_principal: 'Squat',
    enfocuo_dia: 'SBD — Simulacro de competencia',
    descripcion: 'Simular meet completo. 1-2 intentos por levantamiento al RPE competitivo. Con equipamiento de competencia.',
    ejercicios: [
      { ejercicio_nombre: 'Squat', tipo_ejercicio: 'COMPETITIVO', sets_programados: 2, reps_programadas: 1, rpe_programado: 9, peso_programado: 165, rest_minutos: 8, notas_tecnicas: 'Con cinto, vendas, ropa de competencia. Comandos de juez.', orden: 1 },
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 2, reps_programadas: 1, rpe_programado: 9, peso_programado: 102, rest_minutos: 6, notas_tecnicas: 'Pausa reglamentaria. Simular comandos.', orden: 2 },
      { ejercicio_nombre: 'Deadlift Sumo', tipo_ejercicio: 'COMPETITIVO', sets_programados: 2, reps_programadas: 1, rpe_programado: 9, peso_programado: 205, rest_minutos: 8, notas_tecnicas: 'Jalón limpio con todo el equipamiento.', orden: 3 },
    ],
  },

  // ══════════════════════════════════════════════════════
  // BLOQUE TAPERING — 5 días
  // Lunes/Miércoles/Jueves: pesados reducidos
  // Martes: upper accesorios muy ligero
  // Viernes: openers confirmados
  // ══════════════════════════════════════════════════════

  taper_lunes: {
    movimiento_principal: 'Squat',
    enfocuo_dia: 'SQ+BP — Tapering pesado',
    descripcion: 'Mantener intensidad. Reducir sets a la mitad del peaking. CNS fresco es la prioridad.',
    ejercicios: [
      { ejercicio_nombre: 'Squat', tipo_ejercicio: 'COMPETITIVO', sets_programados: 3, reps_programadas: 2, rpe_programado: 8, peso_programado: 162, rest_minutos: 6, notas_tecnicas: 'Reducir sets, NO el peso. Sentir el levantamiento limpio.', orden: 1 },
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 3, reps_programadas: 2, rpe_programado: 8, peso_programado: 100, rest_minutos: 5, notas_tecnicas: 'Pausa reglamentaria. Confianza.', orden: 2 },
    ],
  },

  taper_martes: {
    movimiento_principal: 'Bench Press',
    enfocuo_dia: 'Upper ligero — recuperación activa',
    descripcion: 'Accesorios de tren superior muy ligeros. Mantener el flujo sin acumular fatiga.',
    ejercicios: [
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'VARIANTE', sets_programados: 2, reps_programadas: 3, rpe_programado: 7, peso_programado: 82, rest_minutos: 3, notas_tecnicas: 'Muy ligero. Solo para mantener el patrón activo.', orden: 1 },
      { ejercicio_nombre: 'Barbell Row', tipo_ejercicio: 'AUXILIAR', sets_programados: 3, reps_programadas: 8, rpe_programado: 7, peso_programado: 70, rest_minutos: 2, orden: 2 },
      { ejercicio_nombre: 'Tricep Pushdown', tipo_ejercicio: 'COMPENSATORIO', sets_programados: 2, reps_programadas: 12, rpe_programado: 6.5, peso_programado: 25, rest_minutos: 1, orden: 3 },
    ],
  },

  taper_miercoles: {
    movimiento_principal: 'Deadlift Sumo',
    enfocuo_dia: 'DL — Tapering',
    descripcion: 'Jalón sumo reducido. Intensidad mantenida, volumen cortado.',
    ejercicios: [
      { ejercicio_nombre: 'Deadlift Sumo', tipo_ejercicio: 'COMPETITIVO', sets_programados: 3, reps_programadas: 2, rpe_programado: 8, peso_programado: 195, rest_minutos: 6, notas_tecnicas: 'Mantiene la intensidad. Reduce el volumen.', orden: 1 },
      { ejercicio_nombre: 'Romanian Deadlift', tipo_ejercicio: 'AUXILIAR', sets_programados: 2, reps_programadas: 5, rpe_programado: 7, peso_programado: 110, rest_minutos: 3, orden: 2 },
    ],
  },

  taper_jueves: {
    movimiento_principal: 'Squat',
    enfocuo_dia: 'SQ+BP — Práctica de aperturas',
    descripcion: 'Pesos de apertura. Deben sentirse livianos. Confirmar que los abreidores están bien elegidos.',
    ejercicios: [
      { ejercicio_nombre: 'Squat', tipo_ejercicio: 'COMPETITIVO', sets_programados: 2, reps_programadas: 1, rpe_programado: 8, peso_programado: 152, rest_minutos: 6, notas_tecnicas: 'Opener SQ. Debe sentirse a un RPE 8 máximo. Ajustar si es más difícil.', orden: 1 },
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 2, reps_programadas: 1, rpe_programado: 8, peso_programado: 93, rest_minutos: 5, notas_tecnicas: 'Opener BP.', orden: 2 },
      { ejercicio_nombre: 'Deadlift Sumo', tipo_ejercicio: 'COMPETITIVO', sets_programados: 2, reps_programadas: 1, rpe_programado: 8, peso_programado: 185, rest_minutos: 6, notas_tecnicas: 'Opener DL.', orden: 3 },
    ],
  },

  taper_viernes: {
    movimiento_principal: 'Squat',
    enfocuo_dia: 'SBD — Confirmación final de aperturas',
    descripcion: 'Última sesión antes de la semana de competencia. Confirmar aperturas. Todo debe sentirse cómodo.',
    ejercicios: [
      { ejercicio_nombre: 'Squat', tipo_ejercicio: 'COMPETITIVO', sets_programados: 2, reps_programadas: 1, rpe_programado: 8, peso_programado: 155, rest_minutos: 8, notas_tecnicas: 'Opener confirmado. RPE 8 máximo. Con todo el equipamiento.', orden: 1 },
      { ejercicio_nombre: 'Bench Press', tipo_ejercicio: 'COMPETITIVO', sets_programados: 2, reps_programadas: 1, rpe_programado: 8, peso_programado: 95, rest_minutos: 6, notas_tecnicas: 'Opener BP confirmado.', orden: 2 },
      { ejercicio_nombre: 'Deadlift Sumo', tipo_ejercicio: 'COMPETITIVO', sets_programados: 2, reps_programadas: 1, rpe_programado: 8, peso_programado: 188, rest_minutos: 8, notas_tecnicas: 'Opener DL confirmado.', orden: 3 },
    ],
  },
};

// ─── BLOQUES ───────────────────────────────────────────────────────────────────

const BLOQUES = [
  {
    numero_bloque: 1,
    nombre: 'Bloque 0 — Introducción / Rehabilitación',
    semana_inicio: 1, semana_fin: 4,
    enfasis: 'Rehabilitación y Tolerancia',
    intensidad_rpe_min: 6, intensidad_rpe_max: 6.5,
    volumen_reps_min: 4, volumen_reps_max: 10,
    semanas: [1, 2, 3, 4].map(s => ({
      semana: s,
      dias: [
        { dia: 'lunes',    tpl: 'intro_lunes' },
        { dia: 'martes',   tpl: 'intro_martes' },
        { dia: 'miercoles', tpl: 'intro_miercoles' },
        { dia: 'jueves',   tpl: 'intro_jueves' },
        { dia: 'viernes',  tpl: 'intro_viernes' },
      ],
    })),
  },
  {
    numero_bloque: 2,
    nombre: 'Bloque 1 — Hipertrofia',
    semana_inicio: 5, semana_fin: 9,
    enfasis: 'Hipertrofia',
    intensidad_rpe_min: 6.5, intensidad_rpe_max: 7.5,
    volumen_reps_min: 4, volumen_reps_max: 10,
    semanas: [5, 6, 7, 8, 9].map(s => ({
      semana: s,
      dias: [
        { dia: 'lunes',    tpl: 'hiper_lunes' },
        { dia: 'martes',   tpl: 'hiper_martes' },
        { dia: 'miercoles', tpl: 'hiper_miercoles' },
        { dia: 'jueves',   tpl: 'hiper_jueves' },
        { dia: 'viernes',  tpl: 'hiper_viernes' },
      ],
    })),
  },
  {
    numero_bloque: 3,
    nombre: 'Bloque 2 — Fuerza Base',
    semana_inicio: 10, semana_fin: 14,
    enfasis: 'Fuerza Base',
    intensidad_rpe_min: 7.5, intensidad_rpe_max: 8.5,
    volumen_reps_min: 2, volumen_reps_max: 6,
    semanas: [10, 11, 12, 13, 14].map(s => ({
      semana: s,
      dias: [
        { dia: 'lunes',    tpl: 'fbase_lunes' },
        { dia: 'martes',   tpl: 'fbase_martes' },
        { dia: 'miercoles', tpl: 'fbase_miercoles' },
        { dia: 'jueves',   tpl: 'fbase_jueves' },
        { dia: 'viernes',  tpl: 'fbase_viernes' },
      ],
    })),
  },
  {
    numero_bloque: 4,
    nombre: 'Bloque 3 — Peaking',
    semana_inicio: 15, semana_fin: 19,
    enfasis: 'Peaking',
    intensidad_rpe_min: 8, intensidad_rpe_max: 9.5,
    volumen_reps_min: 1, volumen_reps_max: 3,
    semanas: [15, 16, 17, 18, 19].map(s => ({
      semana: s,
      dias: [
        { dia: 'lunes',    tpl: 'peak_lunes' },
        { dia: 'martes',   tpl: 'peak_martes' },
        { dia: 'miercoles', tpl: 'peak_miercoles' },
        { dia: 'jueves',   tpl: 'peak_jueves' },
        { dia: 'viernes',  tpl: 'peak_viernes' },
      ],
    })),
  },
  {
    numero_bloque: 5,
    nombre: 'Bloque 4 — Tapering',
    semana_inicio: 20, semana_fin: 23,
    enfasis: 'Tapering',
    intensidad_rpe_min: 7, intensidad_rpe_max: 8.5,
    volumen_reps_min: 1, volumen_reps_max: 2,
    semanas: [20, 21, 22, 23].map(s => ({
      semana: s,
      dias: [
        { dia: 'lunes',    tpl: 'taper_lunes' },
        { dia: 'martes',   tpl: 'taper_martes' },
        { dia: 'miercoles', tpl: 'taper_miercoles' },
        { dia: 'jueves',   tpl: 'taper_jueves' },
        { dia: 'viernes',  tpl: 'taper_viernes' },
      ],
    })),
  },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏋️  Creando periodización 5 días/semana — Paul Bustamante Solis...\n');

  const peri = await post('/api/periodizaciones', {
    nombre: 'Preparación Campeonato Nov 9 — Paul Bustamante',
    tipo: 'LINEAL',
    athlete_id: PAUL_ID,
    fecha_inicio: '2026-05-26',
    fecha_fin: '2026-11-09',
    duracion_semanas: 23,
    objetivo: 'Preparación para competencia con gestión de lesión cuádriceps derecho. 5 días/semana. Progresión desde rehabilitación hasta peaking y tapering.',
    descripcion: 'Lineal 23 semanas. Bloque 0 rehab (sem 1-4): box squat, upper libre. Hipertrofia (sem 5-9): retorno a profundidad. Fuerza Base (sem 10-14): intensidad creciente. Peaking (sem 15-19): singles submáximos y simulacros. Tapering (sem 20-23): confirmación de aperturas. Competencia: Nov 9.',
  });
  console.log(`✅ Periodización: ${peri.id}\n`);

  let totalSesiones = 0;
  let totalEjercicios = 0;

  for (const bloqueConfig of BLOQUES) {
    const { semanas, ...bloqueData } = bloqueConfig;
    const bloque = await post('/api/bloques', { periodizacion_id: peri.id, ...bloqueData });
    console.log(`📦 ${bloque.nombre} (${bloqueData.semanas?.length ?? semanas.length} sem × 5 días)`);

    for (const semanaConfig of semanas) {
      for (const diaConfig of semanaConfig.dias) {
        const tpl = S[diaConfig.tpl];
        const sesion = await post('/api/sesiones', {
          bloque_id: bloque.id,
          numero_semana: semanaConfig.semana,
          dia_semana: diaConfig.dia,
          movimiento_principal: tpl.movimiento_principal,
          enfocuo_dia: tpl.enfocuo_dia,
          descripcion: tpl.descripcion,
          orden_secuencia: semanaConfig.semana * 10 + semanaConfig.dias.indexOf(diaConfig),
        });
        totalSesiones++;
        for (const ej of tpl.ejercicios) {
          await post('/api/ejercicios-sesion', { sesion_id: sesion.id, ...ej });
          totalEjercicios++;
          process.stdout.write('.');
        }
      }
      process.stdout.write(` sem${semanaConfig.semana}\n`);
    }
    console.log();
  }

  console.log(`✅ Listo.`);
  console.log(`   Sesiones   : ${totalSesiones}`);
  console.log(`   Ejercicios : ${totalEjercicios}`);
  console.log(`\n🏆 Periodización 5 días lista para Paul.`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
