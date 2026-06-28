import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter } as any);

// ── 1RMs de Andree (PDF 2026-06) ────────────────────────────────────────────
const SQ_RM = 150, BP_RM = 90, DL_RM = 175;

const r = (kg: number) => Math.round(kg / 2.5) * 2.5;
const clamp = (v: number) => Math.min(Math.max(v, 6.0), 10.0);

// Cargas exactas por semana del PDF: [kg, sets, reps, rpe]
const SQ_W: [number, number, number, number][] = [
  [105,   4, 6, 6.5],  // S1  Onda 1
  [107.5, 5, 6, 7.0],  // S2
  [112.5, 5, 5, 7.5],  // S3
  [100,   3, 6, 6.5],  // S4  Puente
  [112.5, 5, 5, 7.5],  // S5  Onda 2
  [120,   6, 4, 8.0],  // S6
  [122.5, 6, 4, 8.0],  // S7
  [105,   3, 4, 6.0],  // S8  Descarga
];

const BP_W: [number, number, number, number][] = [
  [62.5, 4, 6, 6.5],
  [65,   5, 6, 7.0],
  [67.5, 5, 5, 7.5],
  [60,   3, 6, 6.5],
  [67.5, 5, 5, 7.5],
  [72.5, 6, 4, 8.0],
  [75,   6, 4, 8.0],
  [62.5, 3, 4, 6.0],
];

const DL_W: [number, number, number, number][] = [
  [122.5, 3, 5, 6.5],
  [127.5, 4, 5, 7.0],
  [130,   4, 5, 7.5],
  [117.5, 2, 5, 6.5],
  [130,   4, 4, 7.5],
  [140,   4, 4, 8.0],
  [145,   4, 3, 8.0],
  [122.5, 2, 3, 6.0],
];

type Tipo = 'COMPETITIVO' | 'VARIANTE' | 'AUXILIAR' | 'COMPENSATORIO' | 'MOVILIDAD';

interface Ej {
  ejercicioNombre: string;
  tipoEjercicio: Tipo;
  ordenGrupo: string;
  cargaRef: string;
  rirLabel: string;
  setsProgramados: number;
  repsProgramadas: number;
  rpeProgramado: number;
  pesoProgramado?: number;
  restMinutos: number;
  notasTecnicas: string;
}

