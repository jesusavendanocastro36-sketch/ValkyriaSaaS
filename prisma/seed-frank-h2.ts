import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ATHLETE_ID = 'cmodn0hbc0005xni1rxkrnclr';
const COACH_ID   = 'cmodn0h880001xni17r7vz59f';

type Tipo = 'COMPETITIVO' | 'VARIANTE' | 'ACCESORIO' | 'MOVILIDAD';

interface EjData {
  ejercicioNombre: string;
  tipoEjercicio: Tipo;
  ordenGrupo?: string;
  cargaRef?: string;
  rirLabel?: string;
  setsProgramados: number;
  repsProgramadas: number;
  rpeProgramado: number;
  restMinutos?: number;
  notasTecnicas?: string;
}

// ── Progresión semanal ──────────────────────────────────────────────────────
const SEMANAS = [
  { num: 1, rpe: 6.0, rir: 'RIR 4',   sM: 3, sA: 3 },
  { num: 2, rpe: 6.5, rir: 'RIR 3-4', sM: 3, sA: 3 },
  { num: 3, rpe: 7.0, rir: 'RIR 3',   sM: 4, sA: 3 },
  { num: 4, rpe: 7.5, rir: 'RIR 2-3', sM: 4, sA: 4 },
  { num: 5, rpe: 8.0, rir: 'RIR 2',   sM: 4, sA: 4 },
  { num: 6, rpe: 8.5, rir: 'RIR 1-2', sM: 4, sA: 4 },
];

const DIAS = [
  { dia: 'Lunes',      mov: 'Sentadilla',   enfoque: 'Cuadríceps dominante',              offset: 0 },
  { dia: 'Martes',     mov: 'Banca',        enfoque: 'Press horizontal + Tríceps + Bíceps', offset: 1 },
  { dia: 'Miércoles',  mov: 'Peso Muerto',  enfoque: 'Cadena posterior',                  offset: 2 },
  { dia: 'Jueves',     mov: 'Banca B',      enfoque: 'Upper — Inclinado + Espalda + Bíceps', offset: 3 },
  { dia: 'Viernes',    mov: 'Sentadilla B', enfoque: 'Glúteo y posterior inferior',        offset: 4 },
];

