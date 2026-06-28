// seed-frank-h2.js — Bloque H2 de Frank con tipos correctos, articulación y aproximaciones
require('dotenv/config');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/valkyria' });

const ATHLETE_ID = 'cmodn0hbc0005xni1rxkrnclr';
const COACH_ID   = 'cmodn0h880001xni17r7vz59f';

const SEMANAS = [
  { num: 1, rpe: 6.0, rir: 'RIR 4',   sM: 3, sA: 3 },
  { num: 2, rpe: 6.5, rir: 'RIR 3-4', sM: 3, sA: 3 },
  { num: 3, rpe: 7.0, rir: 'RIR 3',   sM: 4, sA: 3 },
  { num: 4, rpe: 7.5, rir: 'RIR 2-3', sM: 4, sA: 4 },
  { num: 5, rpe: 8.0, rir: 'RIR 2',   sM: 4, sA: 4 },
  { num: 6, rpe: 8.5, rir: 'RIR 1-2', sM: 4, sA: 4 },
];

const DIAS = [
  { dia: 'Lunes',     mov: 'Sentadilla',   enfoque: 'Cuadríceps dominante',                 offset: 0 },
  { dia: 'Martes',    mov: 'Banca',        enfoque: 'Press horizontal + Tríceps + Bíceps',  offset: 1 },
  { dia: 'Miércoles', mov: 'Peso Muerto',  enfoque: 'Cadena posterior',                     offset: 2 },
  { dia: 'Jueves',    mov: 'Banca B',      enfoque: 'Upper — Inclinado + Espalda + Bíceps', offset: 3 },
  { dia: 'Viernes',   mov: 'Sentadilla B', enfoque: 'Glúteo y posterior inferior',           offset: 4 },
];

// Calentamiento articular por tipo de día
const ARTICULACION = {
  sq: {
    nombre: 'Calentamiento articular — Cadera, rodilla y tobillo',
    tipo: 'MOVILIDAD', grupo: 'P0', rir: '-', sets: 1, reps: 1, rpe: 6, rest: 0,
    carga: '5-8 minutos. Sin carga.',
    nota: '1) Círculos de cadera ×10 c/lado | 2) Rotación interna-externa de cadera en el suelo ×10 | 3) Peso muerto con banda en tobillo ×10 | 4) Cuclillas profunda con apoyo ×10 | 5) Activación de glúteo medio en cuadrupedia ×15 c/lado',
  },
  bp: {
    nombre: 'Calentamiento articular — Hombro, codo y muñeca',
    tipo: 'MOVILIDAD', grupo: 'P0', rir: '-', sets: 1, reps: 1, rpe: 6, rest: 0,
    carga: '5-8 minutos. Sin carga.',
    nota: '1) Círculos de hombro hacia adelante y atrás ×10 | 2) Rotación externa con banda ×15 c/lado | 3) Apertura de pecho con banda ×10 | 4) Círculos de muñeca ×10 | 5) Face pull ligero como activación ×20',
  },
  dl: {
    nombre: 'Calentamiento articular — Cadera, columna y cadena posterior',
    tipo: 'MOVILIDAD', grupo: 'P0', rir: '-', sets: 1, reps: 1, rpe: 6, rest: 0,
    carga: '5-8 minutos. Sin carga.',
    nota: '1) Cat-cow ×10 | 2) Hip hinge con palo ×10 | 3) Good morning con barra vacía ×10 | 4) Glute bridge unilateral ×10 c/lado | 5) Rotación torácica en el suelo ×8 c/lado',
  },
};