function getEjercicios(dia: string, semana: number): Ej[] {
  const [sqKg, sqSets, sqReps, sqRpe] = SQ_W[semana - 1];
  const [bpKg, bpSets, bpReps, bpRpe] = BP_W[semana - 1];
  const [dlKg, dlSets, dlReps, dlRpe] = DL_W[semana - 1];

  const rirSq = `RIR ${Math.round(10 - sqRpe)}`;
  const rirBp = `RIR ${Math.round(10 - bpRpe)}`;
  const rirDl = `RIR ${Math.round(10 - dlRpe)}`;

  if (dia === 'lunes') {
    const bp2Kg = r(bpKg * 0.88);
    return [
      {
        ejercicioNombre: 'Sentadilla Barra Baja',
        tipoEjercicio: 'COMPETITIVO', ordenGrupo: 'A1',
        cargaRef: `${sqKg} kg (${Math.round(sqKg / SQ_RM * 100)}% 1RM)`,
        rirLabel: rirSq,
        setsProgramados: sqSets, repsProgramadas: sqReps, rpeProgramado: sqRpe,
        pesoProgramado: sqKg, restMinutos: 4,
        notasTecnicas: 'Barra baja. Profundidad competitiva. Control excéntrico 3 seg. Rodillas hacia los pies.',
      },
      {
        ejercicioNombre: 'Press de Banca (2da Exposición)',
        tipoEjercicio: 'VARIANTE', ordenGrupo: 'B1',
        cargaRef: `${bp2Kg} kg (~88% del día de banca)`,
        rirLabel: rirBp,
        setsProgramados: 3, repsProgramadas: 5, rpeProgramado: clamp(bpRpe - 0.5),
        pesoProgramado: bp2Kg, restMinutos: 3,
        notasTecnicas: 'Segunda exposición técnica. Misma mecánica que banca principal. Leg drive activo.',
      },
      {
        ejercicioNombre: 'Prensa de Piernas',
        tipoEjercicio: 'AUXILIAR', ordenGrupo: 'C1',
        cargaRef: 'Moderado-alto. Progresión por sensación.',
        rirLabel: 'RIR 3',
        setsProgramados: 3, repsProgramadas: 12, rpeProgramado: 7.0,
        restMinutos: 2,
        notasTecnicas: 'Rango completo. No bloquear rodillas. Pies al ancho de caderas.',
      },
      {
        ejercicioNombre: 'Curl Femoral Tumbado',
        tipoEjercicio: 'COMPENSATORIO', ordenGrupo: 'D1',
        cargaRef: 'Ligero. Control total.',
        rirLabel: 'RIR 3',
        setsProgramados: 3, repsProgramadas: 12, rpeProgramado: 6.5,
        restMinutos: 1,
        notasTecnicas: 'Control total. Sin rebote. Contracción isquiotibial máxima al tope.',
      },
      {
        ejercicioNombre: 'Plancha Frontal',
        tipoEjercicio: 'MOVILIDAD', ordenGrupo: 'E1',
        cargaRef: 'Peso corporal. 30→45 seg.',
        rirLabel: '-',
        setsProgramados: 3, repsProgramadas: 1, rpeProgramado: 6.0,
        restMinutos: 1,
        notasTecnicas: 'Anti-extensión lumbar. Glúteos activos. Progresa 30→45→60 seg.',
      },
    ];
  }

  if (dia === 'martes') {
    const rackKg = r(dlKg * 0.95);
    const rdlKg  = r(dlKg * 0.74);
    return [
      {
        ejercicioNombre: 'Peso Muerto Sumo',
        tipoEjercicio: 'COMPETITIVO', ordenGrupo: 'A1',
        cargaRef: `${dlKg} kg (${Math.round(dlKg / DL_RM * 100)}% 1RM)`,
        rirLabel: rirDl,
        setsProgramados: dlSets, repsProgramadas: dlReps, rpeProgramado: dlRpe,
        pesoProgramado: dlKg, restMinutos: 4,
        notasTecnicas: 'Postura sumo. Pies abiertos 45°. Caderas cerca de la barra. Empuja el suelo.',
      },
      {
        ejercicioNombre: 'Rack Pull desde Rodillas',
        tipoEjercicio: 'VARIANTE', ordenGrupo: 'B1',
        cargaRef: `${rackKg} kg (~95% del sumo, ROM reducido)`,
        rirLabel: rirDl,
        setsProgramados: 3, repsProgramadas: 3, rpeProgramado: clamp(dlRpe - 0.5),
        pesoProgramado: rackKg, restMinutos: 3,
        notasTecnicas: 'Cajón a altura de rodilla. Refuerza el lockout. Mantener espalda neutral.',
      },
      {
        ejercicioNombre: 'Peso Muerto Rumano (RDL)',
        tipoEjercicio: 'AUXILIAR', ordenGrupo: 'C1',
        cargaRef: `${rdlKg} kg (~74% del sumo)`,
        rirLabel: 'RIR 3',
        setsProgramados: 3, repsProgramadas: 6, rpeProgramado: clamp(dlRpe - 0.5),
        pesoProgramado: rdlKg, restMinutos: 3,
        notasTecnicas: 'Bisagra de cadera. Estiramiento isquiotibial. Barra pegada al cuerpo.',
      },
      {
        ejercicioNombre: 'Remo con Barra Pronado',
        tipoEjercicio: 'AUXILIAR', ordenGrupo: 'D1',
        cargaRef: 'Moderado. Torso a 45°.',
        rirLabel: 'RIR 3',
        setsProgramados: 3, repsProgramadas: 10, rpeProgramado: 7.0,
        restMinutos: 2,
        notasTecnicas: 'Codos a 45°. Retracción escapular al final. Control excéntrico.',
      },
      {
        ejercicioNombre: 'Hollow Body Hold',
        tipoEjercicio: 'MOVILIDAD', ordenGrupo: 'E1',
        cargaRef: 'Peso corporal. 20→40 seg.',
        rirLabel: '-',
        setsProgramados: 3, repsProgramadas: 1, rpeProgramado: 6.0,
        restMinutos: 1,
        notasTecnicas: 'Lumbar pegada al suelo. Core anterior activo. Progresa 20→30→40 seg.',
      },
    ];
  }

  if (dia === 'miercoles') {
    const closeKg = r(bpKg * 0.82);
    const inclKg  = r(bpKg * 0.86);
    return [
      {
        ejercicioNombre: 'Press de Banca',
        tipoEjercicio: 'COMPETITIVO', ordenGrupo: 'A1',
        cargaRef: `${bpKg} kg (${Math.round(bpKg / BP_RM * 100)}% 1RM)`,
        rirLabel: rirBp,
        setsProgramados: bpSets, repsProgramadas: bpReps, rpeProgramado: bpRpe,
        pesoProgramado: bpKg, restMinutos: 3,
        notasTecnicas: 'Arco moderado. Leg drive activo. Descenso controlado al pecho. Codos 45-60°.',
      },
      {
        ejercicioNombre: 'Press Agarre Cerrado',
        tipoEjercicio: 'VARIANTE', ordenGrupo: 'B1',
        cargaRef: `${closeKg} kg (~82% del banca)`,
        rirLabel: rirBp,
        setsProgramados: 3, repsProgramadas: 6, rpeProgramado: clamp(bpRpe - 0.5),
        pesoProgramado: closeKg, restMinutos: 3,
        notasTecnicas: 'Agarre a ancho de hombros. Tríceps dominante. Codos pegados al torso.',
      },
      {
        ejercicioNombre: 'Press Inclinado con Barra',
        tipoEjercicio: 'VARIANTE', ordenGrupo: 'B2',
        cargaRef: `${inclKg} kg (~86% del banca)`,
        rirLabel: 'RIR 3',
        setsProgramados: 3, repsProgramadas: 8, rpeProgramado: clamp(bpRpe - 0.5),
        pesoProgramado: inclKg, restMinutos: 2,
        notasTecnicas: '30° inclinación. Pectoral superior. Misma mecánica que banca plana.',
      },
      {
        ejercicioNombre: 'Remo con Mancuerna',
        tipoEjercicio: 'AUXILIAR', ordenGrupo: 'C1',
        cargaRef: 'Moderado. Espalda como eje.',
        rirLabel: 'RIR 3',
        setsProgramados: 3, repsProgramadas: 10, rpeProgramado: 7.0,
        restMinutos: 2,
        notasTecnicas: 'Codo alto. Contracción dorsal en la cima. Control excéntrico lento.',
      },
      {
        ejercicioNombre: 'Face Pulls con Cuerda',
        tipoEjercicio: 'COMPENSATORIO', ordenGrupo: 'D1',
        cargaRef: '15-25 kg. Muy ligero.',
        rirLabel: '-',
        setsProgramados: 3, repsProgramadas: 20, rpeProgramado: 6.0,
        restMinutos: 1,
        notasTecnicas: 'Rotación externa al final. Codos a altura de hombros. Salud del manguito rotador.',
      },
    ];
  }

  if (dia === 'jueves') {
    const pauseSqKg = r(sqKg * 0.82);
    const bp3Kg     = r(bpKg * 0.74);
    const hipKg     = r(Math.min(100 + (semana - 1) * 5, 140));
    return [
      {
        ejercicioNombre: 'Sentadilla con Pausa (2 seg)',
        tipoEjercicio: 'VARIANTE', ordenGrupo: 'A1',
        cargaRef: `${pauseSqKg} kg (~82% del sentadilla principal)`,
        rirLabel: 'RIR 3',
        setsProgramados: 3, repsProgramadas: Math.max(sqReps - 2, 3),
        rpeProgramado: clamp(sqRpe - 0.5),
        pesoProgramado: pauseSqKg, restMinutos: 3,
        notasTecnicas: 'Pausa 2 seg completa en paralelo. Sin rebotar. Tensión torácica y lumbar.',
      },
      {
        ejercicioNombre: 'Sentadilla Búlgara',
        tipoEjercicio: 'AUXILIAR', ordenGrupo: 'B1',
        cargaRef: 'Moderado. RPE 7. Por sensación.',
        rirLabel: 'RIR 3',
        setsProgramados: 3, repsProgramadas: 8, rpeProgramado: 7.0,
        restMinutos: 2,
        notasTecnicas: 'Pie trasero en banco. Rodilla delantera alineada. Cuádriceps dominante. ×lado.',
      },
      {
        ejercicioNombre: 'Press de Banca (3ra Exposición)',
        tipoEjercicio: 'VARIANTE', ordenGrupo: 'C1',
        cargaRef: `${bp3Kg} kg (~74% del banca principal)`,
        rirLabel: 'RIR 4',
        setsProgramados: 3, repsProgramadas: 5, rpeProgramado: clamp(bpRpe - 1.0),
        pesoProgramado: bp3Kg, restMinutos: 2,
        notasTecnicas: 'Tercera exposición técnica a la semana. Ligero y controlado. Sin fatiga acumulada.',
      },
      {
        ejercicioNombre: 'Hip Thrust con Barra',
        tipoEjercicio: 'AUXILIAR', ordenGrupo: 'D1',
        cargaRef: `${hipKg} kg.`,
        rirLabel: 'RIR 3',
        setsProgramados: 3, repsProgramadas: 10, rpeProgramado: 7.0,
        pesoProgramado: hipKg, restMinutos: 2,
        notasTecnicas: 'Contracción glútea máxima en la cima. No hiperextender lumbar. Pies planos al suelo.',
      },
      {
        ejercicioNombre: 'Ab Wheel',
        tipoEjercicio: 'MOVILIDAD', ordenGrupo: 'E1',
        cargaRef: 'Peso corporal.',
        rirLabel: '-',
        setsProgramados: 3, repsProgramadas: 8, rpeProgramado: 6.0,
        restMinutos: 1,
        notasTecnicas: 'Anti-extensión. Sin arquear lumbar. +2 reps/semana. De rodillas → bípedo desde S5.',
      },
    ];
  }

  if (dia === 'viernes') {
    const bandedKg = r(dlKg * 0.52);
    const gmKg     = r(SQ_RM * 0.33);
    return [
      {
        ejercicioNombre: 'Peso Muerto Sumo con Banda',
        tipoEjercicio: 'VARIANTE', ordenGrupo: 'A1',
        cargaRef: `${bandedKg} kg + banda elástica`,
        rirLabel: 'RIR 3-4',
        setsProgramados: 5, repsProgramadas: 3, rpeProgramado: clamp(dlRpe - 0.5),
        pesoProgramado: bandedKg, restMinutos: 2,
        notasTecnicas: 'Trabajo de velocidad/potencia. Explosión máxima. Banda añade resistencia en lockout.',
      },
      {
        ejercicioNombre: 'Good Morning',
        tipoEjercicio: 'AUXILIAR', ordenGrupo: 'B1',
        cargaRef: `${gmKg} kg. Isquiotibiales y erectores.`,
        rirLabel: 'RIR 3',
        setsProgramados: 3, repsProgramadas: 8, rpeProgramado: 6.5,
        pesoProgramado: gmKg, restMinutos: 2,
        notasTecnicas: 'Bisagra de cadera. Sin redondear espalda. Estiramiento isquiotibial. Control total.',
      },
      {
        ejercicioNombre: 'Jalón al Pecho Agarre Neutro',
        tipoEjercicio: 'AUXILIAR', ordenGrupo: 'C1',
        cargaRef: 'Moderado. Sin balanceo.',
        rirLabel: 'RIR 3',
        setsProgramados: 3, repsProgramadas: 12, rpeProgramado: 7.0,
        restMinutos: 2,
        notasTecnicas: 'Tira codos hacia caderas. Deprime escápula al inicio. Extensión completa arriba.',
      },
      {
        ejercicioNombre: 'Pallof Press (Anti-rotación)',
        tipoEjercicio: 'MOVILIDAD', ordenGrupo: 'D1',
        cargaRef: 'Ligero. Ambos lados.',
        rirLabel: '-',
        setsProgramados: 3, repsProgramadas: 12, rpeProgramado: 6.0,
        restMinutos: 1,
        notasTecnicas: 'Resistir la rotación. Core antirrotacional. ×lado. Progresar resistencia semanalmente.',
      },
    ];
  }

  return [];
}

