import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding...');

  // Coach: Yisus
  const coachPassword = await bcrypt.hash(process.env.SEED_COACH_PASSWORD ?? 'devpass123', 10);
  const coachUser = await prisma.user.upsert({
    where: { email: 'yisus@valkyria.pe' },
    update: {},
    create: {
      email: 'yisus@valkyria.pe',
      password: coachPassword,
      nombre: 'Yisus',
      rol: 'ADMIN',
    },
  });

  const coach = await prisma.coachProfile.upsert({
    where: { userId: coachUser.id },
    update: {},
    create: {
      userId: coachUser.id,
      especialidades: ['Powerlifting', 'Periodización'],
      experienciaAnos: 8,
    },
  });

  console.log('✓ Coach Yisus creado');

  // Atleta: Andree
  const andreePassword = await bcrypt.hash(process.env.SEED_ANDREE_PASSWORD ?? 'devpass123', 10);
  const andreeUser = await prisma.user.upsert({
    where: { email: 'andree@valkyria.pe' },
    update: {},
    create: {
      email: 'andree@valkyria.pe',
      password: andreePassword,
      nombre: 'Andree',
      rol: 'ATHLETE',
    },
  });

  const andree = await prisma.athleteProfile.upsert({
    where: { userId: andreeUser.id },
    update: {},
    create: {
      userId: andreeUser.id,
      coachId: coach.id,
      pesoActual: 83,
      altura: 175,
      edad: 24,
      categoriaPeso: '83kg',
      experienciaPowerlifting: 'intermedio',
      objetivos: ['Clasificar IPF', 'Total 550kg'],
      lesionesActuales: [],
    },
  });

  console.log('✓ Atleta Andree creado');

  // Atleta: Frank
  const frankPassword = await bcrypt.hash(process.env.SEED_FRANK_PASSWORD ?? 'devpass123', 10);
  const frankUser = await prisma.user.upsert({
    where: { email: 'frank@valkyria.pe' },
    update: {},
    create: {
      email: 'frank@valkyria.pe',
      password: frankPassword,
      nombre: 'Frank',
      rol: 'ATHLETE',
    },
  });

  await prisma.athleteProfile.upsert({
    where: { userId: frankUser.id },
    update: {},
    create: {
      userId: frankUser.id,
      coachId: coach.id,
      pesoActual: 93,
      altura: 178,
      edad: 27,
      categoriaPeso: '93kg',
      experienciaPowerlifting: 'avanzado',
      objetivos: ['Mejorar deadlift', 'Competir nacional'],
      lesionesActuales: [],
    },
  });

  console.log('✓ Atleta Frank creado');

  // Periodización de ejemplo para Andree (DRAFT)
  const periExistente = await prisma.periodizacion.findFirst({
    where: { athleteId: andree.id },
  });

  if (!periExistente) {
    const fechaInicio = new Date('2026-05-01');
    const fechaFin = new Date('2026-07-24');

    const peri = await prisma.periodizacion.create({
      data: {
        coachId: coach.id,
        athleteId: andree.id,
        nombre: 'Bloque Acumulación Q2 2026',
        tipo: 'LINEAL',
        fechaInicio,
        fechaFin,
        duracionSemanas: 12,
        objetivo: 'Aumentar tonelaje base y consolidar técnica en los Big 3',
        estado: 'ACTIVE',
      },
    });

    // Bloque 1 — Acumulación (semanas 1-4)
    const bloque1 = await prisma.bloqueEntrenamiento.create({
      data: {
        periodizacionId: peri.id,
        numeroBloque: 1,
        nombre: 'Acumulación',
        semanaInicio: 1,
        semanaFin: 4,
        enfasis: 'Volumen',
        intensidadRpeMin: 6.5,
        intensidadRpeMax: 7.5,
      },
    });

    // Semana 1 — Lunes (Squat)
    const sesionLunes = await prisma.sesionEntrenamiento.create({
      data: {
        bloqueId: bloque1.id,
        numeroSemana: 1,
        diaSemana: 'lunes',
        movimientoPrincipal: 'Sentadilla',
        enfocuoDia: 'ME — Fuerza',
        ordenSecuencia: 1,
      },
    });

    await prisma.ejercicioSesion.createMany({
      data: [
        { sesionId: sesionLunes.id, ejercicioNombre: 'Sentadilla Trasera', tipoEjercicio: 'COMPETITIVO', setsProgramados: 4, repsProgramadas: 5, rpeProgramado: 7, orden: 1 },
        { sesionId: sesionLunes.id, ejercicioNombre: 'Sentadilla Pausa', tipoEjercicio: 'VARIANTE', setsProgramados: 3, repsProgramadas: 3, rpeProgramado: 6.5, orden: 2 },
        { sesionId: sesionLunes.id, ejercicioNombre: 'Leg Press', tipoEjercicio: 'AUXILIAR', setsProgramados: 3, repsProgramadas: 10, rpeProgramado: 7, orden: 3 },
      ],
    });

    // Semana 1 — Miércoles (Bench)
    const sesionMiercoles = await prisma.sesionEntrenamiento.create({
      data: {
        bloqueId: bloque1.id,
        numeroSemana: 1,
        diaSemana: 'miercoles',
        movimientoPrincipal: 'Press de Banca',
        enfocuoDia: 'ME — Fuerza',
        ordenSecuencia: 2,
      },
    });

    await prisma.ejercicioSesion.createMany({
      data: [
        { sesionId: sesionMiercoles.id, ejercicioNombre: 'Press de Banca', tipoEjercicio: 'COMPETITIVO', setsProgramados: 4, repsProgramadas: 5, rpeProgramado: 7, orden: 1 },
        { sesionId: sesionMiercoles.id, ejercicioNombre: 'Press Inclinado', tipoEjercicio: 'VARIANTE', setsProgramados: 3, repsProgramadas: 8, rpeProgramado: 7, orden: 2 },
        { sesionId: sesionMiercoles.id, ejercicioNombre: 'Remo con Barra', tipoEjercicio: 'AUXILIAR', setsProgramados: 3, repsProgramadas: 10, rpeProgramado: 7, orden: 3 },
      ],
    });

    // Semana 1 — Viernes (Deadlift)
    const sesionViernes = await prisma.sesionEntrenamiento.create({
      data: {
        bloqueId: bloque1.id,
        numeroSemana: 1,
        diaSemana: 'viernes',
        movimientoPrincipal: 'Peso Muerto',
        enfocuoDia: 'ME — Fuerza',
        ordenSecuencia: 3,
      },
    });

    await prisma.ejercicioSesion.createMany({
      data: [
        { sesionId: sesionViernes.id, ejercicioNombre: 'Peso Muerto Convencional', tipoEjercicio: 'COMPETITIVO', setsProgramados: 4, repsProgramadas: 4, rpeProgramado: 7.5, orden: 1 },
        { sesionId: sesionViernes.id, ejercicioNombre: 'Peso Muerto Rumano', tipoEjercicio: 'VARIANTE', setsProgramados: 3, repsProgramadas: 6, rpeProgramado: 7, orden: 2 },
        { sesionId: sesionViernes.id, ejercicioNombre: 'Hip Thrust', tipoEjercicio: 'AUXILIAR', setsProgramados: 3, repsProgramadas: 12, rpeProgramado: 7, orden: 3 },
      ],
    });

    console.log('✓ Periodización de ejemplo para Andree creada');
  }

  console.log('\nCredenciales de acceso:');
  console.log('  Coach  → yisus@valkyria.pe   (contraseña: SEED_COACH_PASSWORD o "devpass123")');
  console.log('  Atleta → andree@valkyria.pe  (contraseña: SEED_ANDREE_PASSWORD o "devpass123")');
  console.log('  Atleta → frank@valkyria.pe   (contraseña: SEED_FRANK_PASSWORD o "devpass123")');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