// ── Ejercicios por día ──────────────────────────────────────────────────────
function getEjercicios(dia: string, rpe: number, rir: string, sM: number, sA: number): EjData[] {
  const c = 6.0; // compensatorio siempre ligero

  if (dia === 'Lunes') return [
    {
      ejercicioNombre: 'Sentadilla barra baja',
      tipoEjercicio: 'COMPETITIVO', ordenGrupo: 'A1',
      cargaRef: '62-72% del 1RM (~101 kg). Sem1: ~62 kg. +2.5 kg si RIR real > objetivo.',
      rirLabel: rir, setsProgramados: sM, repsProgramadas: 8,
      rpeProgramado: rpe, restMinutos: 4,
      notasTecnicas: 'Foco en posición y profundidad. No sacrifiques técnica por peso.',
    },
    {
      ejercicioNombre: 'Sentadilla con pausa en el hoyo',
      tipoEjercicio: 'VARIANTE', ordenGrupo: 'A2',
      cargaRef: '80-85% del peso del básico del día. Pausa 2 seg completa.',
      rirLabel: rir, setsProgramados: 3, repsProgramadas: 5,
      rpeProgramado: Math.max(6, rpe - 0.5), restMinutos: 3,
      notasTecnicas: 'Sin rebotar. Mantén tensión en el hoyo.',
    },
    {
      ejercicioNombre: 'Hack squat en maquina',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'B1',
      cargaRef: 'Moderado. Progresión +5-10 kg/sem.',
      rirLabel: rir, setsProgramados: sA, repsProgramadas: 12,
      rpeProgramado: Math.min(rpe, 8), restMinutos: 2,
      notasTecnicas: 'Rango completo. Rodillas no colapsen.',
    },
    {
      ejercicioNombre: 'Extension de cuadriceps',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'B2',
      cargaRef: 'Ligero. Contracción 1 seg arriba.',
      rirLabel: 'RIR 3', setsProgramados: 3, repsProgramadas: 15,
      rpeProgramado: Math.min(rpe, 7.5), restMinutos: 1,
    },
    {
      ejercicioNombre: 'Copenhagen isometrico',
      tipoEjercicio: 'MOVILIDAD', ordenGrupo: 'C1',
      cargaRef: 'Peso corporal.',
      rirLabel: '-', setsProgramados: 3, repsProgramadas: 3,
      rpeProgramado: c, restMinutos: 1,
      notasTecnicas: '×20 seg por lado. Progresa a 30 seg en sem4.',
    },
  ];

  if (dia === 'Martes') return [
    {
      ejercicioNombre: 'Banca con pausa 2-3ct',
      tipoEjercicio: 'COMPETITIVO', ordenGrupo: 'A1',
      cargaRef: '65-75% del 1RM estimado (~75 kg). Sem1: ~50 kg. Pausa de competición.',
      rirLabel: rir, setsProgramados: sM, repsProgramadas: 7,
      rpeProgramado: rpe, restMinutos: 4,
      notasTecnicas: 'Pausa en el pecho. Leg drive activo. No rebotar.',
    },
    {
      ejercicioNombre: 'Spoto press',
      tipoEjercicio: 'VARIANTE', ordenGrupo: 'A2',
      cargaRef: '5-10% menos que la banca del día. Sin toque al pecho.',
      rirLabel: rir, setsProgramados: 3, repsProgramadas: 8,
      rpeProgramado: Math.max(6, rpe - 0.5), restMinutos: 3,
      notasTecnicas: 'Detener barra 2-3 cm sobre el pecho. Excéntrica controlada.',
    },
    {
      ejercicioNombre: 'Press agarre cerrado',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'B1',
      cargaRef: '65-70% del 1RM de BP (~46-50 kg). Codos cerca del cuerpo.',
      rirLabel: rir, setsProgramados: sA, repsProgramadas: 10,
      rpeProgramado: Math.min(rpe, 8), restMinutos: 2,
    },
    {
      ejercicioNombre: 'Extensiones triceps en polea',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'B2',
      cargaRef: 'Ligero. Contracción completa al fondo.',
      rirLabel: 'RIR 3', setsProgramados: 3, repsProgramadas: 15,
      rpeProgramado: Math.min(rpe, 7.5), restMinutos: 1,
    },
    {
      ejercicioNombre: 'Face pull en polea alta',
      tipoEjercicio: 'MOVILIDAD', ordenGrupo: 'C1',
      cargaRef: 'Muy ligero. 15-25 kg máximo.',
      rirLabel: '-', setsProgramados: 3, repsProgramadas: 20,
      rpeProgramado: c, restMinutos: 1,
      notasTecnicas: 'Rotación externa al final. Codos a la altura de hombros.',
    },
    {
      ejercicioNombre: 'Elevaciones laterales con mancuerna',
      tipoEjercicio: 'MOVILIDAD', ordenGrupo: 'C2',
      cargaRef: '5-8 kg. Foco en el arco lateral.',
      rirLabel: '-', setsProgramados: 3, repsProgramadas: 20,
      rpeProgramado: c, restMinutos: 1,
      notasTecnicas: 'No balancear. Subir lento, bajar más lento.',
    },
    {
      ejercicioNombre: 'Curl martillo alternado',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'D1',
      cargaRef: 'Moderado. Sin balanceo del cuerpo.',
      rirLabel: 'RIR 3', setsProgramados: 3, repsProgramadas: 12,
      rpeProgramado: Math.min(rpe, 7.5), restMinutos: 1,
      notasTecnicas: '×12 por lado. Agarre neutro. Activa braquial.',
    },
    {
      ejercicioNombre: 'Curl predicador barra Z',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'D2',
      cargaRef: 'Ligero-moderado. Codo fijo en el predicador.',
      rirLabel: 'RIR 3', setsProgramados: 3, repsProgramadas: 12,
      rpeProgramado: Math.min(rpe, 7.5), restMinutos: 1,
      notasTecnicas: 'Cabeza corta. Extensión completa abajo. Sin momentum.',
    },
  ];

  if (dia === 'Miércoles') return [
    {
      ejercicioNombre: 'Peso muerto convencional',
      tipoEjercicio: 'COMPETITIVO', ordenGrupo: 'A1',
      cargaRef: '68-78% del 1RM estimado (107 kg). Sem1: ~72 kg. +2.5 kg si RIR real ≥ objetivo +1.',
      rirLabel: rir, setsProgramados: sM, repsProgramadas: 5,
      rpeProgramado: rpe, restMinutos: 4,
      notasTecnicas: 'Empujar el suelo, no jalar la barra. Espalda neutra todo el recorrido.',
    },
    {
      ejercicioNombre: 'RDL Peso Muerto Rumano',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'B1',
      cargaRef: 'Sem1: ~80 kg (base del bloque anterior). Progresión por RIR.',
      rirLabel: rir, setsProgramados: sA, repsProgramadas: 10,
      rpeProgramado: Math.min(rpe, 8), restMinutos: 3,
      notasTecnicas: 'Prioridad al estiramiento de isquiotibiales. Cadera hacia atrás.',
    },
    {
      ejercicioNombre: 'Hip thrust pesado',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'B2',
      cargaRef: 'Sem1: ~80-90 kg. Progresión +5 kg/sem.',
      rirLabel: rir, setsProgramados: 4, repsProgramadas: 10,
      rpeProgramado: Math.min(rpe, 8), restMinutos: 2,
      notasTecnicas: 'Contracción del glúteo en el pico. No hiperextender lumbar.',
    },
    {
      ejercicioNombre: 'Curl femoral tumbado',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'C1',
      cargaRef: 'Ligero-moderado. Excéntrica 3 seg.',
      rirLabel: 'RIR 3', setsProgramados: 3, repsProgramadas: 12,
      rpeProgramado: Math.min(rpe, 7.5), restMinutos: 1,
      notasTecnicas: 'Bajada en 3 segundos. No rebotar al fondo.',
    },
    {
      ejercicioNombre: 'Extension de espalda',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'C2',
      cargaRef: 'Peso corporal sem1-2. Plato 10 kg en el pecho sem3+.',
      rirLabel: 'RIR 3', setsProgramados: 3, repsProgramadas: 12,
      rpeProgramado: Math.min(rpe, 7), restMinutos: 1,
      notasTecnicas: 'Espalda neutra. Foco en erectores. No hiperextender.',
    },
    {
      ejercicioNombre: 'Plancha lateral con elevacion',
      tipoEjercicio: 'MOVILIDAD', ordenGrupo: 'D1',
      cargaRef: 'Peso corporal.',
      rirLabel: '-', setsProgramados: 3, repsProgramadas: 3,
      rpeProgramado: c, restMinutos: 1,
      notasTecnicas: '×25 seg por lado. Progresa a 35 seg en sem4.',
    },
  ];

  if (dia === 'Jueves') return [
    {
      ejercicioNombre: 'Banca inclinada con barra',
      tipoEjercicio: 'VARIANTE', ordenGrupo: 'A1',
      cargaRef: '15-20% menos que la banca plana. Sem1: ~42-45 kg.',
      rirLabel: rir, setsProgramados: sM, repsProgramadas: 10,
      rpeProgramado: rpe, restMinutos: 3,
      notasTecnicas: 'Ángulo 30-45°. Codos a 60° del cuerpo. Toca el pecho superior.',
    },
    {
      ejercicioNombre: 'Larsen press',
      tipoEjercicio: 'VARIANTE', ordenGrupo: 'A2',
      cargaRef: '15-20% menos que el básico. Piernas extendidas.',
      rirLabel: rir, setsProgramados: 3, repsProgramadas: 10,
      rpeProgramado: Math.max(6, rpe - 0.5), restMinutos: 3,
      notasTecnicas: 'Sin apoyo de piernas. Activa el core. Foco en pectoral.',
    },
    {
      ejercicioNombre: 'JM Press',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'B1',
      cargaRef: '30-40% del 1RM de BP. Aprende con barra sola primero.',
      rirLabel: rir, setsProgramados: sA, repsProgramadas: 8,
      rpeProgramado: Math.min(rpe, 8), restMinutos: 2,
      notasTecnicas: 'Híbrido banca-press francés. Codo cerca. Excéntrica controlada.',
    },
    {
      ejercicioNombre: 'Tate press',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'B2',
      cargaRef: 'Muy ligero. 5-10 kg por lado.',
      rirLabel: 'RIR 3', setsProgramados: 3, repsProgramadas: 15,
      rpeProgramado: Math.min(rpe, 7), restMinutos: 1,
      notasTecnicas: 'Codos hacia afuera. Cabeza lateral del tríceps.',
    },
    {
      ejercicioNombre: 'Pajaro con mancuerna',
      tipoEjercicio: 'MOVILIDAD', ordenGrupo: 'C1',
      cargaRef: 'Muy ligero. 5-12 kg.',
      rirLabel: '-', setsProgramados: 3, repsProgramadas: 15,
      rpeProgramado: c, restMinutos: 1,
      notasTecnicas: 'Deltoides posterior y manguito. Codo ligeramente flexionado.',
    },
    {
      ejercicioNombre: 'Remo Pendlay',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'C2',
      cargaRef: '50-60% del 1RM de DL (~54-64 kg). Explosivo en la subida.',
      rirLabel: rir, setsProgramados: sA, repsProgramadas: 8,
      rpeProgramado: Math.min(rpe, 8), restMinutos: 2,
      notasTecnicas: 'Barra desde el suelo en cada rep. Torso paralelo. Explosivo.',
    },
    {
      ejercicioNombre: 'Elevaciones laterales con mancuerna',
      tipoEjercicio: 'MOVILIDAD', ordenGrupo: 'C3',
      cargaRef: '5-8 kg. Segunda sesión semanal.',
      rirLabel: '-', setsProgramados: 3, repsProgramadas: 20,
      rpeProgramado: c, restMinutos: 1,
      notasTecnicas: 'Misma técnica que el martes.',
    },
    {
      ejercicioNombre: 'Curl inclinado con mancuerna',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'D1',
      cargaRef: 'Ligero-moderado. El estiramiento es lo que importa.',
      rirLabel: 'RIR 3', setsProgramados: 3, repsProgramadas: 10,
      rpeProgramado: Math.min(rpe, 7.5), restMinutos: 1,
      notasTecnicas: 'Banco 45°. Cabeza larga del bíceps. Extensión completa abajo.',
    },
  ];

  if (dia === 'Viernes') return [
    {
      ejercicioNombre: 'Sentadilla barra alta',
      tipoEjercicio: 'VARIANTE', ordenGrupo: 'A1',
      cargaRef: '70-80% del peso del básico (lunes). Sem1: ~44-50 kg.',
      rirLabel: rir, setsProgramados: sM, repsProgramadas: 8,
      rpeProgramado: rpe, restMinutos: 3,
      notasTecnicas: 'Mayor ROM que barra baja. Torso vertical. Rodillas adelante.',
    },
    {
      ejercicioNombre: 'Sentadilla bulgara',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'B1',
      cargaRef: 'Mancuernas livianas. Foco en estabilidad y rango.',
      rirLabel: rir, setsProgramados: 3, repsProgramadas: 10,
      rpeProgramado: Math.min(rpe, 7.5), restMinutos: 2,
      notasTecnicas: '×10 por pierna. Rodilla trasera cerca del suelo.',
    },
    {
      ejercicioNombre: 'Prensa 45 grados',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'B2',
      cargaRef: 'Moderado-alto. Rango completo sin despegar la cadera.',
      rirLabel: rir, setsProgramados: sA, repsProgramadas: 12,
      rpeProgramado: Math.min(rpe, 8), restMinutos: 2,
      notasTecnicas: 'Pies al ancho de hombros. No bloquear rodillas arriba.',
    },
    {
      ejercicioNombre: 'Good morning SQ',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'C1',
      cargaRef: 'Muy ligero. 20-30% del 1RM de SQ (~20-30 kg).',
      rirLabel: 'RIR 3', setsProgramados: 3, repsProgramadas: 10,
      rpeProgramado: Math.min(rpe, 7), restMinutos: 2,
      notasTecnicas: 'Cadera hacia atrás. Espalda neutra. Fortalece erectores.',
    },
    {
      ejercicioNombre: 'Ab wheel rueda abdominal',
      tipoEjercicio: 'MOVILIDAD', ordenGrupo: 'C2',
      cargaRef: 'Peso corporal. Sem1-2: de rodillas.',
      rirLabel: '-', setsProgramados: 3, repsProgramadas: 6,
      rpeProgramado: c, restMinutos: 1,
      notasTecnicas: 'Core anti-extensión. No hiperextender lumbar. +2 reps en sem3.',
    },
    {
      ejercicioNombre: 'Jalon agarre neutro',
      tipoEjercicio: 'ACCESORIO', ordenGrupo: 'D1',
      cargaRef: 'Moderado. Retracción escapular al fondo.',
      rirLabel: 'RIR 3', setsProgramados: 3, repsProgramadas: 12,
      rpeProgramado: Math.min(rpe, 7.5), restMinutos: 2,
      notasTecnicas: 'Codo junto al cuerpo. Deprime la escápula al inicio.',
    },
  ];

  return [];
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('Actualizando perfil de Frank...');
  await prisma.athleteProfile.update({
    where: { id: ATHLETE_ID },
    data: {
      rmSquat: 101, rmBench: 75, rmDeadlift: 107,
      sqMev: 10, sqMav: 16, sqMrv: 22,
      bpMev: 10, bpMav: 14, bpMrv: 18,
      dlMev: 6,  dlMav: 10, dlMrv: 14,
    },
  });

  console.log('Creando periodización...');
  const inicio = new Date('2026-05-11T00:00:00.000Z');
  const fin    = new Date('2026-06-21T00:00:00.000Z');

  const peri = await prisma.periodizacion.create({
    data: {
      coachId: COACH_ID,
      athleteId: ATHLETE_ID,
      nombre: 'Hipertrofia 2 — Frank',
      tipo: 'LINEAL',
      fechaInicio: inicio,
      fechaFin: fin,
      duracionSemanas: 6,
      objetivo: 'Construcción de base hipertrófica. Off-season. MEV → MAV en los 3 levantamientos.',
      estado: 'ACTIVE',
    },
  });
  console.log('Periodización:', peri.id);

  const bloque = await prisma.bloqueEntrenamiento.create({
    data: {
      periodizacionId: peri.id,
      numeroBloque: 1,
      nombre: 'H2 — Base Hipertrófica',
      semanaInicio: 1,
      semanaFin: 6,
      enfasis: 'Hipertrofia',
      intensidadRpeMin: 6,
      intensidadRpeMax: 8.5,
    },
  });
  console.log('Bloque:', bloque.id);

  let totalSesiones = 0;
  let totalEjercicios = 0;

  for (const sem of SEMANAS) {
    for (const dia of DIAS) {
      const fecha = new Date(inicio);
      fecha.setDate(fecha.getDate() + (sem.num - 1) * 7 + dia.offset);

      const sesion = await prisma.sesionEntrenamiento.create({
        data: {
          bloqueId: bloque.id,
          numeroSemana: sem.num,
          diaSemana: dia.dia,
          fecha,
          movimientoPrincipal: dia.mov,
          enfocuoDia: dia.enfoque,
          ordenSecuencia: dia.offset + 1,
        },
      });

      const ejercicios = getEjercicios(dia.dia, sem.rpe, sem.rir, sem.sM, sem.sA);
      for (let i = 0; i < ejercicios.length; i++) {
        await prisma.ejercicioSesion.create({
          data: { sesionId: sesion.id, orden: i + 1, ...ejercicios[i] },
        });
      }

      totalSesiones++;
      totalEjercicios += ejercicios.length;
    }
  }

  console.log(`✓ ${totalSesiones} sesiones creadas`);
  console.log(`✓ ${totalEjercicios} ejercicios programados`);
  console.log('Bloque H2 de Frank listo.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
