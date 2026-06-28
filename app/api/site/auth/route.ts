import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const authSchema = z.object({
  email: z.string().min(1),
  password: z.string().min(1),
});

import { compare } from 'bcryptjs';
import { sitePool } from '@/lib/site-db';
import { signSiteToken } from '@/lib/site-auth';

export async function POST(req: Request) {
  try {
    const { data: parsed, error: parseErr } = await parseBody(req, authSchema);
    if (parseErr) return parseErr;
    const { email, password } = parsed;

    const { rows } = await sitePool.query(
      'SELECT * FROM admin_users WHERE email = $1',
      [email]
    );
    const user = rows[0];
    if (!user || !(await compare(password, user.password_hash)))
      return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 });

    const token = signSiteToken(user.id, user.email);
    return Response.json({ token, refresh: token, user: { id: user.id, email: user.email } });
  } catch {
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
