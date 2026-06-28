import { prisma } from '@/lib/db';
import { extractToken, verifyToken } from '@/lib/auth';

// One-time migration + seed for exercise hierarchy.
// DELETE this file after running it once in production.
export async function POST(req: Request) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (!payload || payload.rol !== 'ADMIN') return Response.json({ error: 'No autorizado' }, { status: 401 });

  const coach = await prisma.coachProfile.findFirst({
    where: { user: { rol: 'ADMIN' } },
  });
  if (!coach) return Response.json({ error: 'Coach no encontrado' }, { status: 404 });

  // 1. Apply DB schema change
  try {
    await prisma.$executeRaw`ALTER TABLE "EjercicioBiblioteca" ADD COLUMN IF NOT EXISTS "parentId" TEXT`;
    await prisma.$executeRaw`ALTER TABLE "EjercicioBiblioteca" DROP CONSTRAINT IF EXISTS "EjercicioBiblioteca_parentId_fkey"`;
    await prisma.$executeRaw`ALTER TABLE "EjercicioBiblioteca" ADD CONSTRAINT "EjercicioBiblioteca_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "EjercicioBiblioteca"("id") ON DELETE CASCADE ON UPDATE CASCADE`;
  } catch (e) {
    return Response.json({ error: 'Error en migración SQL', detail: String(e) }, { status: 500 });
  }

  // 2. Seed exercises
  type Cat = 'COMPETITIVO' | 'VARIANTE' | 'AUXILIAR' | 'COMPENSATORIO' | 'MOVILIDAD';
  async function upsert(data: {
    nombre: string; categoria: Cat; gruposMusculares?: string[];
    descripcion?: string; cuesTecnicos?: string[]; notasSeguridad?: string;
    equipamientoReq?: string[]; parentId?: string;
  }) {
    return prisma.ejercicioBiblioteca.upsert({
      where: { coachId_nombre: { coachId: coach!.id, nombre: data.nombre } },
      update: { parentId: data.parentId ?? null },
      create: {
        coachId: coach!.id, nombre: data.nombre, categoria: data.categoria,
        gruposMusculares: data.gruposMusculares ?? [], descripcion: data.descripcion ?? null,
        cuesTecnicos: data.cuesTecnicos ?? [], notasSeguridad: data.notasSeguridad ?? null,
        equipamientoReq: data.equipamientoReq ?? [], parentId: data.parentId ?? null,
      },
    });
  }

  let created = 0;

  // ── Big 3 ──────────────────────────────────────────────────────────────────

  const sq = await upsert({ nombre: 'Sentadilla Trasera', categoria: 'COMPETITIVO', gruposMusculares: ['cuádriceps', 'glúteos', 'isquiotibiales', 'core', 'espalda baja'], equipamientoReq: ['barra olímpica', 'rack', 'collarines'], descripcion: 'Levantamiento competitivo principal. Empuje de cadera y rodilla con barra en espalda.', cuesTecnicos: ['Pecho arriba, espalda rígida', 'Romper paralelo', 'Rodillas en la dirección de los pies', 'Valsalva antes de bajar', 'Empujar el suelo'] }); created++;
  for (const v of [
    { n: 'Sentadilla con pausa en el hoyo', d: 'Pausa 2-3ct en la posición más profunda. Elimina el rebote.' },
    { n: 'Sentadilla con tempo 3-1-1', d: '3ct de bajada, 1ct de pausa, 1ct de subida. Control y propriocepción.' },
    { n: 'Sentadilla frontal', d: 'Barra en clavículas. Mayor énfasis en cuádriceps y torso vertical.' },
    { n: 'Sentadilla Zercher', d: 'Barra en los pliegues del codo. Sobrecarga core y dorsales.' },
    { n: 'Sentadilla box', d: 'Sentar en banco a la profundidad objetivo. Control de profundidad.' },
    { n: 'Sentadilla en cadenas', d: 'Cadenas colgadas de la barra. Resistencia acomodante.' },
    { n: 'Sentadilla con bandas', d: 'Bandas elásticas. Sobrecarga acomodante para velocidad de barra.' },
  ]) { await upsert({ nombre: v.n, categoria: 'VARIANTE', parentId: sq.id, descripcion: v.d, gruposMusculares: ['cuádriceps', 'glúteos', 'isquiotibiales'] }); created++; }

  const bp = await upsert({ nombre: 'Press de Banca', categoria: 'COMPETITIVO', gruposMusculares: ['pectoral mayor', 'deltoides anterior', 'tríceps'], equipamientoReq: ['barra olímpica', 'banco plano', 'rack'], descripcion: 'Levantamiento competitivo de empuje de tren superior. Barra al pecho con pausa.', cuesTecnicos: ['Arch natural y escápulas retraídas', 'Codos a 45-60° del torso', 'Valsalva y pausa en el pecho', 'Empujar hacia atrás y arriba'] }); created++;
  for (const v of [
    { n: 'Press de Banca con pausa 2ct', d: 'Pausa 2ct en el pecho. Simula condiciones de competencia.' },
    { n: 'Press de Banca con pausa 3ct', d: 'Pausa 3ct. Máxima eliminación de inercia.' },
    { n: 'CG Bench Press (Agarre Cerrado)', d: 'Agarre ~45cm. Énfasis en tríceps. Clave para el lockout.' },
    { n: 'Floor Press', d: 'Tumbado en el suelo. Elimina arco y trabaja el punto débil del lockout.' },
    { n: 'Pin Press', d: 'Desde pines en rack. Fuerza de salida desde posición estática.' },
    { n: 'Press de Banca inclinado 30°', d: 'Banco 30-45°. Énfasis en pectoral clavicular.' },
    { n: 'Press de Banca con cadenas', d: 'Cadenas colgadas. Resistencia acomodante para el bloqueo.' },
    { n: 'Press de Banca con bandas', d: 'Bandas. Sobrecarga al subir. Speed work.' },
  ]) { await upsert({ nombre: v.n, categoria: 'VARIANTE', parentId: bp.id, descripcion: v.d, gruposMusculares: ['pectoral', 'deltoides anterior', 'tríceps'] }); created++; }

  const dl = await upsert({ nombre: 'Peso Muerto', categoria: 'COMPETITIVO', gruposMusculares: ['isquiotibiales', 'glúteos', 'erector espinal', 'dorsales', 'trapecios', 'antebrazos'], equipamientoReq: ['barra olímpica', 'discos', 'plataforma'], descripcion: 'Levantamiento competitivo de tracción. Barra del suelo hasta extensión completa.', cuesTecnicos: ['Barra sobre mediopié', 'Empujar el suelo', 'Hombros sobre la barra', 'Dorsales activados', 'Extender cadera y rodilla simultáneamente'] }); created++;
  for (const v of [
    { n: 'Peso Muerto en déficit 4-6cm', d: 'Plataforma de 4-6cm. Mayor rango, trabaja la salida del suelo.' },
    { n: 'Peso Muerto sumo', d: 'Stance ancho. Menor recorrido de barra, más aductores y glúteos.' },
    { n: 'Peso Muerto con pausa en rodillas', d: 'Pausa 2ct en rodillas. Trabaja la transición.' },
    { n: 'Peso Muerto rumano (RDL)', d: 'Bisagra de cadera. Énfasis en isquiotibiales. No toca el suelo.' },
    { n: 'Peso Muerto trap bar', d: 'Barra hexagonal. Menor demanda lumbar.' },
    { n: 'Peso Muerto con stance estrecho', d: 'Pies juntos. Mayor cuádriceps.' },
  ]) { await upsert({ nombre: v.n, categoria: 'VARIANTE', parentId: dl.id, descripcion: v.d, gruposMusculares: ['isquiotibiales', 'glúteos', 'erector espinal'] }); created++; }

  // ── Auxiliar — Pierna / Glúteo ─────────────────────────────────────────────

  const ht = await upsert({ nombre: 'Hip Thrust', categoria: 'AUXILIAR', gruposMusculares: ['glúteos', 'isquiotibiales', 'core'], equipamientoReq: ['barra olímpica', 'banco', 'pad'], descripcion: 'Empuje de cadera con barra. Máxima activación glútea.', cuesTecnicos: ['Banco a nivel de omóplatos', 'Pies planos cerca de cadera', 'Extensión completa de cadera'] }); created++;
  for (const v of [
    { n: 'Hip Thrust a una pierna', d: 'Unilateral. Corrige desequilibrios.' },
    { n: 'Hip Thrust con pausa', d: 'Pausa 2-3ct en extensión. Maximiza la contracción glútea.' },
    { n: 'Hip Thrust con banda', d: 'Banda en rodillas. Activa glúteo medio.' },
  ]) { await upsert({ nombre: v.n, categoria: 'VARIANTE', parentId: ht.id, descripcion: v.d, gruposMusculares: ['glúteos', 'isquiotibiales'] }); created++; }

  const bss = await upsert({ nombre: 'Zancada Búlgara (BSS)', categoria: 'AUXILIAR', gruposMusculares: ['cuádriceps', 'glúteos', 'isquiotibiales'], equipamientoReq: ['banco', 'barra o mancuernas'], descripcion: 'Sentadilla unilateral con pie trasero elevado. Alta demanda de cuádriceps y glúteo.', cuesTecnicos: ['Torso vertical', 'Rodilla no pasa el pie', 'Bajar controlado'] }); created++;
  await upsert({ nombre: 'BSS con barra', categoria: 'VARIANTE', parentId: bss.id, descripcion: 'Barra en espalda. Mayor carga.' }); created++;
  await upsert({ nombre: 'BSS con mancuernas', categoria: 'VARIANTE', parentId: bss.id, descripcion: 'Mancuernas a los lados. Más estable.' }); created++;

  await upsert({ nombre: 'Leg Press', categoria: 'AUXILIAR', gruposMusculares: ['cuádriceps', 'glúteos', 'isquiotibiales'], equipamientoReq: ['máquina leg press'], descripcion: 'Empuje en máquina. Complemento de sentadilla sin carga axial.', cuesTecnicos: ['Pies al ancho de cadera', 'No bloquear rodillas', 'No despegar la zona lumbar'] }); created++;

  const lc = await upsert({ nombre: 'Leg Curl (Femoral)', categoria: 'AUXILIAR', gruposMusculares: ['isquiotibiales', 'gastrocnemio'], equipamientoReq: ['máquina leg curl'], descripcion: 'Flexión de rodilla en máquina. Trabajo aislado de isquiotibiales.', cuesTecnicos: ['Rango completo', 'No usar impulso', 'Controlar el excéntrico'] }); created++;
  await upsert({ nombre: 'Nordic Curl', categoria: 'VARIANTE', parentId: lc.id, descripcion: 'Excéntrico nórdico. Altísima demanda excéntrica. Previene lesiones.' }); created++;
  await upsert({ nombre: 'Leg Curl sentado', categoria: 'VARIANTE', parentId: lc.id, descripcion: 'Mayor énfasis en la cabeza corta del bíceps femoral.' }); created++;

  await upsert({ nombre: 'Good Morning', categoria: 'AUXILIAR', gruposMusculares: ['isquiotibiales', 'glúteos', 'erector espinal'], equipamientoReq: ['barra olímpica', 'rack'], descripcion: 'Bisagra de cadera con barra en la espalda. Fortalece cadena posterior.', notasSeguridad: 'Usar cargas moderadas. No buscar máximos.' }); created++;
  await upsert({ nombre: 'Glute Ham Raise (GHR)', categoria: 'AUXILIAR', gruposMusculares: ['isquiotibiales', 'glúteos', 'gastrocnemio'], equipamientoReq: ['banco GHR o GHD'], descripcion: 'Combina flexión de rodilla y extensión de cadera. Desarrollo completo de cadena posterior.' }); created++;

  const goblet = await upsert({ nombre: 'Sentadilla Goblet', categoria: 'AUXILIAR', gruposMusculares: ['cuádriceps', 'glúteos', 'core'], equipamientoReq: ['kettlebell o mancuerna'], descripcion: 'Sentadilla con peso frontal al pecho. Trabaja postura y profundidad.', cuesTecnicos: ['Peso al pecho', 'Codos adentro', 'Talones en el suelo'] }); created++;
  await upsert({ nombre: 'Sentadilla Goblet con pausa', categoria: 'VARIANTE', parentId: goblet.id, descripcion: 'Pausa 3ct en la posición más profunda.' }); created++;

  // ── Auxiliar — Espalda ─────────────────────────────────────────────────────

  const bbr = await upsert({ nombre: 'Barbell Row (Remo con barra)', categoria: 'AUXILIAR', gruposMusculares: ['dorsales', 'trapecios medios', 'romboides', 'bíceps'], equipamientoReq: ['barra olímpica'], descripcion: 'Remo horizontal con barra. Principal tracción horizontal para el Peso Muerto.', cuesTecnicos: ['Torso 45-70°', 'Tirar codos hacia atrás', 'Barra toca el abdomen'] }); created++;
  for (const v of [
    { n: 'Remo Pendlay', d: 'Barra desde el suelo en cada rep. Torso paralelo. Sin impulso.' },
    { n: 'Remo con agarre supino', d: 'Palmas arriba. Mayor bíceps y dorsales bajos.' },
    { n: 'Remo Yates', d: 'Torso ~45° con agarre supino. Permite mayor carga.' },
  ]) { await upsert({ nombre: v.n, categoria: 'VARIANTE', parentId: bbr.id, descripcion: v.d, gruposMusculares: ['dorsales', 'trapecios', 'bíceps'] }); created++; }

  const lpd = await upsert({ nombre: 'Lat Pulldown (Jalón al pecho)', categoria: 'AUXILIAR', gruposMusculares: ['dorsales', 'bíceps', 'teres major'], equipamientoReq: ['polea alta'], descripcion: 'Tracción vertical en polea. Complemento o sustituto de dominadas.', cuesTecnicos: ['Pecho hacia la barra', 'Codos hacia abajo y atrás', 'Escápulas deprimidas'] }); created++;
  for (const v of [
    { n: 'Jalón con agarre neutro', d: 'Agarre paralelo. Más natural para el hombro.' },
    { n: 'Jalón supino', d: 'Palmas hacia la cara. Mayor bíceps.' },
    { n: 'Jalón a una mano', d: 'Unilateral. Mayor rango de movimiento.' },
  ]) { await upsert({ nombre: v.n, categoria: 'VARIANTE', parentId: lpd.id, descripcion: v.d, gruposMusculares: ['dorsales', 'bíceps'] }); created++; }

  const pu = await upsert({ nombre: 'Dominadas (Pull-up)', categoria: 'AUXILIAR', gruposMusculares: ['dorsales', 'bíceps', 'teres major', 'core'], equipamientoReq: ['barra de dominadas'], descripcion: 'Tracción vertical con peso corporal. Alto indicador de fuerza relativa.', cuesTecnicos: ['Rango completo', 'Activar dorsales antes de tirar', 'No balancear'] }); created++;
  for (const v of [
    { n: 'Dominadas lastradas', d: 'Cinturón de lastre. Para atletas que dominan su peso.' },
    { n: 'Chin-ups (agarre supino)', d: 'Palmas hacia ti. Mayor bíceps.' },
    { n: 'Dominadas asistidas con banda', d: 'Banda elástica que reduce el peso corporal.' },
  ]) { await upsert({ nombre: v.n, categoria: 'VARIANTE', parentId: pu.id, descripcion: v.d, gruposMusculares: ['dorsales', 'bíceps'] }); created++; }

  const cr = await upsert({ nombre: 'Cable Row (Remo en polea)', categoria: 'AUXILIAR', gruposMusculares: ['dorsales', 'trapecios medios', 'romboides', 'bíceps'], equipamientoReq: ['polea baja'], descripcion: 'Remo horizontal en polea. Tensión constante en todo el rango.', cuesTecnicos: ['Espalda neutra', 'Codos hacia atrás', 'No oscilar el torso'] }); created++;
  await upsert({ nombre: 'Face Pull', categoria: 'VARIANTE', parentId: cr.id, descripcion: 'Tirar cuerda hacia la cara con codos altos. Rotadores externos. Salud del hombro.' }); created++;
  await upsert({ nombre: 'Cable Row a una mano', categoria: 'VARIANTE', parentId: cr.id, descripcion: 'Unilateral. Mayor rango de movimiento.' }); created++;

  // ── Auxiliar — Empuje ─────────────────────────────────────────────────────

  const ohp = await upsert({ nombre: 'Press Militar (OHP)', categoria: 'AUXILIAR', gruposMusculares: ['deltoides', 'tríceps', 'trapecios superiores', 'core'], equipamientoReq: ['barra olímpica', 'rack'], descripcion: 'Press de hombro de pie con barra. Empuje vertical básico.', cuesTecnicos: ['Core apretado', 'Barra en línea recta', 'Extensión completa'] }); created++;
  for (const v of [
    { n: 'Press Militar sentado', d: 'Sentado. Elimina uso de piernas. Aislamiento de hombros.' },
    { n: 'Press de hombro con mancuernas', d: 'Mayor rango y corrección de desequilibrios.' },
    { n: 'Arnold Press', d: 'Rotación durante el movimiento. Mayor activación del deltoides.' },
  ]) { await upsert({ nombre: v.n, categoria: 'VARIANTE', parentId: ohp.id, descripcion: v.d, gruposMusculares: ['deltoides', 'tríceps'] }); created++; }

  const inc = await upsert({ nombre: 'Press Inclinado', categoria: 'AUXILIAR', gruposMusculares: ['pectoral superior', 'deltoides anterior', 'tríceps'], equipamientoReq: ['banco inclinado 30-45°'], descripcion: 'Press en banco inclinado. Énfasis en pectoral clavicular.' }); created++;
  await upsert({ nombre: 'Press inclinado con mancuernas', categoria: 'VARIANTE', parentId: inc.id, descripcion: 'Mayor rango de movimiento.' }); created++;

  const dips = await upsert({ nombre: 'Fondos en paralelas (Dips)', categoria: 'AUXILIAR', gruposMusculares: ['pectoral', 'tríceps', 'deltoides anterior'], equipamientoReq: ['paralelas'], descripcion: 'Empuje vertical descendente. Excelente para tríceps y pectoral.', notasSeguridad: 'Limitar rango si hay dolor en el hombro.' }); created++;
  await upsert({ nombre: 'Dips lastrados', categoria: 'VARIANTE', parentId: dips.id, descripcion: 'Cinturón de lastre. Para atletas que dominan su peso.' }); created++;
  await upsert({ nombre: 'Dips asistidos', categoria: 'VARIANTE', parentId: dips.id, descripcion: 'Banda o máquina. Para progresar hacia dips completos.' }); created++;

  const lat = await upsert({ nombre: 'Elevaciones laterales', categoria: 'AUXILIAR', gruposMusculares: ['deltoides medial'], equipamientoReq: ['mancuernas o polea'], descripcion: 'Abducción de hombro. Desarrollo del deltoides lateral.', cuesTecnicos: ['Subir hasta horizontal', 'Control en la bajada'] }); created++;
  await upsert({ nombre: 'Elevaciones laterales en polea', categoria: 'VARIANTE', parentId: lat.id, descripcion: 'Tensión constante desde el inicio.' }); created++;
  await upsert({ nombre: 'Elevaciones laterales unilateral', categoria: 'VARIANTE', parentId: lat.id, descripcion: 'Una mano sujetándose. Mayor control.' }); created++;

  // ── Auxiliar — Core ───────────────────────────────────────────────────────

  const pl = await upsert({ nombre: 'Plancha', categoria: 'AUXILIAR', gruposMusculares: ['core', 'transverso abdominal', 'erectores'], equipamientoReq: [], descripcion: 'Isometría de core. Base de la musculatura estabilizadora.', cuesTecnicos: ['Línea recta cabeza-talones', 'Glúteos apretados'] }); created++;
  await upsert({ nombre: 'Plancha lateral', categoria: 'VARIANTE', parentId: pl.id, descripcion: 'Apoyo en un brazo. Énfasis en oblicuos.' }); created++;
  await upsert({ nombre: 'Plancha con rotación (thread the needle)', categoria: 'VARIANTE', parentId: pl.id, descripcion: 'Desde plancha lateral, rotar el brazo por debajo.' }); created++;

  await upsert({ nombre: 'Ab Wheel (Rueda abdominal)', categoria: 'AUXILIAR', gruposMusculares: ['core', 'dorsales', 'hombros'], equipamientoReq: ['rueda abdominal'], descripcion: 'Extensión de core con rueda. Alta demanda anti-extensión.' }); created++;

  const pf = await upsert({ nombre: 'Pallof Press', categoria: 'AUXILIAR', gruposMusculares: ['core', 'oblicuos', 'transverso'], equipamientoReq: ['polea'], descripcion: 'Ejercicio anti-rotación de core. Fundamental para estabilidad rotacional.' }); created++;
  await upsert({ nombre: 'Pallof Press de pie', categoria: 'VARIANTE', parentId: pf.id, descripcion: 'De pie. Mayor demanda de equilibrio.' }); created++;
  await upsert({ nombre: 'Pallof Press con rotación', categoria: 'VARIANTE', parentId: pf.id, descripcion: 'Agrega rotación controlada. Progresión anti-rotación.' }); created++;

  await upsert({ nombre: 'Back Extension', categoria: 'AUXILIAR', gruposMusculares: ['erector espinal', 'glúteos', 'isquiotibiales'], equipamientoReq: ['banco GHD o Roman Chair'], descripcion: 'Extensión de cadera y columna. Fortalece erector e isquiotibiales.' }); created++;

  // ── Compensatorio ─────────────────────────────────────────────────────────

  await upsert({ nombre: 'Face Pull independiente', categoria: 'COMPENSATORIO', gruposMusculares: ['deltoides posterior', 'manguito rotador', 'trapecios'], equipamientoReq: ['polea alta', 'cuerda'], descripcion: 'Tracción facial con cuerda. Fundamental para salud del hombro.', cuesTecnicos: ['Cuerda hacia la cara', 'Codos altos', 'Rotación externa al final'] }); created++;
  await upsert({ nombre: 'Band Pull-Apart', categoria: 'COMPENSATORIO', gruposMusculares: ['deltoides posterior', 'romboides', 'trapecios medios'], equipamientoReq: ['banda elástica'], descripcion: 'Separación de banda. Activa rotadores externos. Mejora postura en banca.' }); created++;
  await upsert({ nombre: 'Rotación externa con banda', categoria: 'COMPENSATORIO', gruposMusculares: ['infraespinoso', 'redondo menor', 'manguito rotador'], equipamientoReq: ['banda elástica'], descripcion: 'Rotación externa de hombro. Prehab esencial del manguito rotador.' }); created++;
  await upsert({ nombre: 'Caminata con banda (Monster Walk)', categoria: 'COMPENSATORIO', gruposMusculares: ['glúteos medios', 'abductores'], equipamientoReq: ['banda elástica'], descripcion: 'Caminar lateral con banda en tobillos. Activa abductores y estabilizadores de cadera.' }); created++;

  return Response.json({ ok: true, created, message: `${created} ejercicios procesados correctamente.` });
}
