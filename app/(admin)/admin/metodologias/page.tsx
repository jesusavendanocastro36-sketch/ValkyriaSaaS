'use client';

import { useState, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

type Metodologia = {
  id: string;
  nombre: string;
  subtitulo: string;
  nivel: 'principiante' | 'intermedio' | 'avanzado';
  tag: string;
  tagColor: string;
  resumen: string;
  cuandoUsarla: string[];
  perfilIdeal: string[];
  estructura: { fase: string; semanas: string; descripcion: string }[];
  bloqueRV: string[];
  ejemploSemanal?: { dia: string; tipo: string; descripcion: string }[];
  pros: string[];
  contras: string[];
  nota: string;
};

// ── Data ──────────────────────────────────────────────────────────────────────

const METODOLOGIAS: Metodologia[] = [
  {
    id: 'lineal',
    nombre: 'Periodización Lineal',
    subtitulo: 'Progresión clásica y predecible',
    nivel: 'principiante',
    tag: 'Lineal',
    tagColor: 'text-blue-400 bg-blue-400/10 border-blue-400/25',
    resumen:
      'La intensidad sube semana a semana mientras el volumen baja de forma controlada. Es el modelo más simple y el más efectivo para atletas en sus primeros 1-2 años de entrenamiento estructurado.',
    cuandoUsarla: [
      'Atleta nuevo o en sus primeros meses de powerlifting estructurado',
      'Regreso de lesión donde se necesita predictibilidad',
      'Bloque corto de peaking de 4-6 semanas hacia una competición',
      'Atleta que no responde bien a la variación excesiva de estímulos',
    ],
    perfilIdeal: [
      'Nivel: principiante a intermedio',
      'Experiencia: menos de 2 años de entrenamiento serio',
      'Objetivo: aprender técnica y construir base de fuerza',
      'Disponibilidad: 3 días/semana mínimo',
    ],
    estructura: [
      { fase: 'Semana 1-2', semanas: 'Acumulación', descripcion: 'Volumen alto (4-5 series), intensidad baja (65-72%), RPE 6-7. El atleta se adapta al estrés.' },
      { fase: 'Semana 3-4', semanas: 'Intensificación', descripcion: 'Volumen medio (3-4 series), intensidad media (73-80%), RPE 7-8. Empieza a aparecer la fuerza.' },
      { fase: 'Semana 5-6', semanas: 'Pico', descripcion: 'Volumen bajo (2-3 series), intensidad alta (82-90%), RPE 8-9. El atleta expresa la fuerza acumulada.' },
      { fase: 'Semana 7', semanas: 'Deload', descripcion: 'Volumen reducido al 50%, misma intensidad. El sistema nervioso se recupera antes del siguiente ciclo.' },
    ],
    bloqueRV: ['H', 'F', 'V', 'P', 'T'],
    pros: [
      'Fácil de planificar y de seguir para el atleta',
      'Progresión predecible — el coach puede estimar el peak con semanas de anticipación',
      'Ideal para construir la base técnica sin sobrecargar al atleta',
      'Bajo riesgo de sobreentrenamiento cuando el volumen está bien calibrado',
    ],
    contras: [
      'La adaptación se detiene después de 8-12 semanas para atletas intermedios+',
      'Poca variación puede generar estancamiento mental',
      'No aborda múltiples cualidades físicas al mismo tiempo',
      'Para atletas avanzados, el progreso semana a semana se vuelve imposible',
    ],
    nota: 'En el Método RV se usa la progresión lineal DENTRO de cada bloque (H → F → V → P → T). No confundir el modelo completo con cada fase individual.',
  },
  {
    id: 'dup',
    nombre: 'Ondulante (DUP)',
    subtitulo: 'Daily Undulating Periodization',
    nivel: 'intermedio',
    tag: 'DUP',
    tagColor: 'text-[#FFB800] bg-[#FFB800]/10 border-[#FFB800]/25',
    resumen:
      'La intensidad y el volumen cambian día a día dentro de la misma semana. Cada sesión tiene un objetivo diferente (fuerza, hipertrofia, potencia), lo que permite estimular múltiples adaptaciones simultáneamente.',
    cuandoUsarla: [
      'Atleta intermedio que ya superó los beneficios de la progresión lineal',
      'Cuando se quiere mejorar fuerza e hipertrofia al mismo tiempo',
      'Atletas que se aburren o estancan con la monotonía del lineal',
      'Bloques de base de 8-16 semanas sin fecha de competición cercana',
    ],
    perfilIdeal: [
      'Nivel: intermedio a avanzado',
      'Experiencia: 2+ años de entrenamiento estructurado',
      'Objetivo: romper plateau, construir fuerza y masa simultáneamente',
      'Disponibilidad: 3-4 días/semana (los días importan)',
    ],
    estructura: [
      { fase: 'Día de Fuerza', semanas: 'Lunes / miércoles', descripcion: 'Series bajas, cargas altas. Ej: 4x3 al 85-90%. RPE 8-9. Entrena el sistema nervioso.' },
      { fase: 'Día de Hipertrofia', semanas: 'Martes / viernes', descripcion: 'Series moderadas, repeticiones altas. Ej: 4x8 al 68-72%. RPE 7-8. Estimula el músculo.' },
      { fase: 'Día de Potencia', semanas: 'Jueves / sábado', descripcion: 'Series cortas, velocidad alta. Ej: 6x2 al 75% moviéndolo rápido. RPE 6-7. Entrena la velocidad de la barra.' },
    ],
    ejemploSemanal: [
      { dia: 'Lunes', tipo: 'Fuerza', descripcion: 'Sentadilla 4x3 @87% · Banca 4x3 @85%' },
      { dia: 'Martes', tipo: 'Hipertrofia', descripcion: 'Sentadilla 4x8 @70% · Peso Muerto 3x6 @72%' },
      { dia: 'Jueves', tipo: 'Hipertrofia', descripcion: 'Banca 4x8 @68% · Press inclinado 3x10' },
      { dia: 'Viernes', tipo: 'Fuerza', descripcion: 'Peso Muerto 3x3 @88% · Sentadilla pausa 3x5 @75%' },
    ],
    bloqueRV: ['H', 'F', 'V'],
    pros: [
      'Previene el estancamiento — el cuerpo no se adapta a un solo estímulo',
      'Permite trabajar fuerza e hipertrofia en la misma semana',
      'Mayor frecuencia por patrón de movimiento',
      'Evidencia científica sólida para atletas intermedios+',
    ],
    contras: [
      'Más difícil de planificar: cada sesión tiene lógica diferente',
      'Requiere que el atleta entienda la diferencia entre los días',
      'Si el volumen total es alto, el riesgo de fatiga acumulada sube',
      'No recomendado para principiantes (falta base técnica)',
    ],
    nota: 'El Método RV integra lógica DUP especialmente en los bloques de Volumen y Fuerza Base, donde se alternan días de alta y baja intensidad dentro de la misma semana.',
  },
  {
    id: 'conjugada',
    nombre: 'Conjugada',
    subtitulo: 'Westside — fuerza máxima + velocidad + volumen simultáneos',
    nivel: 'avanzado',
    tag: 'Conjugada',
    tagColor: 'text-purple-400 bg-purple-400/10 border-purple-400/25',
    resumen:
      'Tres tipos de sesiones corren en paralelo durante toda la temporada: Max Effort (ME), Dynamic Effort (DE) y días de repetición. El ejercicio principal rota cada 3 semanas para evitar la acomodación neurológica.',
    cuandoUsarla: [
      'Atleta avanzado que necesita desarrollar fuerza máxima Y velocidad de la barra al mismo tiempo',
      'Cuando el atleta tiene puntos débiles específicos que necesita atacar con ejercicios especiales',
      'Temporadas largas sin competición cercana (12+ semanas)',
      'Coach con experiencia — esta metodología necesita supervisión constante',
    ],
    perfilIdeal: [
      'Nivel: avanzado (3+ años de powerlifting)',
      'Total de competición consolidado, no en período de aprendizaje técnico',
      'Buena conciencia corporal — el atleta detecta si algo no funciona',
      'Disponibilidad: 4 días/semana (2 piernas + 2 press)',
    ],
    estructura: [
      { fase: 'Día ME Piernas', semanas: '2 veces por semana', descripcion: 'Ejercicio principal al máximo esfuerzo (1-3RM). Sentadilla caja, sentadilla safety bar, buenos días, etc. Rota cada 3 semanas.' },
      { fase: 'Día DE Piernas', semanas: '2 veces por semana', descripcion: '8-10 series de 2 repeticiones al 50-60% moviéndolo máximo. Bandas/cadenas opcionales. Entrena la aceleración.' },
      { fase: 'Día ME Press', semanas: '2 veces por semana', descripcion: 'Press de banca a máximo esfuerzo con variante rotativa: agarre cerrado, board press, press con cadenas, etc.' },
      { fase: 'Día DE Press', semanas: '2 veces por semana', descripcion: '8-10x3 al 50-55% ejecutado explosivamente. Controla el tiempo bajo tensión en la bajada, explota en el empuje.' },
    ],
    ejemploSemanal: [
      { dia: 'Lunes', tipo: 'ME Piernas', descripcion: 'Sentadilla caja 1RM → Accesorios de punto débil' },
      { dia: 'Martes', tipo: 'ME Press', descripcion: 'Banca agarre cerrado 1RM → Tríceps + espalda' },
      { dia: 'Jueves', tipo: 'DE Piernas', descripcion: '10x2 @55% + bandas → Buenos días 3x8' },
      { dia: 'Viernes', tipo: 'DE Press', descripcion: '9x3 @50% → Hombros + bíceps + back' },
    ],
    bloqueRV: ['F', 'V', 'P'],
    pros: [
      'Desarrolla fuerza máxima Y velocidad — cualidades complementarias',
      'La rotación de ejercicios cada 3 semanas previene la acomodación neurológica',
      'Permite mucho trabajo de accesorios para puntos débiles',
      'Muy efectivo para atletas que han alcanzado su techo con otros métodos',
    ],
    contras: [
      'Complejidad alta — requiere que el coach y el atleta entiendan la lógica profunda',
      'El DE con bandas/cadenas requiere equipamiento específico',
      'Riesgo de sobreentrenamiento si ME se ejecuta con demasiada frecuencia',
      'No hay un "peaking" claro — la transición a competición requiere ajuste adicional',
    ],
    nota: 'En el contexto RV, se recomienda usar la lógica conjugada principalmente durante el bloque de Fuerza Base y Volumen. Hacia el Peaking se regresa a ejercicios de competición con progresión más lineal.',
  },
  {
    id: 'bottomup',
    nombre: 'Bottom-Up',
    subtitulo: 'De los accesorios a los levantamientos de competición',
    nivel: 'principiante',
    tag: 'Bottom-Up',
    tagColor: 'text-green-400 bg-green-400/10 border-green-400/25',
    resumen:
      'El plan comienza con ejercicios accesorios e isométricos que construyen la musculatura y los patrones de movimiento desde cero. Los levantamientos de competición (Squat, Bench, Deadlift) se introducen progresivamente una vez que la base está consolidada.',
    cuandoUsarla: [
      'Atleta completamente nuevo en powerlifting sin base técnica',
      'Regreso de lesión — se reconstruye desde los músculos estabilizadores',
      'Atleta con puntos débiles severos (core débil, espalda alta limitante en el jalón)',
      'Temporadas de off-season donde el objetivo es construir masa sin riesgo técnico',
    ],
    perfilIdeal: [
      'Nivel: principiante absoluto o en recuperación',
      'Sin patrones de movimiento consolidados en los Big 3',
      'Historial de lesiones que impide cargar directamente los levantamientos',
      'Atleta que necesita mucho volumen accesorio para ganar masa muscular',
    ],
    estructura: [
      { fase: 'Fase 1 — Base (4-6 sem)', semanas: 'Sem 1-6', descripcion: 'Isométricos, ejercicios unilaterales, core, movilidad. Sin barras de competición. El atleta aprende a controlar su cuerpo.' },
      { fase: 'Fase 2 — GPP (4-6 sem)', semanas: 'Sem 7-12', descripcion: 'Introducción de patrones con barra (sin mucho peso). Goblet squat → sentadilla baja barra. Hip hinge → peso muerto rumano. Empuje → press de banca con mancuernas.' },
      { fase: 'Fase 3 — Transición (3-4 sem)', semanas: 'Sem 13-16', descripcion: 'Los Big 3 aparecen con cargas bajas (RPE 5-6). El atleta consolida la técnica bajo carga real antes de progresar.' },
      { fase: 'Fase 4 — Especificidad (4-6 sem)', semanas: 'Sem 17-22', descripcion: 'Periodización normal (lineal o DUP) ya con los levantamientos de competición. Ahora el atleta tiene la base para progresar.' },
    ],
    bloqueRV: ['H', 'F'],
    pros: [
      'Previene lesiones — el cuerpo se prepara antes de cargar patrones complejos',
      'Construye músculo que sirve de "armadura" para las cargas futuras',
      'El atleta llega a los Big 3 con mejor técnica que si los hubiera empezado desde el día 1',
      'Muy útil después de lesiones — el regreso es más seguro y sostenible',
    ],
    contras: [
      'El atleta puede frustrase por no "sentirse" como powerlifter en las primeras semanas',
      'Requiere paciencia — los beneficios en los Big 3 se ven después de meses',
      'No apto para atletas con competición cercana (< 12 semanas)',
      'Difícil de vender a atletas que quieren "levantar pesado ya"',
    ],
    nota: 'En el Método RV el bottom-up es la metodología preferida para nuevos atletas. La secuencia de bloques RV (H → F → V → P → T) ya incorpora esta lógica: el Bloque H es el "fondo" y el T es el "peak".',
  },
];

// ── Constants ─────────────────────────────────────────────────────────────────

const NIVEL_LABEL: Record<string, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

const NIVEL_COLOR: Record<string, string> = {
  principiante: 'text-green-400 bg-green-400/10 border-green-400/25',
  intermedio: 'text-[#FFB800] bg-[#FFB800]/10 border-[#FFB800]/25',
  avanzado: 'text-purple-400 bg-purple-400/10 border-purple-400/25',
};

const BLOQUE_LABEL: Record<string, string> = {
  H: 'Hipertrofia',
  F: 'Fuerza Base',
  V: 'Volumen',
  P: 'Peaking',
  T: 'Tapering',
};

const BLOQUE_COLOR: Record<string, string> = {
  H: 'bg-blue-500/20 text-blue-300 border border-blue-500/20',
  F: 'bg-[#FF4500]/15 text-[#FF4500] border border-[#FF4500]/20',
  V: 'bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/20',
  P: 'bg-purple-500/15 text-purple-300 border border-purple-500/20',
  T: 'bg-green-500/15 text-green-300 border border-green-500/20',
};

// ── Auxiliares & Compensatorios data ─────────────────────────────────────────

const BLOQUES_GUIA = [
  {
    clave: 'H',
    nombre: 'Hipertrofia',
    color: 'text-blue-300',
    border: 'border-blue-500/25',
    bg: 'bg-blue-500/5',
    objetivo: 'Construir masa muscular que sirva de base para las cargas futuras.',
    auxiliares: {
      rir: '2-3',
      series: '3-4 series / ejercicio',
      reps: '8-12 repeticiones',
      criterio: 'Volumen alto, cargas moderadas. El auxiliar complementa el patrón principal.',
      ejemplos: ['Sentadilla pausa', 'Press inclinado', 'RDL', 'Press agarre cerrado', 'Buenos días'],
      nota: 'Prioriza la conexión muscular sobre la carga. RIR 2-3 significa que terminas sabiendo que podrías hacer 2-3 reps más.',
    },
    compensatorios: {
      rir: '3-4',
      series: '2-3 series / ejercicio',
      reps: '12-15+ repeticiones',
      criterio: 'Siempre cómodos. El objetivo es perfundir sangre al músculo y corregir desequilibrios.',
      ejemplos: ['Face pull', 'Band pull-apart', 'Nordic curl', 'Hip flexor', 'Rotador de cadera'],
      nota: 'Nunca deben fatigar. Son trabajo de construcción de base muscular, no de rendimiento.',
    },
  },
  {
    clave: 'F',
    nombre: 'Fuerza Base',
    color: 'text-[#FF4500]',
    border: 'border-[#FF4500]/25',
    bg: 'bg-[#FF4500]/5',
    objetivo: 'Aumentar la fuerza máxima en patrones de movimiento específicos.',
    auxiliares: {
      rir: '1-2',
      series: '2-4 series / ejercicio',
      reps: '4-6 repeticiones',
      criterio: 'Mayor esfuerzo que en Hiper. El auxiliar ataca el punto de quiebre del atleta.',
      ejemplos: ['Sentadilla caja baja', 'Banca pausa larga', 'Déficit deadlift', 'Good morning pesado', 'SSB squat'],
      nota: 'RIR 1-2 en auxiliares de fuerza es lo máximo que debes llegar. No tomes el auxiliar a RIR 0 — reserva eso para los levantamientos principales.',
    },
    compensatorios: {
      rir: '2-3',
      series: '2-3 series / ejercicio',
      reps: '10-15 repeticiones',
      criterio: 'Se mantienen a intensidad baja. La fatiga acumulada en el bloque de fuerza hace que los compensatorios sean críticos para la recuperación.',
      ejemplos: ['Face pull', 'Remo en polea', 'Curl nórdico', 'Extensión de cadera', 'Core antirotacional'],
      nota: 'Si la fatiga es alta, aumenta las series compensatorias. Son tu "mantenimiento preventivo".',
    },
  },
  {
    clave: 'V',
    nombre: 'Volumen',
    color: 'text-[#FFB800]',
    border: 'border-[#FFB800]/25',
    bg: 'bg-[#FFB800]/5',
    objetivo: 'Acumular la mayor cantidad de trabajo recuperable para pico de fuerza posterior.',
    auxiliares: {
      rir: '2-3',
      series: '3-5 series / ejercicio',
      reps: '6-10 repeticiones',
      criterio: 'Volumen alto, esfuerzo moderado. El objetivo es acumular tonelaje sin exceder el MRV.',
      ejemplos: ['Press inclinado con mancuernas', 'Remo inclinado', 'Sentadilla frontal', 'Jalón prono', 'Hip thrust'],
      nota: 'En este bloque el auxiliar suma al volumen total del músculo. Monitorea el dashboard de volumen muscular.',
    },
    compensatorios: {
      rir: '3-4',
      series: '2-3 series / ejercicio',
      reps: '12-20 repeticiones',
      criterio: 'Muy cómodos. Con el volumen total del bloque siendo alto, los compensatorios deben ser un descanso activo.',
      ejemplos: ['Face pull', 'Curl de bíceps suave', 'Abductor en máquina', 'Movilidad torácica', 'Extensión lumbar suave'],
      nota: 'Si el atleta llega muy fatigado, reemplaza un auxiliar por un compensatorio. Nunca al revés.',
    },
  },
  {
    clave: 'P',
    nombre: 'Peaking',
    color: 'text-purple-300',
    border: 'border-purple-500/25',
    bg: 'bg-purple-500/5',
    objetivo: 'Expresar la fuerza acumulada. Reducir volumen, subir intensidad.',
    auxiliares: {
      rir: '2-3',
      series: '1-2 series / ejercicio',
      reps: '3-5 repeticiones',
      criterio: 'Se reducen drásticamente. Solo los auxiliares de mayor carryover al levantamiento de competición.',
      ejemplos: ['Sentadilla caja (1 serie)', 'Banca con pausa corta (1 serie)', 'Rack pull (1 serie)'],
      nota: 'Muchos coaches eliminan los auxiliares en las últimas 2 semanas de peaking. Si los mantienes, hazlos mínimos: 1 serie de trabajo real.',
    },
    compensatorios: {
      rir: '3-4',
      series: '1-2 series / ejercicio',
      reps: '15+ repeticiones',
      criterio: 'Se mantienen o aumentan ligeramente para contrarrestar la mayor intensidad de los levantamientos principales.',
      ejemplos: ['Face pull', 'Band pull-apart', 'Movilidad de cadera', 'Core suave', 'Trabajo de manguito'],
      nota: 'Los compensatorios son lo último que recortas. Protegen articulaciones bajo cargas máximas.',
    },
  },
  {
    clave: 'T',
    nombre: 'Tapering / Descarga',
    color: 'text-green-300',
    border: 'border-green-500/25',
    bg: 'bg-green-500/5',
    objetivo: 'Recuperar el sistema nervioso antes de competición o del siguiente macrociclo.',
    auxiliares: {
      rir: '0 — 1 (token)',
      series: '1 serie ligera / ejercicio (o eliminar)',
      reps: '10-15 repeticiones con carga muy baja',
      criterio: 'RIR "0" en descarga NO significa ir al fallo. Significa que la carga es tan ligera que el esfuerzo es prácticamente nulo — se mantiene el patrón motor sin crear fatiga.',
      ejemplos: ['Sentadilla pausa con barra vacía (patrón)', 'Press con mancuerna ligera (fluidez)', 'RDL con barra ligera (activación)'],
      nota: '⭐ Esta es la respuesta a tu duda: SÍ puedes usar RIR "0" en descarga para auxiliares. El número no indica esfuerzo máximo, indica que el peso es tan ligero que técnicamente no acumulas fatiga. Es trabajo de mantenimiento de patrón motor.',
    },
    compensatorios: {
      rir: '0 (recovery activo) o eliminar',
      series: '1 serie muy suave o sesión de movilidad',
      reps: 'Sin límite — fluido y cómodo',
      criterio: 'Los compensatorios en tapering son recuperación activa. Pueden reemplazarse por sesiones de foam rolling, movilidad, o trabajo de respiración.',
      ejemplos: ['Movilidad torácica', 'Estiramiento de cadera', 'Face pull con banda muy ligera', 'Respiración diafragmática'],
      nota: 'Aquí los compensatorios son opcionales. Si el atleta está descansado y sin dolor, elimínalos y prioriza el descanso total.',
    },
  },
];

const DIFERENCIAS_CARD = [
  {
    tipo: 'Auxiliar',
    color: 'text-[#FFB800]',
    border: 'border-[#FFB800]/25',
    bg: 'bg-[#FFB800]/5',
    icono: '⚙',
    definicion: 'Ejercicio que mejora directamente un levantamiento de competición atacando un punto débil específico (patrón, palanca, zona de quiebre).',
    relacion: 'Alta relación con el Big 3 objetivo. Mismos músculos, patrón similar.',
    intensidad: 'Sigue la intensidad del bloque (más cercano al esfuerzo que los compensatorios)',
    ejemplos: ['Sentadilla pausa → Fuerza en el hoyo', 'Banca con tablero → Lockout débil', 'Déficit deadlift → Jalón del piso flojo', 'Good morning → Espalda baja en el squat', 'Press agarre cerrado → Tríceps en banca'],
    cuando: 'Siempre que haya un punto de quiebre identificado o un patrón que reforzar dentro del mismo bloque.',
  },
  {
    tipo: 'Compensatorio',
    color: 'text-green-300',
    border: 'border-green-500/25',
    bg: 'bg-green-500/5',
    icono: '🛡',
    definicion: 'Ejercicio que corrige desequilibrios musculares, protege articulaciones y previene lesiones. No mejora directamente el levantamiento principal.',
    relacion: 'Baja o ninguna relación directa con el Big 3. Músculos antagonistas o estabilizadores.',
    intensidad: 'Siempre baja, independientemente del bloque. RIR 3-4 como mínimo.',
    ejemplos: ['Face pull → Manguito rotador / postura', 'Nordic curl → Equilibrio IQ/cuád', 'Hip flexor → Movilidad de cadera', 'Band pull-apart → Salud escapular', 'Reverse hyper → Descompresión lumbar'],
    cuando: 'Siempre, especialmente cuando hay dolor, fatiga acumulada, o desequilibrios detectados.',
  },
];

// ── RPE / RIR table (Helms et al.) ───────────────────────────────────────────

// [reps 1..12] as index 0..11
const RPE_TABLE: Record<number, number[]> = {
  10:  [100,  95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0],
  9.5: [97.8, 93.9, 90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7],
  9:   [95.5, 92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3],
  8.5: [93.9, 90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0],
  8:   [92.2, 89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6],
  7.5: [90.7, 87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0, 61.3],
  7:   [89.2, 86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6, 59.9],
  6.5: [87.8, 85.0, 82.4, 79.9, 77.4, 75.1, 72.3, 69.4, 66.7, 64.0, 61.3, 58.6],
  6:   [86.3, 83.7, 81.1, 78.6, 76.2, 73.9, 70.7, 68.0, 65.3, 62.6, 59.9, 57.3],
};

const RPE_ROWS = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6];
// Escala Zourdos/Helms: cada paso de 0.5 RPE = 1 RIR entero
// RPE 9.5 ≠ RIR 0.5 — RPE 9.5 = RIR 1 (fórmula: RIR = (10 − RPE) × 2)
const RIR_MAP: Record<number, number> = { 10: 0, 9.5: 1, 9: 2, 8.5: 3, 8: 4, 7.5: 5, 7: 6, 6.5: 7, 6: 8 };