// Aproximaciones por movimiento principal
const APROXIMACIONES = {
  sq: {
    nombre: 'Aproximaciones — Sentadilla',
    tipo: 'MOVILIDAD', grupo: 'P1', rir: '-', sets: 4, reps: 1, rpe: 6, rest: 2,
    carga: 'Rampas progresivas hasta el peso de trabajo.',
    nota: 'Serie 1: Barra (20 kg) × 8 | Serie 2: ~50% del peso de trabajo × 5 | Serie 3: ~70% × 3 | Serie 4: ~85% × 1 → Iniciar series de trabajo',
  },
  bp: {
    nombre: 'Aproximaciones — Banca',
    tipo: 'MOVILIDAD', grupo: 'P1', rir: '-', sets: 4, reps: 1, rpe: 6, rest: 2,
    carga: 'Rampas progresivas hasta el peso de trabajo.',
    nota: 'Serie 1: Barra (20 kg) × 10 | Serie 2: ~50% del peso de trabajo × 6 | Serie 3: ~70% × 3 | Serie 4: ~85% × 1 → Iniciar series de trabajo',
  },
  dl: {
    nombre: 'Aproximaciones — Peso Muerto',
    tipo: 'MOVILIDAD', grupo: 'P1', rir: '-', sets: 4, reps: 1, rpe: 6, rest: 2,
    carga: 'Rampas progresivas hasta el peso de trabajo.',
    nota: 'Serie 1: Solo platos (sin carga útil) × 5 | Serie 2: ~50% del peso de trabajo × 4 | Serie 3: ~70% × 2 | Serie 4: ~85% × 1 → Iniciar series de trabajo',
  },
  // Variantes tienen sus propias aproximaciones pero más ligeras
  sqVar: {
    nombre: 'Aproximaciones — Sentadilla variante',
    tipo: 'MOVILIDAD', grupo: 'P1', rir: '-', sets: 3, reps: 1, rpe: 6, rest: 1,
    carga: 'Rampas ligeras.',
    nota: 'Serie 1: Barra × 8 | Serie 2: ~55% del peso de trabajo × 4 | Serie 3: ~75% × 2 → Iniciar series',
  },
  bpVar: {
    nombre: 'Aproximaciones — Banca variante',
    tipo: 'MOVILIDAD', grupo: 'P1', rir: '-', sets: 3, reps: 1, rpe: 6, rest: 1,
    carga: 'Rampas ligeras.',
    nota: 'Serie 1: Barra × 8 | Serie 2: ~55% × 4 | Serie 3: ~75% × 2 → Iniciar series',
  },
};

