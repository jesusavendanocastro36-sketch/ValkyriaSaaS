// Paul Bustamante — Periodización v3
// 5 días/semana · Progresión semana a semana · BP expandido · Todos los grupos musculares

const BASE = process.env.SEED_BASE_URL ?? 'https://valkyria-saas.vercel.app';
// Token de admin tomado del entorno — NUNCA hardcodear en un repo público.
// Uso: ADMIN_TOKEN="<jwt>" node scripts/seed-paul-v3.mjs
const TOKEN = process.env.ADMIN_TOKEN;
if (!TOKEN) { console.error('Falta ADMIN_TOKEN en el entorno.'); process.exit(1); }
const PAUL_ID = 'cmpkm6dya000104jo5wqdzlxo';
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

function clean(o) { return Object.fromEntries(Object.entries(o).filter(([,v]) => v !== null && v !== undefined)); }
async function post(path, body) {
  const r = await fetch(`${BASE}${path}`, { method: 'POST', headers: H, body: JSON.stringify(clean(body)) });
  const d = await r.json();
  if (!r.ok) throw new Error(`POST ${path} → ${r.status}: ${JSON.stringify(d)}`);
  return d;
}

// s(base, mult) → sets redondeado, mínimo 1
function s(base, mult) { return Math.max(1, Math.round(base * mult)); }
// rpe(base, inc) → clampeado [6, 9.5]
function rp(base, inc) { return Math.min(9.5, Math.max(6.0, +(base + inc).toFixed(1))); }

// ─── MULTIPLICADORES DE SERIES POR BLOQUE ────────────────────────────────────
// Cada array: [sem1, sem2, sem3, (sem4), (sem5)] dentro del bloque
// Última semana es siempre deload (~0.60)
const MULT = {
  intro: [0.75, 0.875, 1.0,  0.60],              // 4 semanas
  hiper: [0.80, 0.90,  1.0,  1.15, 0.60],        // 5 semanas
  fbase: [0.85, 0.95,  1.0,  1.10, 0.65],        // 5 semanas
  peak:  [0.90, 1.00,  1.00, 1.05, 0.70],        // 5 semanas
  taper: [0.60, 0.45,  0.35, 0.25],              // 4 semanas (todo es deload progresivo)
};

// ─── INCREMENTOS RPE POR SEMANA DENTRO DEL BLOQUE ────────────────────────────
const RPE_INC = {
  intro: [0,    0,    0.5,  0],
  hiper: [0,    0.25, 0.5,  0.75, -0.5],
  fbase: [0,    0.25, 0.5,  0.75, -0.5],
  peak:  [0,    0.5,  0.75, 1.0,  -1.0],
  taper: [0,   -0.25,-0.5, -0.5],
};

// ─── PLANTILLAS BASE (por bloque × día) ───────────────────────────────────────
// Campos: n=nombre, t=tipo, bs=baseSets, r=reps, rpe=RPEbase, kg=peso, rest=minutos, nota
// Si bs*mult < 0.5 → se omite el ejercicio esa semana