function getPct(rpe: number, reps: number): number | null {
  const row = RPE_TABLE[rpe];
  if (!row || reps < 1 || reps > 12) return null;
  return row[reps - 1];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MetodologiasPage() {
  const [tab, setTab] = useState<'tipos' | 'auxiliares' | 'rpe'>('tipos');
  const [activa, setActiva] = useState<string | null>(null);
  const [filtroNivel, setFiltroNivel] = useState('');
  const [bloqueAux, setBloqueAux] = useState<string>('H');

  // Tabla hover
  const [hoverCell, setHoverCell] = useState<{ rpe: number; reps: number } | null>(null);

  // Calculadora modo A: peso + reps + RPE → 1RM y % 1RM
  const [calcPeso, setCalcPeso]   = useState('');
  const [calcReps, setCalcReps]   = useState('');
  const [calcRPE,  setCalcRPE]    = useState('');

  // Calculadora modo B: 1RM + reps objetivo + RPE objetivo → peso a usar
  const [calcRM,       setCalcRM]       = useState('');
  const [calcTargReps, setCalcTargReps] = useState('');
  const [calcTargRPE,  setCalcTargRPE]  = useState('');

  // Resultados calculadora
  const resultA = useMemo(() => {
    const p = parseFloat(calcPeso), r = parseInt(calcReps), rpe = parseFloat(calcRPE);
    if (!p || !r || !rpe) return null;
    const pct = getPct(rpe, r);
    if (!pct) return null;
    const rm = Math.round((p / pct) * 100 * 10) / 10;
    return { pct, rm };
  }, [calcPeso, calcReps, calcRPE]);

  const resultB = useMemo(() => {
    const rm = parseFloat(calcRM), r = parseInt(calcTargReps), rpe = parseFloat(calcTargRPE);
    if (!rm || !r || !rpe) return null;
    const pct = getPct(rpe, r);
    if (!pct) return null;
    const peso = Math.round((rm * pct / 100) * 4) / 4; // round to nearest 0.25
    return { pct, peso };
  }, [calcRM, calcTargReps, calcTargRPE]);

  const RPE_OPTIONS = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6];

  const filtradas = METODOLOGIAS.filter(m =>
    filtroNivel === '' || m.nivel === filtroNivel
  );

  const guiaActiva = BLOQUES_GUIA.find(b => b.clave === bloqueAux) ?? BLOQUES_GUIA[0];

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Metodologías de Entrenamiento</h1>
          <p className="text-gray-500 text-sm">
            Referencia del coach — periodización, auxiliares y compensatorios por bloque
          </p>
        </div>

        {/* Main tab selector */}
        <div className="flex gap-1 mb-8 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit flex-wrap">
          <button
            onClick={() => setTab('tipos')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'tipos' ? 'bg-[#FF4500] text-white' : 'text-gray-500 hover:text-white'
            }`}
          >
            Tipos de periodización
          </button>
          <button
            onClick={() => setTab('auxiliares')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'auxiliares' ? 'bg-[#FF4500] text-white' : 'text-gray-500 hover:text-white'
            }`}
          >
            Auxiliares &amp; Compensatorios
          </button>
          <button
            onClick={() => setTab('rpe')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'rpe' ? 'bg-[#FF4500] text-white' : 'text-gray-500 hover:text-white'
            }`}
          >
            RPE &amp; RIR
          </button>
        </div>

        {/* ══════════════════════════════════════════════════════
            TAB: TIPOS DE PERIODIZACIÓN
        ══════════════════════════════════════════════════════ */}
        {tab === 'tipos' && <>

        {/* Resumen visual rápido */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {METODOLOGIAS.map(m => (
            <button
              key={m.id}
              onClick={() => setActiva(activa === m.id ? null : m.id)}
              className={`rounded-xl border p-4 text-left transition-all ${
                activa === m.id
                  ? 'border-[#FF4500]/50 bg-[#FF4500]/5'
                  : 'border-gray-800 bg-gray-900 hover:border-gray-700'
              }`}
            >
              <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border ${m.tagColor}`}>
                {m.tag}
              </span>
              <p className="text-white text-sm font-semibold mt-2 leading-snug">{m.nombre}</p>
              <p className="text-gray-600 text-xs mt-0.5 truncate">{m.subtitulo}</p>
              <span className={`inline-block mt-2 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${NIVEL_COLOR[m.nivel]}`}>
                {NIVEL_LABEL[m.nivel]}
              </span>
            </button>
          ))}
        </div>

        {/* Filtro */}
        <div className="flex gap-2 mb-6">
          {['', 'principiante', 'intermedio', 'avanzado'].map(n => (
            <button
              key={n}
              onClick={() => setFiltroNivel(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filtroNivel === n
                  ? 'bg-[#FF4500] text-white'
                  : 'bg-gray-900 border border-gray-800 text-gray-500 hover:text-white'
              }`}
            >
              {n === '' ? 'Todos' : NIVEL_LABEL[n]}
            </button>
          ))}
        </div>

        {/* Cards expandibles */}
        <div className="space-y-4">
          {filtradas.map(m => {
            const isOpen = activa === m.id;
            return (
              <div
                key={m.id}
                className={`border rounded-2xl overflow-hidden bg-gray-900 transition-all ${
                  isOpen ? 'border-gray-600' : 'border-gray-800'
                }`}
              >
                {/* Header de la card */}
                <button
                  onClick={() => setActiva(isOpen ? null : m.id)}
                  className="w-full px-6 py-5 flex items-start justify-between text-left hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${m.tagColor}`}>
                          {m.tag}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${NIVEL_COLOR[m.nivel]}`}>
                          {NIVEL_LABEL[m.nivel]}
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-white">{m.nombre}</h2>
                      <p className="text-gray-500 text-sm">{m.subtitulo}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4 mt-1">
                    <div className="flex gap-1">
                      {m.bloqueRV.map(b => (
                        <span key={b} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${BLOQUE_COLOR[b]}`}>
                          {b}
                        </span>
                      ))}
                    </div>
                    <span className="text-gray-600 text-sm">{isOpen ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* Contenido expandido */}
                {isOpen && (
                  <div className="border-t border-gray-800 px-6 py-6 space-y-8">

                    {/* Resumen */}
                    <p className="text-gray-300 text-sm leading-relaxed">{m.resumen}</p>

                    {/* Grid: ¿Cuándo usarla? + Perfil ideal */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-xs font-bold text-[#FFB800] uppercase tracking-widest mb-3">
                          ¿Cuándo usarla?
                        </h3>
                        <ul className="space-y-2">
                          {m.cuandoUsarla.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                              <span className="text-[#FF4500] mt-0.5 shrink-0">→</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-[#FFB800] uppercase tracking-widest mb-3">
                          Perfil del atleta ideal
                        </h3>
                        <ul className="space-y-2">
                          {m.perfilIdeal.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                              <span className="text-gray-600 mt-0.5 shrink-0">·</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Estructura */}
                    <div>
                      <h3 className="text-xs font-bold text-[#FFB800] uppercase tracking-widest mb-3">
                        Estructura del bloque
                      </h3>
                      <div className="space-y-2">
                        {m.estructura.map((fase, i) => (
                          <div key={i} className="flex gap-4 bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-3">
                            <div className="shrink-0 w-28">
                              <p className="text-xs font-bold text-white">{fase.fase}</p>
                              <p className="text-[10px] text-gray-600 mt-0.5">{fase.semanas}</p>
                            </div>
                            <p className="text-sm text-gray-400 leading-relaxed">{fase.descripcion}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Ejemplo semanal si existe */}
                    {m.ejemploSemanal && (
                      <div>
                        <h3 className="text-xs font-bold text-[#FFB800] uppercase tracking-widest mb-3">
                          Ejemplo semanal
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {m.ejemploSemanal.map((d, i) => (
                            <div key={i} className="flex items-start gap-3 bg-gray-800/30 border border-gray-700/30 rounded-lg px-3 py-2.5">
                              <div className="shrink-0 w-16">
                                <p className="text-xs font-bold text-white">{d.dia}</p>
                                <p className="text-[10px] text-[#FF4500] font-semibold mt-0.5">{d.tipo}</p>
                              </div>
                              <p className="text-xs text-gray-400">{d.descripcion}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bloques RV donde aplica */}
                    <div>
                      <h3 className="text-xs font-bold text-[#FFB800] uppercase tracking-widest mb-3">
                        Bloques RV donde se aplica
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {['H', 'F', 'V', 'P', 'T'].map(b => (
                          <span
                            key={b}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              m.bloqueRV.includes(b)
                                ? BLOQUE_COLOR[b]
                                : 'bg-gray-800/30 text-gray-700 border border-gray-800'
                            }`}
                          >
                            {BLOQUE_LABEL[b]}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Pros y Contras */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-xs font-bold text-green-400 uppercase tracking-widest mb-3">
                          Ventajas
                        </h3>
                        <ul className="space-y-2">
                          {m.pros.map((p, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                              <span className="text-green-400 mt-0.5 shrink-0">✓</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3">
                          Limitaciones
                        </h3>
                        <ul className="space-y-2">
                          {m.contras.map((c, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                              <span className="text-red-400 mt-0.5 shrink-0">✕</span>
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Nota del Método RV */}
                    <div className="bg-[#FF4500]/5 border border-[#FF4500]/20 rounded-xl px-5 py-4">
                      <p className="text-xs font-bold text-[#FF4500] uppercase tracking-widest mb-1.5">
                        Nota — Método RV
                      </p>
                      <p className="text-sm text-gray-300 leading-relaxed">{m.nota}</p>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Tabla comparativa al fondo */}
        <div className="mt-12 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/60">
            <h2 className="text-sm font-bold text-white">Comparativa rápida</h2>
            <p className="text-xs text-gray-600 mt-0.5">Para elegir de un vistazo cuál usar con cada atleta</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/40">
                  <th className="text-left px-5 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">Metodología</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">Nivel</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">Duración típica</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">Frecuencia</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">Prioridad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {[
                  { nombre: 'Lineal', nivel: 'Principiante', dur: '4-8 semanas', freq: '3-4 días', prio: 'Técnica + progresión', color: 'text-blue-400' },
                  { nombre: 'Ondulante (DUP)', nivel: 'Intermedio', dur: '8-16 semanas', freq: '3-4 días', prio: 'Fuerza + hipertrofia', color: 'text-[#FFB800]' },
                  { nombre: 'Conjugada', nivel: 'Avanzado', dur: '12+ semanas', freq: '4 días', prio: 'Fuerza máxima + velocidad', color: 'text-purple-400' },
                  { nombre: 'Bottom-Up', nivel: 'Principiante / rehab', dur: '16-24 semanas', freq: '3-4 días', prio: 'Base muscular + técnica', color: 'text-green-400' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-gray-800/20 transition-colors">
                    <td className={`px-5 py-3 font-semibold ${row.color}`}>{row.nombre}</td>
                    <td className="px-4 py-3 text-gray-400">{row.nivel}</td>
                    <td className="px-4 py-3 text-gray-400">{row.dur}</td>
                    <td className="px-4 py-3 text-gray-400">{row.freq}</td>
                    <td className="px-4 py-3 text-gray-400">{row.prio}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        </>}

        {/* ══════════════════════════════════════════════════════
            TAB: AUXILIARES & COMPENSATORIOS
        ══════════════════════════════════════════════════════ */}
        {tab === 'auxiliares' && <>

          {/* Qué son */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {DIFERENCIAS_CARD.map(card => (
              <div key={card.tipo} className={`border ${card.border} ${card.bg} rounded-2xl p-5 space-y-3`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{card.icono}</span>
                  <h2 className={`text-base font-bold ${card.color}`}>Ejercicio {card.tipo}</h2>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed">{card.definicion}</p>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Relación con el Big 3</p>
                    <p className="text-gray-400">{card.relacion}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Intensidad</p>
                    <p className="text-gray-400">{card.intensidad}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">¿Cuándo usarlo?</p>
                    <p className="text-gray-400">{card.cuando}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Ejemplos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {card.ejemplos.map((e, i) => (
                        <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{e}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pregunta destacada: RIR 0 en descarga */}
          <div className="bg-[#FFB800]/5 border border-[#FFB800]/30 rounded-2xl px-6 py-5 mb-8">
            <p className="text-xs font-bold text-[#FFB800] uppercase tracking-widest mb-3">Tu duda respondida</p>
            <p className="text-white font-semibold text-sm mb-3">
              ¿Puedo llevar los auxiliares y compensatorios a RIR 0 en el bloque de descarga sin contar la banca principal?
            </p>
            <div className="space-y-2 text-sm text-gray-300 leading-relaxed">
              <p>
                <span className="text-green-400 font-bold">Sí, y es exactamente lo correcto.</span> Pero hay que entender qué significa RIR 0 en contexto de descarga:
              </p>
              <p>
                RIR 0 en descarga <strong className="text-white">no es ir al fallo</strong>. Es programar una carga tan ligera (30-40% del 1RM) que el atleta termina la serie sin ninguna fatiga real. El &quot;0 RIR&quot; se refiere a que no hay esfuerzo perceptible — básicamente es movimiento de recuperación activa.
              </p>
              <p>
                El objetivo es mantener el <strong className="text-white">patrón motor</strong> y activar la musculatura sin generar fatiga neuromuscular. Piénsalo como &quot;recordarle al cuerpo cómo se mueve&quot; sin pagar ningún costo.
              </p>
              <p className="text-gray-400 text-xs mt-2 border-t border-gray-700/50 pt-2">
                En cuanto a la banca principal durante la descarga: los levantamientos de competición (Squat, Bench, DL) siguen un protocolo separado. Se mantienen a RIR 3-4 con el 50-60% del volumen habitual — no se llevan a RIR 0. Los Big 3 necesitan mantener el estímulo neural específico incluso durante la descarga.
              </p>
            </div>
          </div>

          {/* Block selector */}
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">RIR por bloque — selecciona el bloque</p>
          <div className="flex gap-2 overflow-x-auto pb-1 mb-6">
            {BLOQUES_GUIA.map(b => (
              <button
                key={b.clave}
                onClick={() => setBloqueAux(b.clave)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                  bloqueAux === b.clave
                    ? `${b.bg} ${b.border} ${b.color}`
                    : 'bg-gray-900 border-gray-800 text-gray-600 hover:text-white hover:border-gray-700'
                }`}
              >
                {b.nombre}
              </button>
            ))}
          </div>

          {/* Selected block detail */}
          <div className={`border ${guiaActiva.border} rounded-2xl overflow-hidden mb-6`}>
            <div className={`${guiaActiva.bg} px-6 py-4 border-b ${guiaActiva.border}`}>
              <h2 className={`text-lg font-bold ${guiaActiva.color}`}>Bloque {guiaActiva.nombre}</h2>
              <p className="text-gray-400 text-sm mt-0.5">{guiaActiva.objetivo}</p>
            </div>

            <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-800">
              {/* Auxiliares */}
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚙</span>
                  <h3 className="text-sm font-bold text-[#FFB800]">Auxiliares</h3>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-800/60 rounded-xl py-3">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">RIR</p>
                    <p className="text-lg font-black text-[#FFB800]">{guiaActiva.auxiliares.rir}</p>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl py-3">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Series</p>
                    <p className="text-xs font-bold text-white">{guiaActiva.auxiliares.series}</p>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl py-3">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Reps</p>
                    <p className="text-xs font-bold text-white">{guiaActiva.auxiliares.reps}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Criterio de uso</p>
                  <p className="text-sm text-gray-300">{guiaActiva.auxiliares.criterio}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Ejemplos típicos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {guiaActiva.auxiliares.ejemplos.map((e, i) => (
                      <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{e}</span>
                    ))}
                  </div>
                </div>
                {guiaActiva.clave === 'T' ? (
                  <div className="bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-xl px-4 py-3">
                    <p className="text-xs text-[#FFB800] font-bold mb-1">⭐ Nota clave</p>
                    <p className="text-xs text-gray-300">{guiaActiva.auxiliares.nota}</p>
                  </div>
                ) : (
                  <div className="bg-gray-800/40 rounded-xl px-4 py-3">
                    <p className="text-xs text-gray-400">{guiaActiva.auxiliares.nota}</p>
                  </div>
                )}
              </div>

              {/* Compensatorios */}
              <div className="px-6 py-5 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-base">🛡</span>
                  <h3 className="text-sm font-bold text-green-400">Compensatorios</h3>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-gray-800/60 rounded-xl py-3">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">RIR</p>
                    <p className="text-lg font-black text-green-400">{guiaActiva.compensatorios.rir}</p>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl py-3">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Series</p>
                    <p className="text-xs font-bold text-white">{guiaActiva.compensatorios.series}</p>
                  </div>
                  <div className="bg-gray-800/60 rounded-xl py-3">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Reps</p>
                    <p className="text-xs font-bold text-white">{guiaActiva.compensatorios.reps}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Criterio de uso</p>
                  <p className="text-sm text-gray-300">{guiaActiva.compensatorios.criterio}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Ejemplos típicos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {guiaActiva.compensatorios.ejemplos.map((e, i) => (
                      <span key={i} className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">{e}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-gray-800/40 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400">{guiaActiva.compensatorios.nota}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary table */}
          <div className="border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/60">
              <h2 className="text-sm font-bold text-white">Resumen rápido — RIR por bloque</h2>
              <p className="text-xs text-gray-600 mt-0.5">Referencia para programar sin tener que recordar cada detalle</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900/40">
                    <th className="text-left px-5 py-3 text-xs text-gray-500 font-semibold uppercase tracking-wider">Bloque</th>
                    <th className="text-center px-4 py-3 text-xs text-[#FFB800]/70 font-semibold uppercase tracking-wider">Auxiliar RIR</th>
                    <th className="text-center px-4 py-3 text-xs text-[#FFB800]/70 font-semibold uppercase tracking-wider">Series</th>
                    <th className="text-center px-4 py-3 text-xs text-green-400/70 font-semibold uppercase tracking-wider">Comp. RIR</th>
                    <th className="text-center px-4 py-3 text-xs text-green-400/70 font-semibold uppercase tracking-wider">Series</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {BLOQUES_GUIA.map(b => (
                    <tr
                      key={b.clave}
                      onClick={() => setBloqueAux(b.clave)}
                      className={`cursor-pointer transition-colors ${bloqueAux === b.clave ? `${b.bg}` : 'hover:bg-gray-800/20'}`}
                    >
                      <td className={`px-5 py-3 font-bold ${b.color}`}>{b.nombre}</td>
                      <td className="px-4 py-3 text-center text-[#FFB800] font-bold">{b.auxiliares.rir}</td>
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">{b.auxiliares.series}</td>
                      <td className="px-4 py-3 text-center text-green-400 font-bold">{b.compensatorios.rir}</td>
                      <td className="px-4 py-3 text-center text-gray-400 text-xs">{b.compensatorios.series}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 border-t border-gray-800 bg-gray-900/20">
              <p className="text-[10px] text-gray-700">
                RIR = Reps In Reserve (escala entera, 0-8+). En descarga, RIR &quot;0&quot; significa carga tan ligera que no hay fatiga real.
                Conversión a RPE (escala Zourdos): RIR 1 = RPE 9.5 · RIR 2 = RPE 9 · RIR 3 = RPE 8.5 · RIR 4 = RPE 8.
                Los Big 3 en descarga se manejan con protocolo separado (RPE 6-7, 50% del volumen habitual).
              </p>
            </div>
          </div>

        </>}

        {/* ══════════════════════════════════════════════════════
            TAB: RPE & RIR
        ══════════════════════════════════════════════════════ */}
        {tab === 'rpe' && <>

          {/* Diferencia entre RPE y RIR */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <div className="bg-[#FF4500]/5 border border-[#FF4500]/25 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-[#FF4500]">RPE</span>
                <div>
                  <p className="text-white font-bold text-sm">Rate of Perceived Exertion</p>
                  <p className="text-gray-500 text-xs">Esfuerzo percibido</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                Escala del <strong className="text-white">6 al 10</strong> que mide cuánto esfuerzo percibiste en una serie.
                RPE 10 = esfuerzo máximo, no pudiste hacer ni una rep más. RPE 8 = podrías haber hecho 2 más.
              </p>
              <div className="space-y-1.5">
                {[
                  { rpe: '10',  desc: 'Fallo — 0 reps en el tanque' },
                  { rpe: '9.5', desc: '1 rep en el tanque (entre fallar y poder 1 más)' },
                  { rpe: '9',   desc: '2 reps en el tanque' },
                  { rpe: '8.5', desc: '3 reps en el tanque' },
                  { rpe: '8',   desc: '4 reps en el tanque' },
                  { rpe: '7',   desc: '6 reps en el tanque — carga moderada' },
                  { rpe: '6',   desc: '8 reps en el tanque — carga muy leve' },
                ].map(row => (
                  <div key={row.rpe} className="flex items-center gap-3 text-sm">
                    <span className="w-12 text-center font-black text-[#FF4500] shrink-0">{row.rpe}</span>
                    <span className="text-gray-400">{row.desc}</span>
                  </div>
                ))}
              </div>
              <div className="bg-[#FF4500]/10 rounded-xl px-3 py-2 mt-1">
                <p className="text-xs text-[#FF4500] font-semibold">Escala Zourdos (powerlifting): cada 0.5 RPE = 1 RIR entero · Fórmula: RIR = (10 − RPE) × 2</p>
              </div>
            </div>

            <div className="bg-[#FFB800]/5 border border-[#FFB800]/25 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-[#FFB800]">RIR</span>
                <div>
                  <p className="text-white font-bold text-sm">Reps In Reserve</p>
                  <p className="text-gray-500 text-xs">Repeticiones en reserva</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                Número de repeticiones que <strong className="text-white">te quedan en el tanque</strong> al terminar la serie.
                RIR 0 = fallo. RIR 3 = podrías hacer 3 más. Es la cara inversa del RPE.
              </p>
              <div className="space-y-1.5">
                {[
                  { rir: '0',  desc: 'Fallo — no puedes hacer ninguna rep más' },
                  { rir: '1',  desc: 'Podías hacer 1 más, pero te detuviste' },
                  { rir: '2',  desc: 'Podías hacer 2 más' },
                  { rir: '3',  desc: 'Podías hacer 3 más — esfuerzo moderado-alto' },
                  { rir: '4+', desc: 'Podías hacer 4 o más — esfuerzo leve' },
                ].map(row => (
                  <div key={row.rir} className="flex items-center gap-3 text-sm">
                    <span className="w-10 text-center font-black text-[#FFB800] shrink-0">{row.rir}</span>
                    <span className="text-gray-400">{row.desc}</span>
                  </div>
                ))}
              </div>
              <div className="bg-[#FFB800]/10 rounded-xl px-3 py-2 mt-1 space-y-1">
                <p className="text-xs text-[#FFB800] font-semibold">Fórmula (escala Zourdos): RIR = (10 − RPE) × 2</p>
                <p className="text-xs text-orange-400 font-semibold">⚠ RPE 9.5 ≠ RIR 0.5 — RPE 9.5 = RIR 1 · RPE 8 = RIR 4 · RPE 8.5 = RIR 3</p>
              </div>
            </div>
          </div>

          {/* Cómo usarlos */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-8">
            <h2 className="text-sm font-bold text-white mb-4">¿Cuál usar y cómo?</h2>
            <div className="grid md:grid-cols-3 gap-5">
              <div>
                <p className="text-xs font-bold text-[#FF4500] uppercase tracking-wider mb-2">Para programar</p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Usa <strong className="text-white">RPE</strong> para definir la intensidad del ejercicio principal. &quot;Sentadilla 4x3 @RPE 8&quot; le dice al atleta que cada serie termine cuando aún le quedan 2 reps.
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-[#FFB800] uppercase tracking-wider mb-2">Para auxiliares</p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  Usa <strong className="text-white">RIR</strong> — es más intuitivo para ejercicios accesorios. &quot;RDL 3x8 RIR 3&quot; es más claro que calcular RPE en un ejercicio no competitivo.
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">Para ajuste en vivo</p>
                <p className="text-sm text-gray-300 leading-relaxed">
                  El atleta reporta el RPE real. Si programaste RPE 8 y reportó 9.5 varias semanas, hay fatiga acumulada o el peso está mal calibrado.
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800 bg-gray-800/30 rounded-xl px-4 py-3 space-y-2">
              <p className="text-xs font-bold text-white">Regla de oro del Método RV</p>
              <p className="text-xs text-gray-400">
                RPE reportado &lt; programado − 1 → sube 2.5–5 kg la próxima sesión &nbsp;·&nbsp;
                RPE reportado &gt; programado + 0.5 en 3 sesiones seguidas → alerta de fatiga, reduce volumen.
              </p>
              <p className="text-xs text-orange-400 font-semibold pt-1 border-t border-gray-700/50">
                Recuerda: en la escala Zourdos (powerlifting), RPE 9.5 = 1 RIR, NO 0.5 RIR.
                La fórmula es RIR = (10 − RPE) × 2. Un RPE de 8 son 4 reps en el tanque, no 2.
              </p>
            </div>
          </div>

          {/* Tabla interactiva */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white">Tabla RPE → % del 1RM</h2>
              <p className="text-xs text-gray-600">Pasa el cursor sobre una celda para resaltar</p>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-gray-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-900 border-b border-gray-800">
                    <th className="px-3 py-2.5 text-center text-gray-500 font-bold w-12">RPE</th>
                    <th className="px-3 py-2.5 text-center text-[#FFB800] font-bold w-12">RIR</th>
                    {Array.from({ length: 12 }, (_, i) => (
                      <th key={i} className="px-2 py-2.5 text-center text-gray-500 font-bold min-w-[52px]">{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {RPE_ROWS.map((rpe, ri) => (
                    <tr key={rpe} className={ri % 2 === 0 ? 'bg-gray-900/30' : ''}>
                      <td className="px-3 py-2 text-center font-black text-[#FF4500]">{rpe}</td>
                      <td className="px-3 py-2 text-center font-bold text-[#FFB800]">{RIR_MAP[rpe]}</td>
                      {Array.from({ length: 12 }, (_, ci) => {
                        const pct = RPE_TABLE[rpe][ci];
                        const isHoverRow = hoverCell?.rpe === rpe;
                        const isHoverCol = hoverCell?.reps === ci + 1;
                        const isHover    = isHoverRow && isHoverCol;
                        const isHighlight = isHoverRow || isHoverCol;
                        return (
                          <td
                            key={ci}
                            onMouseEnter={() => setHoverCell({ rpe, reps: ci + 1 })}
                            onMouseLeave={() => setHoverCell(null)}
                            className={`px-2 py-2 text-center font-semibold cursor-default transition-colors select-none ${
                              isHover      ? 'bg-[#FF4500] text-white rounded' :
                              isHighlight  ? 'bg-[#FF4500]/15 text-[#FF4500]' :
                              rpe >= 9     ? 'text-red-300' :
                              rpe >= 8     ? 'text-orange-300' :
                              rpe >= 7     ? 'text-[#FFB800]' :
                                             'text-gray-400'
                            }`}
                          >
                            {pct}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr className="bg-gray-900/50 border-t border-gray-800">
                    <td className="px-3 py-2 text-center text-xs text-gray-600 font-semibold">&lt;6*</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-600 font-semibold">&gt;8*</td>
                    <td colSpan={12} className="px-3 py-2 text-center text-xs text-gray-600 italic">
                      Resultado poco preciso — mejor usar un índice de esfuerzo mayor
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            {hoverCell && (
              <div className="mt-2 text-center text-xs text-gray-400">
                RPE {hoverCell.rpe} · {hoverCell.reps} rep{hoverCell.reps > 1 ? 's' : ''} →{' '}
                <span className="text-[#FF4500] font-bold text-sm">{getPct(hoverCell.rpe, hoverCell.reps)}% del 1RM</span>
              </div>
            )}
          </div>

          {/* Calculadoras */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Modo A: peso+reps+RPE → 1RM */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Calcular 1RM estimado</h3>
                <p className="text-xs text-gray-500 mt-0.5">Levantaste X kg · X reps · a RPE X → ¿cuál es tu 1RM?</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Peso (kg)</label>
                  <input
                    type="number" value={calcPeso} onChange={e => setCalcPeso(e.target.value)}
                    placeholder="100"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Reps</label>
                  <input
                    type="number" min={1} max={12} value={calcReps} onChange={e => setCalcReps(e.target.value)}
                    placeholder="3"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">RPE</label>
                  <select
                    value={calcRPE} onChange={e => setCalcRPE(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  >
                    <option value="">—</option>
                    {RPE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              {resultA ? (
                <div className="bg-[#FF4500]/8 border border-[#FF4500]/25 rounded-xl px-4 py-4 text-center space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">1RM estimado</p>
                  <p className="text-4xl font-black text-[#FF4500]">{resultA.rm}<span className="text-lg text-gray-400 font-normal ml-1">kg</span></p>
                  <p className="text-xs text-gray-500">Levantaste el <span className="text-white font-bold">{resultA.pct}%</span> de tu 1RM</p>
                </div>
              ) : (
                <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-4 text-center text-gray-600 text-sm">
                  Completa los tres campos
                </div>
              )}
            </div>

            {/* Modo B: 1RM+reps objetivo+RPE objetivo → peso */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Calcular peso a usar</h3>
                <p className="text-xs text-gray-500 mt-0.5">Sé mi 1RM → ¿qué peso uso para X reps a RPE X?</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">1RM (kg)</label>
                  <input
                    type="number" value={calcRM} onChange={e => setCalcRM(e.target.value)}
                    placeholder="200"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Reps obj.</label>
                  <input
                    type="number" min={1} max={12} value={calcTargReps} onChange={e => setCalcTargReps(e.target.value)}
                    placeholder="5"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">RPE obj.</label>
                  <select
                    value={calcTargRPE} onChange={e => setCalcTargRPE(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
                  >
                    <option value="">—</option>
                    {RPE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              {resultB ? (
                <div className="bg-[#FFB800]/8 border border-[#FFB800]/25 rounded-xl px-4 py-4 text-center space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Peso a usar</p>
                  <p className="text-4xl font-black text-[#FFB800]">{resultB.peso}<span className="text-lg text-gray-400 font-normal ml-1">kg</span></p>
                  <p className="text-xs text-gray-500">
                    Equivale al <span className="text-white font-bold">{resultB.pct}%</span> de tu 1RM
                    {resultB.peso % 2.5 !== 0 && (
                      <span className="block text-gray-600 mt-0.5">Redondea al disco disponible más cercano</span>
                    )}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-800/40 border border-gray-700/40 rounded-xl px-4 py-4 text-center text-gray-600 text-sm">
                  Completa los tres campos
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 bg-orange-500/5 border border-orange-500/20 rounded-xl px-4 py-3 space-y-1">
            <p className="text-xs font-bold text-orange-400">Escala Zourdos — cómo leer la tabla</p>
            <p className="text-xs text-gray-400">
              Cada paso de <strong className="text-white">0.5 RPE = 1 RIR entero</strong>.
              RPE 9.5 = 1 RIR (no 0.5 RIR) · RPE 8.5 = 3 RIR (no 1.5 RIR) · RPE 8 = 4 RIR (no 2 RIR).
              La fórmula correcta es <strong className="text-white">RIR = (10 − RPE) × 2</strong>, no RPE + RIR = 10.
            </p>
            <p className="text-[10px] text-gray-600 pt-1">Helms, Keogh, Zourdos &amp; Brown (2016). Valores estimados — la autoregulación en vivo siempre supera cualquier tabla.</p>
          </div>

        </>}

      </div>
    </div>
  );
}