function getEjercicios(dia, rpe, rir, sM, sA) {
  const c = 6.0;
  const cap = (v, max) => Math.min(v, max);
  const flr = (v, min) => Math.max(v, min);

  if (dia === 'Lunes') return [
    ARTICULACION.sq,
    APROXIMACIONES.sq,
    { nombre: 'Sentadilla barra baja', tipo: 'COMPETITIVO', grupo: 'A1',
      carga: '62-72% del 1RM (~101 kg). Sem1: ~62 kg. +2.5 kg si RIR real > objetivo.',
      rir, sets: sM, reps: 8, rpe: rpe, rest: 4,
      nota: 'Foco en posición y profundidad. No sacrifiques técnica por peso.' },
    { nombre: 'Sentadilla con pausa en el hoyo', tipo: 'VARIANTE', grupo: 'A2',
      carga: '80-85% del peso del básico del día. Pausa 2 seg completa.',
      rir, sets: 3, reps: 5, rpe: flr(rpe - 0.5, 6), rest: 3,
      nota: 'Sin rebotar. Mantén tensión en el hoyo.' },
    { nombre: 'Hack squat en maquina', tipo: 'AUXILIAR', grupo: 'B1',
      carga: 'Moderado. Progresión +5-10 kg/sem.',
      rir, sets: sA, reps: 12, rpe: cap(rpe, 8), rest: 2,
      nota: 'Rango completo. Rodillas no colapsen.' },
    { nombre: 'Extension de cuadriceps', tipo: 'AUXILIAR', grupo: 'B2',
      carga: 'Ligero. Contracción 1 seg arriba.',
      rir: 'RIR 3', sets: 3, reps: 15, rpe: cap(rpe, 7.5), rest: 1, nota: null },
    { nombre: 'Copenhagen isometrico', tipo: 'COMPENSATORIO', grupo: 'C1',
      carga: 'Peso corporal.',
      rir: '-', sets: 3, reps: 3, rpe: c, rest: 1,
      nota: '×20 seg por lado. Progresa a 30 seg en sem4.' },
  ];

  if (dia === 'Martes') return [
    ARTICULACION.bp,
    APROXIMACIONES.bp,
    { nombre: 'Banca con pausa 2-3ct', tipo: 'COMPETITIVO', grupo: 'A1',
      carga: '65-75% del 1RM estimado (~75 kg). Sem1: ~50 kg. Pausa de competición.',
      rir, sets: sM, reps: 7, rpe: rpe, rest: 4,
      nota: 'Pausa en el pecho. Leg drive activo. No rebotar.' },
    { nombre: 'Spoto press', tipo: 'VARIANTE', grupo: 'A2',
      carga: '5-10% menos que la banca del día. Sin toque al pecho.',
      rir, sets: 3, reps: 8, rpe: flr(rpe - 0.5, 6), rest: 3,
      nota: 'Detener barra 2-3 cm sobre el pecho. Excéntrica controlada.' },
    { nombre: 'Press agarre cerrado', tipo: 'AUXILIAR', grupo: 'B1',
      carga: '65-70% del 1RM de BP (~46-50 kg). Codos cerca del cuerpo.',
      rir, sets: sA, reps: 10, rpe: cap(rpe, 8), rest: 2, nota: null },
    { nombre: 'Extensiones triceps en polea', tipo: 'AUXILIAR', grupo: 'B2',
      carga: 'Ligero. Contracción completa al fondo.',
      rir: 'RIR 3', sets: 3, reps: 15, rpe: cap(rpe, 7.5), rest: 1, nota: null },
    { nombre: 'Face pull en polea alta', tipo: 'COMPENSATORIO', grupo: 'C1',
      carga: 'Muy ligero. 15-25 kg máximo.',
      rir: '-', sets: 3, reps: 20, rpe: c, rest: 1,
      nota: 'Rotación externa al final. Codos a la altura de hombros.' },
    { nombre: 'Elevaciones laterales con mancuerna', tipo: 'COMPENSATORIO', grupo: 'C2',
      carga: '5-8 kg. Foco en el arco lateral.',
      rir: '-', sets: 3, reps: 20, rpe: c, rest: 1,
      nota: 'No balancear. Subir lento, bajar más lento.' },
    { nombre: 'Curl martillo alternado', tipo: 'AUXILIAR', grupo: 'D1',
      carga: 'Moderado. Sin balanceo del cuerpo.',
      rir: 'RIR 3', sets: 3, reps: 12, rpe: cap(rpe, 7.5), rest: 1,
      nota: '×12 por lado. Agarre neutro. Activa braquial.' },
    { nombre: 'Curl predicador barra Z', tipo: 'AUXILIAR', grupo: 'D2',
      carga: 'Ligero-moderado. Codo fijo en el predicador.',
      rir: 'RIR 3', sets: 3, reps: 12, rpe: cap(rpe, 7.5), rest: 1,
      nota: 'Cabeza corta. Extensión completa abajo. Sin momentum.' },
  ];

  if (dia === 'Miércoles') return [
    ARTICULACION.dl,
    APROXIMACIONES.dl,
    { nombre: 'Peso muerto convencional', tipo: 'COMPETITIVO', grupo: 'A1',
      carga: '68-78% del 1RM estimado (107 kg). Sem1: ~72 kg. +2.5 kg si RIR real ≥ objetivo +1.',
      rir, sets: sM, reps: 5, rpe: rpe, rest: 4,
      nota: 'Empujar el suelo, no jalar la barra. Espalda neutra todo el recorrido.' },
    { nombre: 'RDL Peso Muerto Rumano', tipo: 'AUXILIAR', grupo: 'B1',
      carga: 'Sem1: ~80 kg (base del bloque anterior). Progresión por RIR.',
      rir, sets: sA, reps: 10, rpe: cap(rpe, 8), rest: 3,
      nota: 'Prioridad al estiramiento de isquiotibiales. Cadera hacia atrás.' },
    { nombre: 'Hip thrust pesado', tipo: 'AUXILIAR', grupo: 'B2',
      carga: 'Sem1: ~80-90 kg. Progresión +5 kg/sem.',
      rir, sets: 4, reps: 10, rpe: cap(rpe, 8), rest: 2,
      nota: 'Contracción del glúteo en el pico. No hiperextender lumbar.' },
    { nombre: 'Curl femoral tumbado', tipo: 'AUXILIAR', grupo: 'C1',
      carga: 'Ligero-moderado. Excéntrica 3 seg.',
      rir: 'RIR 3', sets: 3, reps: 12, rpe: cap(rpe, 7.5), rest: 1,
      nota: 'Bajada en 3 segundos. No rebotar al fondo.' },
    { nombre: 'Extension de espalda', tipo: 'AUXILIAR', grupo: 'C2',
      carga: 'Peso corporal sem1-2. Plato 10 kg en el pecho sem3+.',
      rir: 'RIR 3', sets: 3, reps: 12, rpe: cap(rpe, 7), rest: 1,
      nota: 'Espalda neutra. Foco en erectores. No hiperextender.' },
    { nombre: 'Plancha lateral con elevacion', tipo: 'COMPENSATORIO', grupo: 'D1',
      carga: 'Peso corporal.',
      rir: '-', sets: 3, reps: 3, rpe: c, rest: 1,
      nota: '×25 seg por lado. Progresa a 35 seg en sem4.' },
  ];

  if (dia === 'Jueves') return [
    ARTICULACION.bp,
    APROXIMACIONES.bpVar,
    { nombre: 'Banca inclinada con barra', tipo: 'VARIANTE', grupo: 'A1',
      carga: '15-20% menos que la banca plana. Sem1: ~42-45 kg.',
      rir, sets: sM, reps: 10, rpe: rpe, rest: 3,
      nota: 'Ángulo 30-45°. Codos a 60° del cuerpo. Toca el pecho superior.' },
    { nombre: 'Larsen press', tipo: 'VARIANTE', grupo: 'A2',
      carga: '15-20% menos que el básico. Piernas extendidas.',
      rir, sets: 3, reps: 10, rpe: flr(rpe - 0.5, 6), rest: 3,
      nota: 'Sin apoyo de piernas. Activa el core. Foco en pectoral.' },
    { nombre: 'JM Press', tipo: 'AUXILIAR', grupo: 'B1',
      carga: '30-40% del 1RM de BP. Aprende con barra sola primero.',
      rir, sets: sA, reps: 8, rpe: cap(rpe, 8), rest: 2,
      nota: 'Híbrido banca-press francés. Codo cerca. Excéntrica controlada.' },
    { nombre: 'Tate press', tipo: 'AUXILIAR', grupo: 'B2',
      carga: 'Muy ligero. 5-10 kg por lado.',
      rir: 'RIR 3', sets: 3, reps: 15, rpe: cap(rpe, 7), rest: 1,
      nota: 'Codos hacia afuera. Cabeza lateral del tríceps.' },
    { nombre: 'Pajaro con mancuerna', tipo: 'COMPENSATORIO', grupo: 'C1',
      carga: 'Muy ligero. 5-12 kg.',
      rir: '-', sets: 3, reps: 15, rpe: c, rest: 1,
      nota: 'Deltoides posterior y manguito. Codo ligeramente flexionado.' },
    { nombre: 'Remo Pendlay', tipo: 'AUXILIAR', grupo: 'C2',
      carga: '50-60% del 1RM de DL (~54-64 kg). Explosivo en la subida.',
      rir, sets: sA, reps: 8, rpe: cap(rpe, 8), rest: 2,
      nota: 'Barra desde el suelo en cada rep. Torso paralelo. Explosivo.' },
    { nombre: 'Elevaciones laterales con mancuerna', tipo: 'COMPENSATORIO', grupo: 'C3',
      carga: '5-8 kg. Segunda sesión semanal.',
      rir: '-', sets: 3, reps: 20, rpe: c, rest: 1,
      nota: 'Misma técnica que el martes.' },
    { nombre: 'Curl inclinado con mancuerna', tipo: 'AUXILIAR', grupo: 'D1',
      carga: 'Ligero-moderado. El estiramiento es lo que importa.',
      rir: 'RIR 3', sets: 3, reps: 10, rpe: cap(rpe, 7.5), rest: 1,
      nota: 'Banco 45°. Cabeza larga del bíceps. Extensión completa abajo.' },
  ];

  if (dia === 'Viernes') return [
    ARTICULACION.sq,
    APROXIMACIONES.sqVar,
    { nombre: 'Sentadilla barra alta', tipo: 'VARIANTE', grupo: 'A1',
      carga: '70-80% del peso del básico (lunes). Sem1: ~44-50 kg.',
      rir, sets: sM, reps: 8, rpe: rpe, rest: 3,
      nota: 'Mayor ROM que barra baja. Torso vertical. Rodillas adelante.' },
    { nombre: 'Sentadilla bulgara', tipo: 'AUXILIAR', grupo: 'B1',
      carga: 'Mancuernas livianas. Foco en estabilidad y rango.',
      rir, sets: 3, reps: 10, rpe: cap(rpe, 7.5), rest: 2,
      nota: '×10 por pierna. Rodilla trasera cerca del suelo.' },
    { nombre: 'Prensa 45 grados', tipo: 'AUXILIAR', grupo: 'B2',
      carga: 'Moderado-alto. Rango completo sin despegar la cadera.',
      rir, sets: sA, reps: 12, rpe: cap(rpe, 8), rest: 2,
      nota: 'Pies al ancho de hombros. No bloquear rodillas arriba.' },
    { nombre: 'Good morning SQ', tipo: 'AUXILIAR', grupo: 'C1',
      carga: 'Muy ligero. 20-30% del 1RM de SQ (~20-30 kg).',
      rir: 'RIR 3', sets: 3, reps: 10, rpe: cap(rpe, 7), rest: 2,
      nota: 'Cadera hacia atrás. Espalda neutra. Fortalece erectores.' },
    { nombre: 'Ab wheel rueda abdominal', tipo: 'COMPENSATORIO', grupo: 'C2',
      carga: 'Peso corporal. Sem1-2: de rodillas.',
      rir: '-', sets: 3, reps: 6, rpe: c, rest: 1,
      nota: 'Core anti-extensión. No hiperextender lumbar. +2 reps en sem3.' },
    { nombre: 'Jalon agarre neutro', tipo: 'AUXILIAR', grupo: 'D1',
      carga: 'Moderado. Retracción escapular al fondo.',
      rir: 'RIR 3', sets: 3, reps: 12, rpe: cap(rpe, 7.5), rest: 2,
      nota: 'Codo junto al cuerpo. Deprime la escápula al inicio.' },
  ];

  return [];
}

