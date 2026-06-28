import { prisma } from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.activo) {
      return Response.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return Response.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    const token = generateToken(user.id, user.rol);

    return Response.json({
      token,
      user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol },
    });
  } catch {
    return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  }
}
