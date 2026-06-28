// Validación de formularios del lado del cliente (sin dependencias de servidor).
// La validación definitiva sigue siendo la de lib/validators.ts en las API routes.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'El email es obligatorio';
  if (!EMAIL_RE.test(email.trim())) return 'Ingresa un email válido (ej: nombre@correo.com)';
  return null;
}

export function validatePassword(password: string, { min = 8 }: { min?: number } = {}): string | null {
  if (!password) return 'La contraseña es obligatoria';
  if (password.length < min) return `La contraseña debe tener al menos ${min} caracteres`;
  return null;
}

export function validateNombre(nombre: string): string | null {
  if (!nombre.trim()) return 'El nombre es obligatorio';
  if (nombre.trim().length < 2) return 'El nombre es demasiado corto';
  return null;
}

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Devuelve true si el objeto de errores no tiene ningún mensaje. */
export function isValid<K extends string>(errors: FieldErrors<K>): boolean {
  return Object.values(errors).every(v => !v);
}
