import 'dotenv/config';
import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find coach
  const coach = await prisma.coachProfile.findFirst({
    where: { user: { email: 'yisus@valkyria.pe' } },
  });
  if (!coach) throw new Error('Coach profile not found. Run seed.ts first.');

  console.log(`Coach found: ${coach.id}`);

  // Helper to upsert an exercise (skip if name already exists for this coach)
  async function upsert(data: {
    nombre: string;
    categoria: 'COMPETITIVO' | 'VARIANTE' | 'AUXILIAR' | 'COMPENSATORIO' | 'MOVILIDAD';
    gruposMusculares?: string[];
    descripcion?: string;
    cuesTecnicos?: string[];
    notasSeguridad?: string;
    equipamientoReq?: string[];
    parentId?: string;
  }) {
    return prisma.ejercicioBiblioteca.upsert({
      where: { coachId_nombre: { coachId: coach!.id, nombre: data.nombre } },
      update: {},
      create: {
        coachId: coach!.id,
        nombre: data.nombre,
        categoria: data.categoria,
        gruposMusculares: data.gruposMusculares ?? [],
        descripcion: data.descripcion ?? null,
        cuesTecnicos: data.cuesTecnicos ?? [],
        notasSeguridad: data.notasSeguridad ?? null,
        equipamientoReq: data.equipamientoReq ?? [],
        parentId: data.parentId ?? null,
      },
    });
  }

  // ── 1. SENTADILLA TRASERA ────────────────────────────────────────────────

  const sentadilla = await upsert({
    nombre: 'Sentadilla Trasera',
    categoria: 'COMPETITIVO',
    gruposMusculares: ['cuádriceps', 'glúteos', 'isquiotibiales', 'core', 'espalda baja'],
    equipamientoReq: ['barra olímpica', 'rack', 'collarines'],
    descripcion: 'El levantamiento competitivo principal. Movimiento de empuje de cadera y rodilla con barra en espalda alta o baja.',
    cuesTecnicos: ['Pecho arriba, espalda rígida', 'Romper paralelo', 'Rodillas en la dirección de los pies', 'Valsalva antes de bajar', 'Empujar el suelo, no solo subir'],
  });

  for (const v of [
    { nombre: 'Sentadilla con pausa en el hoyo', descripcion: 'Pausa de 2-3ct en la posición más profunda. Elimina el rebote elástico y mejora la fuerza de salida.' },
    { nombre: 'Sentadilla con tempo 3-1-1', descripcion: '3ct de bajada, 1ct de pausa, 1ct de subida. Desarrolla control y propriocepción.' },
    { nombre: 'Sentadilla frontal', descripcion: 'Barra en posición frontal (clavículas). Mayor énfasis en cuádriceps y columna vertical. Excelente para transferencia técnica.' },
    { nombre: 'Sentadilla Zercher', descripcion: 'Barra en los pliegues de los codos. Sobrecarga el core, dorsales y cuádriceps de forma única.' },
    { nombre: 'Sentadilla box', descripcion: 'Sentar en banco a la profundidad objetivo y volver. Control de profundidad y eliminación de reflejo elástico.' },
    { nombre: 'Sentadilla en cadenas', descripcion: 'Cadenas colgadas de la barra que descargan en el suelo al bajar y cargan al subir. Desarrolla la explosividad en el punto de bloqueo.' },
    { nombre: 'Sentadilla con bandas', descripcion: 'Bandas elásticas que aumentan la resistencia al subir. Sobrecarga acomodante para trabajar velocidad de barra.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: sentadilla.id, descripcion: v.descripcion, gruposMusculares: ['cuádriceps', 'glúteos', 'isquiotibiales'] });
  }

  // ── 2. PRESS DE BANCA ───────────────────────────────────────────────────

  const banca = await upsert({
    nombre: 'Press de Banca',
    categoria: 'COMPETITIVO',
    gruposMusculares: ['pectoral mayor', 'deltoides anterior', 'tríceps'],
    equipamientoReq: ['barra olímpica', 'banco plano', 'rack'],
    descripcion: 'Levantamiento competitivo de empuje de tren superior. Barra baja al pecho con pausa y sube bloqueando codos.',
    cuesTecnicos: ['Arch natural y escápulas retraídas', 'Pies planos o en punta según federación', 'Codos a 45-60° del torso', 'Valsalva y pausa en el pecho hasta señal', 'Empujar hacia atrás y arriba'],
  });

  for (const v of [
    { nombre: 'Press de Banca con pausa 2ct', descripcion: 'Pausa de 2ct en el pecho. Simula las condiciones de competencia y desarrolla fuerza de salida desde el pecho.' },
    { nombre: 'Press de Banca con pausa 3ct', descripcion: 'Pausa de 3ct. Máxima eliminación de inercia. Útil para identificar debilidades técnicas.' },
    { nombre: 'CG Bench Press (Agarre Cerrado)', descripcion: 'Agarre a ~45-50cm. Énfasis en tríceps y deltoides anterior. Fundamental para completar la extensión final.' },
    { nombre: 'Floor Press', descripcion: 'Press tumbado en el suelo. Elimina el arco y limita el rango. Trabaja el punto débil del lockout sin cargar el hombro.' },
    { nombre: 'Pin Press', descripcion: 'Desde pines en el rack, eliminando el movimiento excéntrico. Desarrolla fuerza de salida desde una posición estática.' },
    { nombre: 'Press de Banca inclinado 30°', descripcion: 'Banco inclinado a ~30°. Mayor énfasis en pectoral clavicular y deltoides anterior. Complemento de hipertrofia.' },
    { nombre: 'Press de Banca con cadenas', descripcion: 'Cadenas colgadas de la barra. Resistencia acomodante para desarrollar velocidad y bloqueo final.' },
    { nombre: 'Press de Banca con bandas', descripcion: 'Bandas que sobrecargan el bloqueo. Ideal para trabajo de velocidad de barra (speed work).' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: banca.id, descripcion: v.descripcion, gruposMusculares: ['pectoral', 'deltoides anterior', 'tríceps'] });
  }

  // ── 3. PESO MUERTO ──────────────────────────────────────────────────────

  const deadlift = await upsert({
    nombre: 'Peso Muerto',
    categoria: 'COMPETITIVO',
    gruposMusculares: ['isquiotibiales', 'glúteos', 'erector espinal', 'dorsales', 'trapecios', 'antebrazos'],
    equipamientoReq: ['barra olímpica', 'discos', 'plataforma'],
    descripcion: 'Levantamiento competitivo de tracción. Barra del suelo hasta extensión completa de cadera y rodilla.',
    cuesTecnicos: ['Barra sobre mediopié (a 2-3cm de la espinilla)', 'Empujar el suelo como en una sentadilla', 'Hombros sobre o delante de la barra', 'Dorsales activados ("trabas")', 'Extender cadera y rodilla al mismo tiempo'],
  });

  for (const v of [
    { nombre: 'Peso Muerto en déficit 4-6cm', descripcion: 'De pie sobre plataforma de 4-6cm. Mayor rango de movimiento para trabajar la salida del suelo.' },
    { nombre: 'Peso Muerto sumo', descripcion: 'Stance ancho con puntas hacia afuera. Menor recorrido de barra, mayor énfasis en aductores y glúteos.' },
    { nombre: 'Peso Muerto con pausa en rodillas', descripcion: 'Pausa de 2ct a la altura de las rodillas. Trabaja la transición y evita que la cadera suba antes que la barra.' },
    { nombre: 'Peso Muerto rumano (RDL)', descripcion: 'Bisagra de cadera con rodillas casi extendidas. Énfasis máximo en isquiotibiales y glúteos. No toca el suelo.' },
    { nombre: 'Peso Muerto trap bar', descripcion: 'Barra hexagonal. Postura más vertical, menor demanda lumbar. Útil para atletismo general y rehab.' },
    { nombre: 'Peso Muerto con stance estrecho', descripcion: 'Pies juntos o más cerrados. Mayor demanda de cuádriceps. Variación técnica para trabajar diferente ángulo.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: deadlift.id, descripcion: v.descripcion, gruposMusculares: ['isquiotibiales', 'glúteos', 'erector espinal'] });
  }

  // ── 4. HIP THRUST ────────────────────────────────────────────────────────

  const hipThrust = await upsert({
    nombre: 'Hip Thrust',
    categoria: 'AUXILIAR',
    gruposMusculares: ['glúteos', 'isquiotibiales', 'core'],
    equipamientoReq: ['barra olímpica', 'banco', 'pad para cadera'],
    descripcion: 'Empuje de cadera con barra. Principal ejercicio de activación glútea con máxima sobrecarga en extensión completa.',
    cuesTecnicos: ['Banco a nivel de omóplatos', 'Pies planos y cerca de la cadera', 'Empujar el suelo con los talones', 'Extensión completa de cadera', 'No hiperextender la lumbar'],
  });

  for (const v of [
    { nombre: 'Hip Thrust a una pierna', descripcion: 'Unilateral. Corrige desequilibrios y aumenta la demanda de glúteo por lado.' },
    { nombre: 'Hip Thrust con pausa', descripcion: 'Pausa de 2-3ct en extensión completa. Elimina el impulso y maximiza la contracción glútea.' },
    { nombre: 'Hip Thrust con banda', descripcion: 'Banda en rodillas que activa el glúteo medio durante el movimiento. Útil como activación o complemento.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: hipThrust.id, descripcion: v.descripcion, gruposMusculares: ['glúteos', 'isquiotibiales'] });
  }

  // ── 5. ZANCADA BÚLGARA ──────────────────────────────────────────────────

  const bss = await upsert({
    nombre: 'Zancada Búlgara (BSS)',
    categoria: 'AUXILIAR',
    gruposMusculares: ['cuádriceps', 'glúteos', 'isquiotibiales', 'equilibrio'],
    equipamientoReq: ['banco', 'barra o mancuernas'],
    descripcion: 'Sentadilla unilateral con pie trasero elevado en banco. Alta demanda de cuádriceps y glúteo de la pierna delantera.',
    cuesTecnicos: ['Torso vertical', 'Rodilla delantera no pasa el pie', 'Bajar controlado', 'Empujar desde el talón delantero', 'No arquear la espalda baja'],
  });

  for (const v of [
    { nombre: 'BSS con barra', descripcion: 'Barra en la espalda. Mayor carga posible. Exige estabilidad adicional del core.' },
    { nombre: 'BSS con mancuernas', descripcion: 'Mancuernas a los lados. Más estable y mejor para rangos altos de repetición.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: bss.id, descripcion: v.descripcion, gruposMusculares: ['cuádriceps', 'glúteos'] });
  }

  // ── 6. LEG PRESS ────────────────────────────────────────────────────────

  await upsert({
    nombre: 'Leg Press',
    categoria: 'AUXILIAR',
    gruposMusculares: ['cuádriceps', 'glúteos', 'isquiotibiales'],
    equipamientoReq: ['máquina leg press'],
    descripcion: 'Empuje de cadera y rodilla en máquina. Complemento de sentadilla para acumular volumen sin demanda axial.',
    cuesTecnicos: ['Pies al ancho de cadera', 'No bloquear rodillas al extender', 'Bajar hasta 90° o más según movilidad', 'No despegar la zona lumbar'],
  });

  // ── 7. LEG CURL ─────────────────────────────────────────────────────────

  const legCurl = await upsert({
    nombre: 'Leg Curl (Femoral)',
    categoria: 'AUXILIAR',
    gruposMusculares: ['isquiotibiales', 'gastrocnemio'],
    equipamientoReq: ['máquina leg curl'],
    descripcion: 'Flexión de rodilla en máquina. Trabajo aislado de isquiotibiales. Complemento esencial del Peso Muerto.',
    cuesTecnicos: ['Cadera en la almohadilla', 'Rango completo de movimiento', 'No usar impulso', 'Controlar el excéntrico'],
  });

  for (const v of [
    { nombre: 'Nordic Curl', descripcion: 'Excéntrico nórdico. Sin máquina: rodillas fijadas al suelo, el cuerpo baja controlado. Altísima demanda excéntrica de isquiotibiales. Previene lesiones.' },
    { nombre: 'Leg Curl sentado', descripcion: 'Mayor énfasis en la cabeza corta del bíceps femoral. Más fácil de cargar que el tumbado.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: legCurl.id, descripcion: v.descripcion, gruposMusculares: ['isquiotibiales'] });
  }

  // ── 8. GOOD MORNING ─────────────────────────────────────────────────────

  await upsert({
    nombre: 'Good Morning',
    categoria: 'AUXILIAR',
    gruposMusculares: ['isquiotibiales', 'glúteos', 'erector espinal'],
    equipamientoReq: ['barra olímpica', 'rack'],
    descripcion: 'Bisagra de cadera con barra en la espalda. Fortalece la cadena posterior y la posición de sentadilla y peso muerto.',
    cuesTecnicos: ['Espalda rígida durante todo el movimiento', 'Cadera hacia atrás', 'Rodillas ligeramente flexionadas', 'Controlar el excéntrico'],
    notasSeguridad: 'Usar cargas moderadas. No es un ejercicio para buscar máximos.',
  });

  // ── 9. GHR ──────────────────────────────────────────────────────────────

  await upsert({
    nombre: 'Glute Ham Raise (GHR)',
    categoria: 'AUXILIAR',
    gruposMusculares: ['isquiotibiales', 'glúteos', 'gastrocnemio'],
    equipamientoReq: ['banco GHR o GHD'],
    descripcion: 'Combina flexión de rodilla y extensión de cadera. Desarrollo completo de la cadena posterior.',
    cuesTecnicos: ['Cadera en el pivote', 'Contraer glúteos y femorales', 'Bajar controlado', 'No arquear la espalda al final'],
  });

  // ── 10. SENTADILLA GOBLET ───────────────────────────────────────────────

  const goblet = await upsert({
    nombre: 'Sentadilla Goblet',
    categoria: 'AUXILIAR',
    gruposMusculares: ['cuádriceps', 'glúteos', 'core'],
    equipamientoReq: ['kettlebell o mancuerna'],
    descripcion: 'Sentadilla con peso frontal al pecho. Excelente para trabajar postura, profundidad y activar el core.',
    cuesTecnicos: ['Peso al pecho', 'Codos adentro y hacia abajo', 'Talones en el suelo', 'Pecho orgulloso'],
  });

  await upsert({ nombre: 'Sentadilla Goblet con pausa', categoria: 'VARIANTE', parentId: goblet.id, descripcion: 'Pausa de 3ct en la posición más profunda. Movilidad de cadera y tobillo.' });

  // ── 11. BARBELL ROW ─────────────────────────────────────────────────────

  const bbRow = await upsert({
    nombre: 'Barbell Row (Remo con barra)',
    categoria: 'AUXILIAR',
    gruposMusculares: ['dorsales', 'trapecios medios', 'romboides', 'bíceps', 'brachialis'],
    equipamientoReq: ['barra olímpica'],
    descripcion: 'Remo horizontal con barra. Principal ejercicio de tracción horizontal para el Peso Muerto y la espalda general.',
    cuesTecnicos: ['Torso entre 45-70° del suelo', 'Tirar codos hacia atrás', 'Apretón escapular al final', 'Barra toca el abdomen'],
  });

  for (const v of [
    { nombre: 'Remo Pendlay', descripcion: 'Barra parte del suelo en cada repetición. Torso paralelo al suelo. Mayor demanda de fuerza inicial. Sin impulso.' },
    { nombre: 'Remo con agarre supino', descripcion: 'Palmas hacia arriba. Mayor activación del bíceps y dorsales bajos. Más rango de movimiento.' },
    { nombre: 'Remo Yates', descripcion: 'Torso más vertical (~45°) con agarre supino. Permite mayor carga y trabaja dorsales en un rango diferente.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: bbRow.id, descripcion: v.descripcion, gruposMusculares: ['dorsales', 'trapecios', 'bíceps'] });
  }

  // ── 12. LAT PULLDOWN ────────────────────────────────────────────────────

  const latPulldown = await upsert({
    nombre: 'Lat Pulldown (Jalón al pecho)',
    categoria: 'AUXILIAR',
    gruposMusculares: ['dorsales', 'bíceps', 'teres major'],
    equipamientoReq: ['polea alta', 'barra o agarre'],
    descripcion: 'Tracción vertical en polea alta. Complemento o sustituto de dominadas para desarrollo de dorsales.',
    cuesTecnicos: ['Pecho hacia la barra', 'Codos hacia abajo y atrás', 'Rango completo', 'Escápulas deprimidas antes de tirar'],
  });

  for (const v of [
    { nombre: 'Jalón con agarre neutro', descripcion: 'Agarre paralelo con triángulo o agarre V. Más natural para el hombro y mayor activación de dorsales.' },
    { nombre: 'Jalón supino', descripcion: 'Palmas hacia la cara. Mayor bíceps y mayor rango de movimiento.' },
    { nombre: 'Jalón a una mano', descripcion: 'Unilateral en polea. Permite rotar el torso y trabajar cada lado de forma independiente.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: latPulldown.id, descripcion: v.descripcion, gruposMusculares: ['dorsales', 'bíceps'] });
  }

  // ── 13. DOMINADAS ───────────────────────────────────────────────────────

  const pullups = await upsert({
    nombre: 'Dominadas (Pull-up)',
    categoria: 'AUXILIAR',
    gruposMusculares: ['dorsales', 'bíceps', 'teres major', 'core'],
    equipamientoReq: ['barra de dominadas'],
    descripcion: 'Tracción vertical con peso corporal. Alta exigencia de fuerza relativa y potente marcador de calidad de movimiento.',
    cuesTecnicos: ['Rango completo: brazo extendido a barbilla sobre barra', 'Activar dorsales antes de tirar', 'No balancear el cuerpo', 'Codos adelante y abajo'],
  });

  for (const v of [
    { nombre: 'Dominadas lastradas', descripcion: 'Cinturón de lastre o chaleco con peso. Para atletas que ya mueven su propio peso con facilidad.' },
    { nombre: 'Chin-ups (agarre supino)', descripcion: 'Palmas mirando hacia ti. Mayor activación de bíceps y dorsales bajos. Generalmente más sencillo que el agarre pronado.' },
    { nombre: 'Dominadas asistidas con banda', descripcion: 'Banda elástica que reduce el peso corporal efectivo. Para progresar hacia dominadas completas.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: pullups.id, descripcion: v.descripcion, gruposMusculares: ['dorsales', 'bíceps'] });
  }

  // ── 14. CABLE ROW ───────────────────────────────────────────────────────

  const cableRow = await upsert({
    nombre: 'Cable Row (Remo en polea)',
    categoria: 'AUXILIAR',
    gruposMusculares: ['dorsales', 'trapecios medios', 'romboides', 'bíceps'],
    equipamientoReq: ['polea baja', 'agarre triangular o barra'],
    descripcion: 'Remo horizontal en polea baja. Tensión constante en todo el rango de movimiento. Alto volumen de dorsales.',
    cuesTecnicos: ['Espalda neutra', 'Tirar codos hacia atrás', 'Pausa y apretón al final', 'No oscilar el torso'],
  });

  for (const v of [
    { nombre: 'Face Pull', descripcion: 'Tirar la cuerda hacia la cara con los codos altos. Trabaja rotadores externos, trapecio y deltoides posterior. Fundamental para salud del hombro.' },
    { nombre: 'Cable Row a una mano', descripcion: 'Unilateral. Mayor rango de movimiento y permite trabajar desequilibrios.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: cableRow.id, descripcion: v.descripcion, gruposMusculares: ['dorsales', 'deltoides posterior', 'manguito rotador'] });
  }

  // ── 15. PRESS MILITAR ───────────────────────────────────────────────────

  const ohp = await upsert({
    nombre: 'Press Militar (OHP)',
    categoria: 'AUXILIAR',
    gruposMusculares: ['deltoides', 'tríceps', 'trapecios superiores', 'core'],
    equipamientoReq: ['barra olímpica', 'rack o jaula'],
    descripcion: 'Press de hombro de pie con barra. Ejercicio básico de empuje vertical. Exige estabilidad de core.',
    cuesTecnicos: ['Core apretado', 'Barra sube en línea recta', 'Cabeza atrás al pasar la frente', 'Extensión completa en el bloqueo'],
  });

  for (const v of [
    { nombre: 'Press Militar sentado', descripcion: 'Sentado en banco vertical. Elimina el uso de piernas. Más aislamiento de hombros.' },
    { nombre: 'Press de hombro con mancuernas', descripcion: 'Mayor rango de movimiento y permite trabajar desequilibrios entre lados.' },
    { nombre: 'Arnold Press', descripcion: 'Rotación de las mancuernas durante el movimiento. Mayor activación del deltoides anterior y medial.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: ohp.id, descripcion: v.descripcion, gruposMusculares: ['deltoides', 'tríceps'] });
  }

  // ── 16. PRESS INCLINADO ─────────────────────────────────────────────────

  const incline = await upsert({
    nombre: 'Press Inclinado',
    categoria: 'AUXILIAR',
    gruposMusculares: ['pectoral superior (clavicular)', 'deltoides anterior', 'tríceps'],
    equipamientoReq: ['banco inclinado 30-45°', 'barra o mancuernas'],
    descripcion: 'Press en banco inclinado a 30-45°. Énfasis en la porción clavicular del pectoral. Complemento de hipertrofia.',
    cuesTecnicos: ['Ángulo 30-45°', 'Retracción escapular', 'Codos a 45-60°', 'Rango completo'],
  });

  await upsert({ nombre: 'Press inclinado con mancuernas', categoria: 'VARIANTE', parentId: incline.id, descripcion: 'Mayor rango de movimiento y trabajo unilateral. Útil para volumen alto.' });

  // ── 17. FONDOS EN PARALELAS ─────────────────────────────────────────────

  const dips = await upsert({
    nombre: 'Fondos en paralelas (Dips)',
    categoria: 'AUXILIAR',
    gruposMusculares: ['pectoral', 'tríceps', 'deltoides anterior'],
    equipamientoReq: ['paralelas'],
    descripcion: 'Empuje vertical descendente. Excelente volumen de tríceps y pectoral. Gran trasferencia al press de banca.',
    cuesTecnicos: ['Inclinar torso hacia adelante para mayor pectoral', 'Codos semicerrados', 'Rango completo sin comprometer el hombro', 'No arquear excesivo'],
    notasSeguridad: 'Limitar rango si hay dolor en el hombro. Progresar gradualmente.',
  });

  for (const v of [
    { nombre: 'Dips lastrados', descripcion: 'Cinturón de lastre. Para atletas que dominan el peso corporal (>10 reps).' },
    { nombre: 'Dips asistidos', descripcion: 'Máquina o banda que reduce el peso corporal efectivo. Para progresar hacia dips completos.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: dips.id, descripcion: v.descripcion, gruposMusculares: ['pectoral', 'tríceps'] });
  }

  // ── 18. ELEVACIONES LATERALES ───────────────────────────────────────────

  const laterales = await upsert({
    nombre: 'Elevaciones laterales',
    categoria: 'AUXILIAR',
    gruposMusculares: ['deltoides medial'],
    equipamientoReq: ['mancuernas o polea'],
    descripcion: 'Abducción de hombro. Desarrollo del deltoides lateral. Clave para el ancho de hombros.',
    cuesTecnicos: ['Codo ligeramente flexionado', 'Subir hasta horizontal', 'Control en la bajada', 'No balancear el torso'],
  });

  for (const v of [
    { nombre: 'Elevaciones laterales en polea', descripcion: 'Tensión constante desde el inicio. Mejor para trabajo con rangos altos de reps.' },
    { nombre: 'Elevaciones laterales unilateral', descripcion: 'Una mano sujetándose para mayor estabilidad. Mayor rango de movimiento y control.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: laterales.id, descripcion: v.descripcion, gruposMusculares: ['deltoides medial'] });
  }

  // ── 19. PLANCHA ─────────────────────────────────────────────────────────

  const plancha = await upsert({
    nombre: 'Plancha',
    categoria: 'AUXILIAR',
    gruposMusculares: ['core', 'transverso abdominal', 'erectores'],
    equipamientoReq: [],
    descripcion: 'Isometría de core en posición de empuje. Base del desarrollo de la musculatura estabilizadora para los tres levantamientos.',
    cuesTecnicos: ['Línea recta de cabeza a talones', 'Glúteos apretados', 'No hundir la cadera', 'Respiración controlada'],
  });

  for (const v of [
    { nombre: 'Plancha lateral', descripcion: 'Apoyo en un brazo, cuerpo lateral. Énfasis en oblicuos y cuadrado lumbar.' },
    { nombre: 'Plancha con rotación (thread the needle)', descripcion: 'Desde plancha lateral, rotar el brazo por debajo del cuerpo. Movilidad torácica y antirotación.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: plancha.id, descripcion: v.descripcion, gruposMusculares: ['core', 'oblicuos'] });
  }

  // ── 20. AB WHEEL ────────────────────────────────────────────────────────

  await upsert({
    nombre: 'Ab Wheel (Rueda abdominal)',
    categoria: 'AUXILIAR',
    gruposMusculares: ['core', 'dorsales', 'hombros'],
    equipamientoReq: ['rueda abdominal'],
    descripcion: 'Extensión de core con rueda. Alta demanda anti-extensión. Fortalece el core en el rango más largo.',
    cuesTecnicos: ['Pellizcar glúteos', 'Core rígido en todo momento', 'No hundir la cadera al extender', 'Volver activando el dorsal'],
  });

  // ── 21. PALLOF PRESS ────────────────────────────────────────────────────

  const pallof = await upsert({
    nombre: 'Pallof Press',
    categoria: 'AUXILIAR',
    gruposMusculares: ['core', 'oblicuos', 'transverso'],
    equipamientoReq: ['polea'],
    descripcion: 'Ejercicio anti-rotación de core en polea. Fundamental para estabilidad rotacional en los tres levantamientos.',
    cuesTecnicos: ['Pies al ancho de cadera, de lado a la polea', 'Core activo antes de empujar', 'Empujar y volver controlado', 'No rotar el torso'],
  });

  for (const v of [
    { nombre: 'Pallof Press de pie', descripcion: 'De pie en lugar de arrodillado. Mayor demanda de equilibrio y cadera.' },
    { nombre: 'Pallof Press con rotación', descripcion: 'Agregar rotación controlada al final. Progresión anti-rotación a rotación activa.' },
  ]) {
    await upsert({ nombre: v.nombre, categoria: 'VARIANTE', parentId: pallof.id, descripcion: v.descripcion, gruposMusculares: ['core', 'oblicuos'] });
  }

  // ── 22. BACK EXTENSION ──────────────────────────────────────────────────

  await upsert({
    nombre: 'Back Extension',
    categoria: 'AUXILIAR',
    gruposMusculares: ['erector espinal', 'glúteos', 'isquiotibiales'],
    equipamientoReq: ['banco GHD o Roman Chair'],
    descripcion: 'Extensión de cadera y columna en banco de extensiones. Fortalece erector e isquiotibiales en el rango corto.',
    cuesTecnicos: ['Cadera en el pivote del banco', 'Extensión completa', 'No hiperextender lumbar', 'Manos al pecho o en la nuca'],
  });

  // ── 23. FACE PULL (independiente) ────────────────────────────────────────

  await upsert({
    nombre: 'Face Pull',
    categoria: 'COMPENSATORIO',
    gruposMusculares: ['deltoides posterior', 'manguito rotador', 'trapecios'],
    equipamientoReq: ['polea alta', 'cuerda'],
    descripcion: 'Tracción facial con cuerda en polea alta. Fundamental para la salud del hombro en atletas con alto volumen de pressing.',
    cuesTecnicos: ['Tirar la cuerda hacia la cara', 'Codos altos (a la altura de los hombros)', 'Rotación externa máxima al final', 'Control excéntrico lento'],
  });

  // ── 24. BAND PULL-APART ─────────────────────────────────────────────────

  await upsert({
    nombre: 'Band Pull-Apart',
    categoria: 'COMPENSATORIO',
    gruposMusculares: ['deltoides posterior', 'romboides', 'trapecios medios'],
    equipamientoReq: ['banda elástica'],
    descripcion: 'Separación de banda a la altura del pecho. Activa rotadores externos y mejora la postura en el press de banca.',
    cuesTecnicos: ['Brazos rectos', 'Apretar escápulas al final', 'Control en el retorno', 'Pecho afuera'],
  });

  // ── 25. ROTACIÓN EXTERNA ────────────────────────────────────────────────

  await upsert({
    nombre: 'Rotación externa con banda',
    categoria: 'COMPENSATORIO',
    gruposMusculares: ['infraespinoso', 'redondo menor', 'manguito rotador'],
    equipamientoReq: ['banda elástica o polea'],
    descripcion: 'Rotación externa de hombro. Prehab esencial para la salud del manguito rotador en atletas de fuerza.',
    cuesTecnicos: ['Codo a 90°', 'Brazo pegado al cuerpo', 'Movimiento lento y controlado', 'No compensar con el torso'],
  });

  // ── 26. CAMINATA CON BANDA ──────────────────────────────────────────────

  await upsert({
    nombre: 'Caminata con banda (Monster Walk)',
    categoria: 'COMPENSATORIO',
    gruposMusculares: ['glúteos medios', 'abductores', 'TFL'],
    equipamientoReq: ['banda elástica'],
    descripcion: 'Caminar lateral o diagonal con banda en tobillos. Activa abductores y estabilizadores de cadera. Previene el colapso de rodilla en sentadilla.',
    cuesTecnicos: ['Posición de sentadilla media', 'Pasos controlados y constantes', 'Rodillas sin colapsar hacia adentro', 'No mover el torso'],
  });

  console.log('Seed completado: 26 movimientos base + variantes creados.');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
