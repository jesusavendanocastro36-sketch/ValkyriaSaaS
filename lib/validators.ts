import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  nombre: z.string().min(1),
  rol: z.enum(['ADMIN', 'ATHLETE']),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const periodizacionSchema = z.object({
  nombre: z.string().min(1),
  tipo: z.enum(['LINEAL', 'ONDULANTE', 'CONJUGADA', 'POR_BLOQUES']),
  athlete_id: z.string().cuid(),
  fecha_inicio: z.string(),
  fecha_fin: z.string(),
  duracion_semanas: z.number().int().min(1).max(52),
  objetivo: z.string().min(1),
  descripcion: z.string().optional(),
  fecha_competencia: z.string().optional(),
});

export const seguimientoSchema = z.object({
  ejercicio_sesion_id: z.string().cuid(),
  numero_set: z.number().int().min(1),
  reps_realizadas: z.number().int().min(0),
  peso_usado: z.number().min(0),
  rpe_reportado: z.number().min(1).max(10),
  estado: z.enum(['completado', 'no_pudo', 'tecnica_fallida']).default('completado'),
  notas: z.string().optional(),
});