function cuid() {
  const ts = Date.now().toString(36);
  const rand = () => Math.random().toString(36).substring(2, 9);
  return `c${ts}${rand()}${rand()}`;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Actualizando perfil de Frank...');
    await client.query(`
      UPDATE "AthleteProfile"
      SET "rmSquat"=101, "rmBench"=75, "rmDeadlift"=107,
          "sqMev"=10, "sqMav"=16, "sqMrv"=22,
          "bpMev"=10, "bpMav"=14, "bpMrv"=18,
          "dlMev"=6,  "dlMav"=10, "dlMrv"=14,
          "updatedAt"=NOW()
      WHERE id=$1
    `, [ATHLETE_ID]);

    console.log('Creando periodización...');
    const periId = cuid();
    const inicio = new Date('2026-05-11T12:00:00.000Z');
    const fin    = new Date('2026-06-21T12:00:00.000Z');

    await client.query(`
      INSERT INTO "Periodizacion"
        (id, "coachId", "athleteId", nombre, tipo, "fechaInicio", "fechaFin",
         "duracionSemanas", objetivo, estado, "createdAt", "updatedAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
    `, [periId, COACH_ID, ATHLETE_ID,
        'Hipertrofia 2 — Frank', 'LINEAL', inicio, fin, 6,
        'Construcción de base hipertrófica. Off-season. MEV → MAV en los 3 levantamientos.',
        'ACTIVE']);

    const bloqueId = cuid();
    await client.query(`
      INSERT INTO "BloqueEntrenamiento"
        (id, "periodizacionId", "numeroBloque", nombre, "semanaInicio", "semanaFin",
         enfasis, "intensidadRpeMin", "intensidadRpeMax", "createdAt")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    `, [bloqueId, periId, 1, 'H2 — Base Hipertrófica', 1, 6, 'Hipertrofia', 6, 8.5]);

    let totalSesiones = 0, totalEj = 0;

    for (const sem of SEMANAS) {
      for (const dia of DIAS) {
        const fecha = new Date(inicio);
        fecha.setDate(fecha.getDate() + (sem.num - 1) * 7 + dia.offset);

        const sesId = cuid();
        await client.query(`
          INSERT INTO "SesionEntrenamiento"
            (id, "bloqueId", "numeroSemana", "diaSemana", fecha,
             "movimientoPrincipal", "enfocuoDia", "ordenSecuencia", "createdAt")
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
        `, [sesId, bloqueId, sem.num, dia.dia, fecha,
            dia.mov, dia.enfoque, dia.offset + 1]);

        const ejercicios = getEjercicios(dia.dia, sem.rpe, sem.rir, sem.sM, sem.sA);
        for (let i = 0; i < ejercicios.length; i++) {
          const ej = ejercicios[i];
          await client.query(`
            INSERT INTO "EjercicioSesion"
              (id, "sesionId", "ejercicioNombre", "tipoEjercicio", "ordenGrupo",
               "cargaRef", "rirLabel", "setsProgramados", "repsProgramadas",
               "rpeProgramado", "restMinutos", "notasTecnicas", orden, "createdAt")
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
          `, [cuid(), sesId, ej.nombre, ej.tipo, ej.grupo,
              ej.carga, ej.rir, ej.sets, ej.reps,
              ej.rpe, ej.rest, ej.nota ?? null, i + 1]);
          totalEj++;
        }
        totalSesiones++;
      }
    }

    await client.query('COMMIT');
    console.log(`✓ ${totalSesiones} sesiones creadas`);
    console.log(`✓ ${totalEj} ejercicios programados`);
    console.log('  — Incluye: calentamiento articular + aproximaciones + AUXILIAR/COMPENSATORIO');
    console.log('\nBloque H2 de Frank listo.');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