const T = {

  // ══════════════════════════════════════════════════════════════════════════
  // INTRO (sem 1-4)  RPE base: 6-6.5  Objetivo: tolerancia, rehab cuád
  // ══════════════════════════════════════════════════════════════════════════

  intro_lunes: {   // Lower A - Box Squat + rehab
    mp: 'Box Squat', foco: 'Lower A — Box Squat + rehab cuádricep',
    desc: 'Caja por encima del paralelo. Sin dolor = criterio absoluto. Unilateral, core y aductores para la rehab.',
    ejs: [
      { n:'Box Squat',             t:'COMPETITIVO',  bs:4, r:5,  rpe:6.0, kg:50,  rest:4, nota:'Caja por encima del paralelo. Reportar dolor 0–10 al terminar.' },
      { n:'Romanian Deadlift',     t:'VARIANTE',     bs:4, r:8,  rpe:6.0, kg:100, rest:3 },
      { n:'Bulgarian Split Squat', t:'AUXILIAR',     bs:3, r:8,  rpe:6.0,         rest:2, nota:'Bodyweight las primeras 2 semanas. Igualar fuerza entre piernas.' },
      { n:'Leg Press',             t:'AUXILIAR',     bs:3, r:10, rpe:6.0, kg:80,  rest:2, nota:'ROM hasta 90°. Sin dolor en cuádricep.' },
      { n:'Leg Curl',              t:'COMPENSATORIO', bs:3, r:12, rpe:6.0, kg:30,  rest:2 },
      { n:'Copenhagen Plank',      t:'COMPENSATORIO', bs:3, r:8,  rpe:6.0,         rest:1, nota:'Aductores. Imprescindible para el jalón sumo.' },
      { n:'Band Abduction',        t:'COMPENSATORIO', bs:3, r:15, rpe:6.0,         rest:1, nota:'Glúteo medio. Controla el valgo en la sentadilla.' },
      { n:'Ab Wheel',              t:'COMPENSATORIO', bs:3, r:8,  rpe:6.0,         rest:2, nota:'Core. Fundamental para transferencia de fuerza en todos los levantamientos.' },
    ],
  },

  intro_martes: {  // Upper A - BP heavy
    mp: 'Bench Press', foco: 'Upper A — Banca pesada + volumen',
    desc: 'Tren superior sin restricciones. Máxima explotación de banca dado que no hay lesión en tren superior.',
    ejs: [
      { n:'Bench Press',           t:'COMPETITIVO',  bs:5, r:5,  rpe:6.5, kg:82,  rest:3, nota:'Pausa 1s en pecho. Bajada 3 segundos controlada.' },
      { n:'Close Grip Bench Press',t:'VARIANTE',     bs:3, r:8,  rpe:6.0, kg:65,  rest:3, nota:'Refuerza el lock-out. Tríceps como punto débil.' },
      { n:'Paused Bench Press',    t:'VARIANTE',     bs:2, r:5,  rpe:6.0, kg:70,  rest:3, nota:'2s de pausa en el pecho. Aparece desde sem 2.' },
      { n:'Barbell Row',           t:'AUXILIAR',     bs:4, r:8,  rpe:6.5, kg:72,  rest:3 },
      { n:'Incline Dumbbell Press',t:'AUXILIAR',     bs:3, r:10, rpe:6.0, kg:28,  rest:2 },
      { n:'Overhead Press',        t:'AUXILIAR',     bs:3, r:8,  rpe:6.0, kg:50,  rest:2 },
      { n:'Tricep Pushdown',       t:'COMPENSATORIO', bs:3, r:12, rpe:6.0, kg:25,  rest:1 },
      { n:'Band External Rotation',t:'COMPENSATORIO', bs:3, r:15, rpe:6.0,         rest:1, nota:'Manguito rotador. Salud del hombro a largo plazo.' },
      { n:'Face Pull',             t:'COMPENSATORIO', bs:3, r:15, rpe:6.0, kg:20,  rest:1 },
    ],
  },

  intro_miercoles: {  // Lower B - DL + BoxSQ ligero
    mp: 'Deadlift Sumo', foco: 'Lower B — DL + Box Squat técnico',
    desc: 'Jalón sumo principal. Monitorear cuádricep en el jalón. Box squat ligero segunda pasada.',
    ejs: [
      { n:'Deadlift Sumo',         t:'COMPETITIVO',  bs:4, r:4,  rpe:6.5, kg:160, rest:4, nota:'Monitorear cuádricep derecho. Reportar molestia 0-10.' },
      { n:'Box Squat',             t:'VARIANTE',     bs:3, r:5,  rpe:6.0, kg:45,  rest:3, nota:'Segunda pasada. Técnico, no intenso.' },
      { n:'Romanian Deadlift',     t:'AUXILIAR',     bs:3, r:6,  rpe:6.0, kg:90,  rest:3 },
      { n:'Bulgarian Split Squat', t:'AUXILIAR',     bs:3, r:8,  rpe:6.0,         rest:2, nota:'Bodyweight. Segunda sesión unilateral de la semana.' },
      { n:'Back Extension / GHD',  t:'COMPENSATORIO', bs:3, r:10, rpe:6.0, kg:20,  rest:2 },
      { n:'Leg Curl',              t:'COMPENSATORIO', bs:3, r:12, rpe:6.0, kg:30,  rest:2 },
      { n:'Copenhagen Plank',      t:'COMPENSATORIO', bs:3, r:8,  rpe:6.0,         rest:1, nota:'Segunda sesión de aductores.' },
      { n:'Ab Wheel',              t:'COMPENSATORIO', bs:3, r:8,  rpe:6.0,         rest:2 },
    ],
  },

  intro_jueves: {  // Upper B - BP volumen
    mp: 'Bench Press', foco: 'Upper B — Banca volumen + aislamiento',
    desc: 'Segunda sesión de banca. Más reps, algo menos de peso. Pectoral y tríceps en volumen.',
    ejs: [
      { n:'Bench Press',           t:'COMPETITIVO',  bs:5, r:8,  rpe:6.5, kg:75,  rest:3, nota:'Más reps que el martes. Construcción de volumen.' },
      { n:'Close Grip Bench Press',t:'VARIANTE',     bs:3, r:8,  rpe:6.0, kg:63,  rest:3 },
      { n:'Pec Deck / Chest Fly',  t:'AUXILIAR',     bs:4, r:12, rpe:6.0, kg:40,  rest:2, nota:'Aislamiento pectoral. Refuerza el volumen de banca.' },
      { n:'Lat Pulldown',          t:'AUXILIAR',     bs:4, r:10, rpe:6.0, kg:62,  rest:2 },
      { n:'Tricep Extension',      t:'COMPENSATORIO', bs:3, r:12, rpe:6.0, kg:30,  rest:1 },
      { n:'Band External Rotation',t:'COMPENSATORIO', bs:3, r:15, rpe:6.0,         rest:1 },
      { n:'Glute Bridge / Hip Thrust',t:'COMPENSATORIO',bs:3,r:12, rpe:6.0, kg:40, rest:2, nota:'Glúteo. Refuerza el drive de cadera en sentadilla y jalón.' },
    ],
  },

  intro_viernes: {  // Lower C + BP técnico
    mp: 'Box Squat', foco: 'Lower C + BP — SBD técnico',
    desc: 'Sesión técnica de cierre. Todos los movimientos, cargas bajas. Foco en patrones de movimiento.',
    ejs: [
      { n:'Box Squat',             t:'COMPETITIVO',  bs:3, r:5,  rpe:6.0, kg:47,  rest:4, nota:'Más ligero que el lunes. Solo técnica.' },
      { n:'Bench Press',           t:'COMPETITIVO',  bs:3, r:5,  rpe:6.0, kg:77,  rest:3, nota:'Técnico. Consolida el patrón de la semana.' },
      { n:'Deadlift Sumo',         t:'VARIANTE',     bs:3, r:3,  rpe:6.0, kg:140, rest:3, nota:'Más ligero que el miércoles. Consolida técnica del jalón.' },
      { n:'Incline Dumbbell Press',t:'AUXILIAR',     bs:3, r:10, rpe:6.0, kg:26,  rest:2 },
      { n:'Glute Bridge / Hip Thrust',t:'COMPENSATORIO',bs:3,r:12,rpe:6.0,kg:40,  rest:2 },
      { n:'Hollow Body Hold',      t:'COMPENSATORIO', bs:3, r:20, rpe:6.0,         rest:1, nota:'20 segundos por serie. Core anti-extensión.' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HIPERTROFIA (sem 5-9)  RPE base: 7-7.5  Volumen máximo del ciclo
  // BP objetivo: 20-24 sets/sem en pico (sem 8)
  // ══════════════════════════════════════════════════════════════════════════

  hiper_lunes: {
    mp: 'Box Squat', foco: 'Lower A — Box Squat progresivo',
    desc: 'Progresión de box squat. Reducir altura de caja si no hay dolor. Meta: paralelo en sem 9.',
    ejs: [
      { n:'Box Squat',             t:'COMPETITIVO',  bs:4, r:5,  rpe:7.0, kg:82,  rest:4, nota:'Reducir altura de caja 2-3cm si no hay dolor. Progresar.' },
      { n:'Romanian Deadlift',     t:'VARIANTE',     bs:4, r:8,  rpe:7.0, kg:112, rest:3 },
      { n:'Bulgarian Split Squat', t:'AUXILIAR',     bs:3, r:8,  rpe:7.0, kg:10,  rest:2, nota:'Añadir mancuerna ligera desde sem 6. Progresión carga.' },
      { n:'Hack Squat',            t:'AUXILIAR',     bs:3, r:10, rpe:7.0, kg:60,  rest:2, nota:'ROM controlado. Sin dolor.' },
      { n:'Leg Curl',              t:'COMPENSATORIO', bs:3, r:12, rpe:7.0, kg:35,  rest:2 },
      { n:'Copenhagen Plank',      t:'COMPENSATORIO', bs:3, r:10, rpe:7.0,         rest:1 },
      { n:'Band Abduction',        t:'COMPENSATORIO', bs:3, r:15, rpe:7.0,         rest:1 },
      { n:'Ab Wheel',              t:'COMPENSATORIO', bs:3, r:10, rpe:7.0,         rest:2 },
    ],
  },

  hiper_martes: {
    mp: 'Bench Press', foco: 'Upper A — Banca pesada hipertrofia',
    desc: 'Intensidad en banca. Menos reps, más peso. Variantes para maximizar estímulo.',
    ejs: [
      { n:'Bench Press',           t:'COMPETITIVO',  bs:5, r:4,  rpe:7.5, kg:90,  rest:3, nota:'Pausa 1s. Bajada 3 seg.' },
      { n:'Paused Bench Press',    t:'VARIANTE',     bs:3, r:4,  rpe:7.0, kg:80,  rest:3, nota:'2s de pausa. Desarrolla fuerza fuera del pecho.' },
      { n:'Close Grip Bench Press',t:'VARIANTE',     bs:3, r:8,  rpe:7.0, kg:72,  rest:3 },
      { n:'Barbell Row',           t:'AUXILIAR',     bs:4, r:6,  rpe:7.5, kg:80,  rest:3 },
      { n:'Incline Dumbbell Press',t:'AUXILIAR',     bs:3, r:10, rpe:7.0, kg:32,  rest:2 },
      { n:'Overhead Press',        t:'AUXILIAR',     bs:3, r:8,  rpe:7.0, kg:55,  rest:2 },
      { n:'Tricep Pushdown',       t:'COMPENSATORIO', bs:3, r:12, rpe:7.0, kg:28,  rest:1 },
      { n:'Band External Rotation',t:'COMPENSATORIO', bs:3, r:15, rpe:6.5,         rest:1 },
      { n:'Face Pull',             t:'COMPENSATORIO', bs:3, r:15, rpe:6.5, kg:22,  rest:1 },
    ],
  },

  hiper_miercoles: {
    mp: 'Deadlift Sumo', foco: 'Lower B — DL volumen',
    desc: 'Jalón sumo principal con más volumen. Segunda pasada de sentadilla técnica.',
    ejs: [
      { n:'Deadlift Sumo',         t:'COMPETITIVO',  bs:5, r:4,  rpe:7.5, kg:172, rest:4, nota:'Monitorear cuádricep. Reportar cualquier molestia.' },
      { n:'Box Squat',             t:'VARIANTE',     bs:3, r:5,  rpe:7.0, kg:75,  rest:3, nota:'Segunda pasada. Técnica y volumen.' },
      { n:'Romanian Deadlift',     t:'AUXILIAR',     bs:3, r:6,  rpe:7.0, kg:110, rest:3 },
      { n:'Bulgarian Split Squat', t:'AUXILIAR',     bs:3, r:8,  rpe:7.0, kg:10,  rest:2 },
      { n:'Back Extension / GHD',  t:'COMPENSATORIO', bs:3, r:10, rpe:7.0, kg:25,  rest:2 },
      { n:'Leg Curl',              t:'COMPENSATORIO', bs:3, r:12, rpe:7.0, kg:37,  rest:2 },
      { n:'Copenhagen Plank',      t:'COMPENSATORIO', bs:3, r:10, rpe:7.0,         rest:1 },
      { n:'Ab Wheel',              t:'COMPENSATORIO', bs:3, r:10, rpe:7.0,         rest:2 },
    ],
  },

  hiper_jueves: {
    mp: 'Bench Press', foco: 'Upper B — Banca volumen máximo',
    desc: 'Segunda sesión de banca. Más volumen, más variantes. Día de mayor acumulación de BP.',
    ejs: [
      { n:'Bench Press',           t:'COMPETITIVO',  bs:5, r:6,  rpe:7.0, kg:85,  rest:3, nota:'Más reps que el martes. Acumulación.' },
      { n:'Close Grip Bench Press',t:'VARIANTE',     bs:4, r:8,  rpe:7.0, kg:72,  rest:3 },
      { n:'Spoto Press',           t:'VARIANTE',     bs:3, r:5,  rpe:7.0, kg:75,  rest:3, nota:'Pausa a 5cm del pecho. Desarrolla fuerza fuera del pecho sin stress en pectoral.' },
      { n:'Pec Deck / Chest Fly',  t:'AUXILIAR',     bs:4, r:12, rpe:7.0, kg:42,  rest:2 },
      { n:'Lat Pulldown',          t:'AUXILIAR',     bs:4, r:10, rpe:7.0, kg:65,  rest:2 },
      { n:'Tricep Extension',      t:'COMPENSATORIO', bs:3, r:12, rpe:7.0, kg:32,  rest:1 },
      { n:'Band External Rotation',t:'COMPENSATORIO', bs:3, r:15, rpe:6.5,         rest:1 },
      { n:'Glute Bridge / Hip Thrust',t:'COMPENSATORIO',bs:3,r:12,rpe:7.0,kg:60,  rest:2 },
    ],
  },

  hiper_viernes: {
    mp: 'Box Squat', foco: 'Lower C + BP — Volumen técnico',
    desc: 'Sesión técnica pero con más volumen que el intro. Todos los patrones presentes.',
    ejs: [
      { n:'Box Squat',             t:'VARIANTE',     bs:3, r:5,  rpe:7.0, kg:73,  rest:3, nota:'Más ligero que el lunes. Foco en postura.' },
      { n:'Bench Press',           t:'VARIANTE',     bs:3, r:5,  rpe:7.0, kg:82,  rest:3 },
      { n:'Deadlift Sumo',         t:'VARIANTE',     bs:3, r:4,  rpe:7.0, kg:158, rest:3, nota:'Más ligero que el miércoles. Técnica.' },
      { n:'Incline Dumbbell Press',t:'AUXILIAR',     bs:3, r:10, rpe:7.0, kg:30,  rest:2 },
      { n:'Glute Bridge / Hip Thrust',t:'COMPENSATORIO',bs:3,r:12,rpe:7.0,kg:60, rest:2 },
      { n:'Hollow Body Hold',      t:'COMPENSATORIO', bs:3, r:20, rpe:6.5,         rest:1, nota:'20 segundos por serie.' },
      { n:'Band Abduction',        t:'COMPENSATORIO', bs:3, r:15, rpe:6.5,         rest:1 },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FUERZA BASE (sem 10-14)  RPE base: 7.5-8.5  Intensidad sobre volumen
  // ══════════════════════════════════════════════════════════════════════════

  fbase_lunes: {
    mp: 'Squat', foco: 'SQ pesado — Fuerza Base',
    desc: 'Retorno a sentadilla libre si el cuádricep lo permite. Si no, box squat con profundidad máxima tolerable.',
    ejs: [
      { n:'Squat',                 t:'COMPETITIVO',  bs:5, r:3,  rpe:8.0, kg:130, rest:5, nota:'Sentadilla libre si hay profundidad controlable sin dolor. Sino: box squat.' },
      { n:'Paused Box Squat',      t:'VARIANTE',     bs:3, r:3,  rpe:7.5, kg:108, rest:4, nota:'2s de pausa en la caja. Refuerza la posición baja.' },
      { n:'Bulgarian Split Squat', t:'AUXILIAR',     bs:3, r:6,  rpe:7.5, kg:20,  rest:3, nota:'Con mancuernas. Trabajo unilateral de fuerza.' },
      { n:'Romanian Deadlift',     t:'AUXILIAR',     bs:3, r:6,  rpe:7.5, kg:122, rest:3 },
      { n:'Leg Curl',              t:'COMPENSATORIO', bs:3, r:10, rpe:7.0, kg:40,  rest:2 },
      { n:'Copenhagen Plank',      t:'COMPENSATORIO', bs:3, r:10, rpe:7.0,         rest:1 },
      { n:'Ab Wheel',              t:'COMPENSATORIO', bs:3, r:10, rpe:7.0,         rest:2, nota:'Progresando en dificultad.' },
    ],
  },

  fbase_martes: {
    mp: 'Bench Press', foco: 'BP pesado — Fuerza Base',
    desc: 'Banca pesada. Progresión lineal hacia marcas máximas.',
    ejs: [
      { n:'Bench Press',           t:'COMPETITIVO',  bs:5, r:3,  rpe:8.5, kg:95,  rest:4, nota:'Descenso 3 seg. Pausa reglamentaria al pecho.' },
      { n:'Paused Bench Press',    t:'VARIANTE',     bs:3, r:3,  rpe:8.0, kg:85,  rest:4, nota:'2s de pausa. Potencia fuera del pecho.' },
      { n:'Close Grip Bench Press',t:'VARIANTE',     bs:3, r:5,  rpe:8.0, kg:78,  rest:3 },
      { n:'Barbell Row',           t:'AUXILIAR',     bs:4, r:6,  rpe:8.0, kg:85,  rest:3 },
      { n:'Weighted Dips',         t:'AUXILIAR',     bs:3, r:6,  rpe:7.5, kg:10,  rest:3, nota:'Fondos con peso. Pecho y tríceps pesado.' },
      { n:'Tricep Extension',      t:'COMPENSATORIO', bs:3, r:10, rpe:7.0, kg:35,  rest:1 },
      { n:'Band External Rotation',t:'COMPENSATORIO', bs:3, r:15, rpe:6.5,         rest:1 },
      { n:'Face Pull',             t:'COMPENSATORIO', bs:3, r:15, rpe:6.5, kg:22,  rest:1 },
    ],
  },

  fbase_miercoles: {
    mp: 'Deadlift Sumo', foco: 'DL pesado — Fuerza Base',
    desc: 'Jalón sumo a alta intensidad. Progresión lineal +2.5-5kg/semana.',
    ejs: [
      { n:'Deadlift Sumo',         t:'COMPETITIVO',  bs:5, r:3,  rpe:8.5, kg:185, rest:5, nota:'Progresión +2.5-5kg/sem. Técnica limpia sobre todo.' },
      { n:'Deficit Deadlift Sumo', t:'VARIANTE',     bs:3, r:3,  rpe:8.0, kg:155, rest:4, nota:'Déficit 5cm. Mejora el jalón desde el piso.' },
      { n:'Squat',                 t:'VARIANTE',     bs:3, r:3,  rpe:7.5, kg:118, rest:4, nota:'Segunda pasada de sentadilla. Más ligero que el lunes.' },
      { n:'Back Extension / GHD',  t:'COMPENSATORIO', bs:3, r:10, rpe:7.0, kg:28,  rest:2 },
      { n:'Copenhagen Plank',      t:'COMPENSATORIO', bs:3, r:10, rpe:7.0,         rest:1 },
      { n:'Ab Wheel',              t:'COMPENSATORIO', bs:3, r:10, rpe:7.0,         rest:2 },
    ],
  },

  fbase_jueves: {
    mp: 'Bench Press', foco: 'SQ moderado + BP moderado',
    desc: 'Segunda pasada de sentadilla y banca. Menos intensa que lunes/martes. Refuerza volumen semanal.',
    ejs: [
      { n:'Squat',                 t:'COMPETITIVO',  bs:4, r:3,  rpe:7.5, kg:118, rest:4, nota:'Más ligero que el lunes. Técnica y volumen.' },
      { n:'Bench Press',           t:'COMPETITIVO',  bs:4, r:4,  rpe:7.5, kg:88,  rest:3 },
      { n:'Incline Dumbbell Press',t:'AUXILIAR',     bs:3, r:8,  rpe:7.5, kg:34,  rest:2 },
      { n:'Lat Pulldown',          t:'AUXILIAR',     bs:4, r:8,  rpe:7.5, kg:70,  rest:2 },
      { n:'Pec Deck / Chest Fly',  t:'AUXILIAR',     bs:3, r:12, rpe:7.0, kg:42,  rest:2 },
      { n:'Tricep Pushdown',       t:'COMPENSATORIO', bs:3, r:12, rpe:7.0, kg:30,  rest:1 },
      { n:'Band External Rotation',t:'COMPENSATORIO', bs:3, r:15, rpe:6.5,         rest:1 },
      { n:'Glute Bridge / Hip Thrust',t:'COMPENSATORIO',bs:3,r:10,rpe:7.0,kg:80,  rest:2 },
    ],
  },

  fbase_viernes: {
    mp: 'Squat', foco: 'SBD técnico — cierre de semana',
    desc: 'Todos los levantamientos. Pesos técnicos. Consolida patrones de la semana.',
    ejs: [
      { n:'Squat',                 t:'COMPETITIVO',  bs:3, r:3,  rpe:7.0, kg:107, rest:4, nota:'Más ligero. Imprimir patrones de la semana.' },
      { n:'Bench Press',           t:'VARIANTE',     bs:3, r:3,  rpe:7.0, kg:83,  rest:3 },
      { n:'Deadlift Sumo',         t:'VARIANTE',     bs:3, r:3,  rpe:7.0, kg:167, rest:3, nota:'Técnico. Más ligero que el miércoles.' },
      { n:'Romanian Deadlift',     t:'AUXILIAR',     bs:3, r:6,  rpe:7.0, kg:115, rest:3 },
      { n:'Glute Bridge / Hip Thrust',t:'COMPENSATORIO',bs:3,r:10,rpe:7.0,kg:80,  rest:2 },
      { n:'Hollow Body Hold',      t:'COMPENSATORIO', bs:3, r:25, rpe:6.5,         rest:1, nota:'25 segundos. Progresión de dificultad.' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PEAKING (sem 15-19)  RPE base: 8.5-9  Calidad sobre cantidad
  // ══════════════════════════════════════════════════════════════════════════

  peak_lunes: {
    mp: 'Squat', foco: 'SQ+BP pesado — Peaking',
    desc: 'Máxima intensidad. Singles y dobles submáximos. Con equipamiento de competencia.',
    ejs: [
      { n:'Squat',                 t:'COMPETITIVO',  bs:4, r:2,  rpe:9.0, kg:162, rest:6, nota:'Full profundidad. Cinto y vendas si corresponde. Comandos de juez.' },
      { n:'Bench Press',           t:'COMPETITIVO',  bs:4, r:2,  rpe:9.0, kg:100, rest:5, nota:'Pausa reglamentaria. Simula el meet.' },
      { n:'Paused Squat',          t:'VARIANTE',     bs:2, r:2,  rpe:8.0, kg:138, rest:4, nota:'Pausa 2s en el hoyo. Refuerza la posición baja.' },
      { n:'Romanian Deadlift',     t:'AUXILIAR',     bs:3, r:5,  rpe:7.5, kg:122, rest:3 },
      { n:'Ab Wheel',              t:'COMPENSATORIO', bs:3, r:10, rpe:7.0,         rest:2 },
    ],
  },

  peak_martes: {
    mp: 'Bench Press', foco: 'Upper — Recuperación activa + BP técnico',
    desc: 'Día de recuperación activa. BP moderado y accesorios. Sin piernas pesadas.',
    ejs: [
      { n:'Bench Press',           t:'VARIANTE',     bs:3, r:3,  rpe:7.5, kg:88,  rest:3, nota:'Técnico. No llegar al límite.' },
      { n:'Close Grip Bench Press',t:'VARIANTE',     bs:3, r:5,  rpe:7.5, kg:75,  rest:3 },
      { n:'Barbell Row',           t:'AUXILIAR',     bs:3, r:6,  rpe:7.5, kg:83,  rest:3 },
      { n:'Lat Pulldown',          t:'AUXILIAR',     bs:3, r:8,  rpe:7.0, kg:68,  rest:2 },
      { n:'Tricep Pushdown',       t:'COMPENSATORIO', bs:3, r:12, rpe:7.0, kg:30,  rest:1 },
      { n:'Band External Rotation',t:'COMPENSATORIO', bs:3, r:15, rpe:6.5,         rest:1 },
      { n:'Face Pull',             t:'COMPENSATORIO', bs:3, r:15, rpe:6.5, kg:22,  rest:1 },
    ],
  },

  peak_miercoles: {
    mp: 'Deadlift Sumo', foco: 'DL pesado — Peaking',
    desc: 'Jalón sumo a máxima intensidad. Singles submáximos en sem 18-19.',
    ejs: [
      { n:'Deadlift Sumo',         t:'COMPETITIVO',  bs:4, r:2,  rpe:9.0, kg:200, rest:6, nota:'Singles @9 en sem 18-19. Sentir el jalón limpio.' },
      { n:'Squat',                 t:'VARIANTE',     bs:3, r:2,  rpe:8.0, kg:147, rest:4, nota:'Segunda pasada de squat. Más ligero que el lunes.' },
      { n:'Back Extension / GHD',  t:'COMPENSATORIO', bs:3, r:8,  rpe:7.0, kg:30,  rest:2 },
      { n:'Ab Wheel',              t:'COMPENSATORIO', bs:3, r:10, rpe:7.0,         rest:2 },
    ],
  },

  peak_jueves: {
    mp: 'Squat', foco: 'SQ+BP técnico — 85%',
    desc: 'Sesión técnica al 85%. Consolida patrones antes del simulacro del viernes.',
    ejs: [
      { n:'Squat',                 t:'COMPETITIVO',  bs:3, r:2,  rpe:8.0, kg:150, rest:5, nota:'Técnico. No llegar al límite. Preparar CNS para el viernes.' },
      { n:'Bench Press',           t:'COMPETITIVO',  bs:4, r:2,  rpe:8.0, kg:92,  rest:4, nota:'Pausa reglamentaria. Técnico.' },
      { n:'Incline Dumbbell Press',t:'AUXILIAR',     bs:3, r:8,  rpe:7.0, kg:34,  rest:2 },
      { n:'Glute Bridge / Hip Thrust',t:'COMPENSATORIO',bs:3,r:8,rpe:7.0,kg:80,  rest:2 },
    ],
  },

  peak_viernes: {
    mp: 'Squat', foco: 'SBD — Simulacro de competencia',
    desc: 'Simular meet completo. 1-2 intentos por levantamiento. Con todo el equipamiento de competencia.',
    ejs: [
      { n:'Squat',                 t:'COMPETITIVO',  bs:2, r:1,  rpe:9.0, kg:165, rest:8, nota:'Con cinto, vendas, equipamiento. Comandos de juez.' },
      { n:'Bench Press',           t:'COMPETITIVO',  bs:2, r:1,  rpe:9.0, kg:102, rest:6, nota:'Pausa reglamentaria. Simular comandos.' },
      { n:'Deadlift Sumo',         t:'COMPETITIVO',  bs:2, r:1,  rpe:9.0, kg:205, rest:8, nota:'Jalón limpio con todo el equipamiento.' },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TAPERING (sem 20-23)  Mantener intensidad, cortar volumen progresivamente
  // ══════════════════════════════════════════════════════════════════════════

  taper_lunes: {
    mp: 'Squat', foco: 'SQ+BP — Tapering',
    desc: 'Mantener intensidad. Reducir sets a la mitad respecto al peaking. CNS fresco.',
    ejs: [
      { n:'Squat',     t:'COMPETITIVO', bs:4, r:2, rpe:8.0, kg:162, rest:6, nota:'Reducir sets, NO el peso.' },
      { n:'Bench Press',t:'COMPETITIVO',bs:4, r:2, rpe:8.0, kg:100, rest:5, nota:'Pausa reglamentaria.' },
    ],
  },

  taper_martes: {
    mp: 'Bench Press', foco: 'Upper ligero — recuperación activa',
    desc: 'Accesorios de tren superior muy ligeros. Mantener flujo sin acumular fatiga.',
    ejs: [
      { n:'Bench Press',           t:'VARIANTE',     bs:4, r:3,  rpe:7.5, kg:83,  rest:3, nota:'Ligero. Solo mantener el patrón activo.' },
      { n:'Barbell Row',           t:'AUXILIAR',     bs:3, r:8,  rpe:7.0, kg:72,  rest:2 },
      { n:'Face Pull',             t:'COMPENSATORIO', bs:3, r:15, rpe:6.5, kg:20,  rest:1 },
      { n:'Band External Rotation',t:'COMPENSATORIO', bs:3, r:15, rpe:6.5,         rest:1 },
    ],
  },

  taper_miercoles: {
    mp: 'Deadlift Sumo', foco: 'DL — Tapering',
    desc: 'Jalón sumo reducido. Intensidad mantenida, volumen cortado.',
    ejs: [
      { n:'Deadlift Sumo', t:'COMPETITIVO', bs:4, r:2, rpe:8.0, kg:195, rest:6, nota:'Mantiene la intensidad. Reduce el volumen.' },
      { n:'Squat',         t:'VARIANTE',    bs:3, r:2, rpe:7.5, kg:143, rest:4, nota:'Segunda pasada ligera.' },
    ],
  },

  taper_jueves: {
    mp: 'Squat', foco: 'SQ+BP — Práctica de aperturas',
    desc: 'Pesos de apertura. Deben sentirse ligeros. Confirmar que los openers están bien elegidos.',
    ejs: [
      { n:'Squat',      t:'COMPETITIVO', bs:4, r:1, rpe:8.0, kg:152, rest:6, nota:'Opener SQ. RPE 8 máximo. Ajustar si es más difícil.' },
      { n:'Bench Press',t:'COMPETITIVO', bs:4, r:1, rpe:8.0, kg:93,  rest:5, nota:'Opener BP.' },
      { n:'Deadlift Sumo',t:'COMPETITIVO',bs:4,r:1, rpe:8.0, kg:185, rest:6, nota:'Opener DL.' },
    ],
  },

  taper_viernes: {
    mp: 'Squat', foco: 'SBD — Confirmación final de aperturas',
    desc: 'Última sesión antes de la semana de competencia. Confirmar aperturas. Todo debe sentirse cómodo.',
    ejs: [
      { n:'Squat',      t:'COMPETITIVO', bs:4, r:1, rpe:8.0, kg:155, rest:8, nota:'Opener confirmado. Con todo el equipamiento.' },
      { n:'Bench Press',t:'COMPETITIVO', bs:4, r:1, rpe:8.0, kg:95,  rest:6, nota:'Opener BP confirmado.' },
      { n:'Deadlift Sumo',t:'COMPETITIVO',bs:4,r:1,rpe:8.0,  kg:188, rest:8, nota:'Opener DL confirmado.' },
    ],
  },
};

// ─── ESTRUCTURA DE BLOQUES ────────────────────────────────────────────────────

const BLOQUES = [
  {
    nombre: 'Bloque 0 — Introducción / Rehabilitación',
    numero_bloque: 1, semana_inicio: 1, semana_fin: 4,
    enfasis: 'Rehabilitación y Tolerancia',
    intensidad_rpe_min: 6, intensidad_rpe_max: 6.5,
    volumen_reps_min: 5, volumen_reps_max: 12,
    key: 'intro',
    semanas: [1, 2, 3, 4],
    dias: [
      { dia: 'lunes',    tpl: 'intro_lunes' },
      { dia: 'martes',   tpl: 'intro_martes' },
      { dia: 'miercoles', tpl: 'intro_miercoles' },
      { dia: 'jueves',   tpl: 'intro_jueves' },
      { dia: 'viernes',  tpl: 'intro_viernes' },
    ],
  },
  {
    nombre: 'Bloque 1 — Hipertrofia',
    numero_bloque: 2, semana_inicio: 5, semana_fin: 9,
    enfasis: 'Hipertrofia',
    intensidad_rpe_min: 6.5, intensidad_rpe_max: 8,
    volumen_reps_min: 4, volumen_reps_max: 12,
    key: 'hiper',
    semanas: [5, 6, 7, 8, 9],
    dias: [
      { dia: 'lunes',    tpl: 'hiper_lunes' },
      { dia: 'martes',   tpl: 'hiper_martes' },
      { dia: 'miercoles', tpl: 'hiper_miercoles' },
      { dia: 'jueves',   tpl: 'hiper_jueves' },
      { dia: 'viernes',  tpl: 'hiper_viernes' },
    ],
  },
  {
    nombre: 'Bloque 2 — Fuerza Base',
    numero_bloque: 3, semana_inicio: 10, semana_fin: 14,
    enfasis: 'Fuerza Base',
    intensidad_rpe_min: 7.5, intensidad_rpe_max: 8.5,
    volumen_reps_min: 2, volumen_reps_max: 6,
    key: 'fbase',
    semanas: [10, 11, 12, 13, 14],
    dias: [
      { dia: 'lunes',    tpl: 'fbase_lunes' },
      { dia: 'martes',   tpl: 'fbase_martes' },
      { dia: 'miercoles', tpl: 'fbase_miercoles' },
      { dia: 'jueves',   tpl: 'fbase_jueves' },
      { dia: 'viernes',  tpl: 'fbase_viernes' },
    ],
  },
  {
    nombre: 'Bloque 3 — Peaking',
    numero_bloque: 4, semana_inicio: 15, semana_fin: 19,
    enfasis: 'Peaking',
    intensidad_rpe_min: 8, intensidad_rpe_max: 9.5,
    volumen_reps_min: 1, volumen_reps_max: 3,
    key: 'peak',
    semanas: [15, 16, 17, 18, 19],
    dias: [
      { dia: 'lunes',    tpl: 'peak_lunes' },
      { dia: 'martes',   tpl: 'peak_martes' },
      { dia: 'miercoles', tpl: 'peak_miercoles' },
      { dia: 'jueves',   tpl: 'peak_jueves' },
      { dia: 'viernes',  tpl: 'peak_viernes' },
    ],
  },
  {
    nombre: 'Bloque 4 — Tapering',
    numero_bloque: 5, semana_inicio: 20, semana_fin: 23,
    enfasis: 'Tapering',
    intensidad_rpe_min: 7, intensidad_rpe_max: 8.5,
    volumen_reps_min: 1, volumen_reps_max: 2,
    key: 'taper',
    semanas: [20, 21, 22, 23],
    dias: [
      { dia: 'lunes',    tpl: 'taper_lunes' },
      { dia: 'martes',   tpl: 'taper_martes' },
      { dia: 'miercoles', tpl: 'taper_miercoles' },
      { dia: 'jueves',   tpl: 'taper_jueves' },
      { dia: 'viernes',  tpl: 'taper_viernes' },
    ],
  },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏋️  Paul v3 — Progresión semana a semana + grupos musculares completos\n');

  const peri = await post('/api/periodizaciones', {
    nombre: 'Preparación Campeonato Nov 9 — Paul Bustamante',
    tipo: 'LINEAL', athlete_id: PAUL_ID,
    fecha_inicio: '2026-05-26', fecha_fin: '2026-11-09',
    duracion_semanas: 23,
    objetivo: 'Preparación competencia. Gestión lesión cuádriceps. Progresión semana a semana (MEV→MRV→deload). BP maximizado. Cobertura muscular completa: core, aductores, glúteo, unilateral.',
    descripcion: 'Lineal 23 sem. Bloque 0 rehab (1-4). Hipertrofia (5-9). Fuerza Base (10-14). Peaking (15-19). Tapering (20-23). Competencia Nov 9.',
  });
  console.log(`✅ Periodización: ${peri.id}\n`);

  let totalS = 0, totalE = 0;

  for (const bloqueConf of BLOQUES) {
    const { semanas, dias, key, ...bloqueData } = bloqueConf;
    const bloque = await post('/api/bloques', { periodizacion_id: peri.id, ...bloqueData });
    const mults = MULT[key];
    const rpeIncs = RPE_INC[key];
    console.log(`📦 ${bloque.nombre}`);

    for (let wi = 0; wi < semanas.length; wi++) {
      const sem = semanas[wi];
      const mult = mults[wi] ?? 1.0;
      const rpeInc = rpeIncs[wi] ?? 0;

      for (const diaConf of dias) {
        const tpl = T[diaConf.tpl];
        const sesion = await post('/api/sesiones', {
          bloque_id: bloque.id,
          numero_semana: sem,
          dia_semana: diaConf.dia,
          movimiento_principal: tpl.mp,
          enfocuo_dia: tpl.foco,
          descripcion: tpl.desc,
          orden_secuencia: sem * 10 + dias.indexOf(diaConf),
        });
        totalS++;

        let orden = 1;
        for (const ej of tpl.ejs) {
          const sets = s(ej.bs, mult);
          if (sets < 1) continue; // skip si el mult hace que quede en 0
          const rpeVal = rp(ej.rpe, rpeInc);
          await post('/api/ejercicios-sesion', clean({
            sesion_id: sesion.id,
            ejercicio_nombre: ej.n,
            tipo_ejercicio: ej.t,
            sets_programados: sets,
            reps_programadas: ej.r,
            rpe_programado: rpeVal,
            peso_programado: ej.kg ?? undefined,
            rest_minutos: ej.rest,
            notas_tecnicas: ej.nota ?? undefined,
            orden: orden++,
          }));
          totalE++;
          process.stdout.write('.');
        }
      }
      process.stdout.write(` sem${sem}\n`);
    }
    console.log();
  }

  console.log(`✅ Listo.`);
  console.log(`   Sesiones   : ${totalS}`);
  console.log(`   Ejercicios : ${totalE}`);
  console.log(`\n📊 Volumen BP estimado por bloque:`);
  console.log(`   Intro:       ~16-20 sets/sem (pico sem 3)`);
  console.log(`   Hipertrofia: ~22-28 sets/sem (pico sem 8)`);
  console.log(`   Fuerza Base: ~18-22 sets/sem (pico sem 13)`);
  console.log(`   Peaking:     ~13-16 sets/sem`);
  console.log(`   Tapering:    ~8-12 sets/sem`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