async function main() {
  console.log('Buscando perfiles...');
  const andreeUser = await prisma.user.findUnique({ where: { email: 'andree@valkyria.pe' } });
  if (!andreeUser) throw new Error('Andree no encontrado. Corre el seed principal primero.');
  const andree = await prisma.athleteProfile.findUnique({ where: { userId: andreeUser.id } });
  if (!andree) throw new Error('AthleteProfile de Andree no encontrado.');

  const coachUser = await prisma.user.findUnique({ where: { email: 'yisus@valkyria.pe' } });
  if (!coachUser) throw new Error('Coach Yisus no encontrado.');
  const coach = await prisma.coachProfile.findUnique({ where: { userId: coachUser.id } });
  if (!coach) throw new Error('CoachProfile de Yisus no encontrado.');

  await prisma.athleteProfile.update({
    where: { id: andree.id },
    data: { rmSquat: SQ_RM, rmBench: BP_RM, rmDeadlift: DL_RM },
  });
  console.log(`✓ 1RMs: SQ ${SQ_RM} | BP ${BP_RM} | DL ${DL_RM} kg`);

  await prisma.periodizacion.updateMany({
    where: { athleteId: andree.id, estado: 'ACTIVE' },
    data: { estado: 'COMPLETED' },
  });

  const fechaInicio = new Date('2026-06-02T00:00:00.000Z');
  const fechaFin    = new Date('2026-07-26T00:00:00.000Z');

  const peri = await prisma.periodizacion.create({
    data: {
      coachId: coach.id, athleteId: andree.id,
      nombre: 'Bloque de Volumen · Andree · Método RV',
      tipo: 'ONDULANTE',
      fechaInicio, fechaFin, duracionSemanas: 8,
      objetivo: `Acumulación progresiva MEV→MRV en Big 3. DUP 5 días/semana. 1RMs: SQ ${SQ_RM}/BP ${BP_RM}/DL ${DL_RM} kg.`,
      estado: 'ACTIVE',
    },
  });
  console.log(`✓ Periodización: ${peri.id}`);

  const BLOQUES_DEF = [
    { num: 1, nombre: 'Onda 1 — Acumulación',    si: 1, sf: 3, enfasis: 'Acumulación MEV→MAV. RPE 6.5–7.5.',    rpeMin: 6.5, rpeMax: 7.5 },
    { num: 2, nombre: 'Puente — Descarga Activa', si: 4, sf: 4, enfasis: 'Descarga activa. Volumen −40%.',       rpeMin: 6.0, rpeMax: 7.0 },
    { num: 3, nombre: 'Onda 2 — Intensificación', si: 5, sf: 7, enfasis: 'Segunda ola. MAV→MRV. RPE 7.5–8.5.',  rpeMin: 7.5, rpeMax: 8.5 },
    { num: 4, nombre: 'Descarga Final',            si: 8, sf: 8, enfasis: 'Descarga completa. RPE 5–7.',         rpeMin: 5.0, rpeMax: 7.0 },
  ];

  const bloques = [];
  for (const b of BLOQUES_DEF) {
    const bloque = await prisma.bloqueEntrenamiento.create({
      data: {
        periodizacionId: peri.id, numeroBloque: b.num, nombre: b.nombre,
        semanaInicio: b.si, semanaFin: b.sf, enfasis: b.enfasis,
        intensidadRpeMin: b.rpeMin, intensidadRpeMax: b.rpeMax,
      },
    });
    bloques.push(bloque);
  }
  console.log('✓ 4 bloques creados');

  const weekToBloque: Record<number, string> = {
    1: bloques[0].id, 2: bloques[0].id, 3: bloques[0].id,
    4: bloques[1].id,
    5: bloques[2].id, 6: bloques[2].id, 7: bloques[2].id,
    8: bloques[3].id,
  };

  const DIAS = [
    { dia: 'lunes',     mov: 'Sentadilla',         enfoque: 'Fuerza — Sentadilla Barra Baja + 2da exp. Banca',    offset: 0 },
    { dia: 'martes',    mov: 'Peso Muerto',         enfoque: 'Técnica — Peso Muerto Sumo + Rack Pull + RDL',       offset: 1 },
    { dia: 'miercoles', mov: 'Press de Banca',      enfoque: 'Volumen — Banca + Agarre Cerrado + Inclinado',       offset: 2 },
    { dia: 'jueves',    mov: 'Variantes SQ + BP',   enfoque: 'Hipertrofia — Pausa SQ + Búlgara + 3ra exp. Banca', offset: 3 },
    { dia: 'viernes',   mov: 'DL Variantes + Core', enfoque: 'Velocidad/Core — Banded DL + Good Morning + Jalón', offset: 4 },
  ];

  let totalSesiones = 0, totalEjercicios = 0;

  for (let semana = 1; semana <= 8; semana++) {
    for (const { dia, mov, enfoque, offset } of DIAS) {
      const fecha = new Date(fechaInicio);
      fecha.setDate(fecha.getDate() + (semana - 1) * 7 + offset);

      const sesion = await prisma.sesionEntrenamiento.create({
        data: {
          bloqueId: weekToBloque[semana], numeroSemana: semana, diaSemana: dia, fecha,
          movimientoPrincipal: mov, enfocuoDia: enfoque,
          ordenSecuencia: (semana - 1) * 5 + offset + 1,
        },
      });

      const ejercicios = getEjercicios(dia, semana);
      for (let i = 0; i < ejercicios.length; i++) {
        const ej = ejercicios[i];
        await prisma.ejercicioSesion.create({
          data: {
            sesionId: sesion.id, orden: i + 1,
            ejercicioNombre: ej.ejercicioNombre,
            tipoEjercicio: ej.tipoEjercicio as any,
            ordenGrupo: ej.ordenGrupo, cargaRef: ej.cargaRef, rirLabel: ej.rirLabel,
            setsProgramados: ej.setsProgramados, repsProgramadas: ej.repsProgramadas,
            rpeProgramado: ej.rpeProgramado, pesoProgramado: ej.pesoProgramado ?? null,
            restMinutos: ej.restMinutos, notasTecnicas: ej.notasTecnicas,
          },
        });
        totalEjercicios++;
      }
      totalSesiones++;
    }
    console.log(`  ✓ Semana ${semana} (${DIAS.length} sesiones)`);
  }

  console.log('\n✅ Bloque de Volumen listo:');
  console.log(`   Sesiones:   ${totalSesiones} | Ejercicios: ${totalEjercicios}`);
  console.log(`   1RMs:       SQ ${SQ_RM} / BP ${BP_RM} / DL ${DL_RM} kg`);
  console.log(`   Rango:      2026-06-02 → 2026-07-26`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
