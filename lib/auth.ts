import { hash, compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.NEXTAUTH_SECRET!;

export async function hashPassword(password: string) {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hashed: string) {
  return compare(password, hashed);
}

export function generateToken(userId: string, rol: string) {
  return jwt.sign({ userId, rol }, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): { userId: string; rol: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; rol: string };
  } catch {
    return null;
  }
}

export function extractToken(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}
