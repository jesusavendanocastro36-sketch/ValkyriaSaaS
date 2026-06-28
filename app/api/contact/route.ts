import { z } from 'zod';
import { parseBody } from '@/lib/api-validation';

const contactSchema = z.object({
  nombre: z.string().min(1),
  email: z.email('Email inválido'),
  mensaje: z.string().min(1),
});

import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const TO_EMAIL = 'jesusavendanocastro36@gmail.com';

export async function POST(req: Request) {
  try {
    const { data: parsed, error: parseErr } = await parseBody(req, contactSchema);
    if (parseErr) return parseErr;
    const { nombre, email, mensaje } = parsed;
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: 'Valkyria Contacto <onboarding@resend.dev>',
      to: TO_EMAIL,
      replyTo: email,
      subject: `Nuevo mensaje de ${nombre} — Valkyria`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#111;color:#fff;padding:32px;border-radius:8px">
          <h2 style="color:#FF4500;margin:0 0 24px;font-size:20px">Nuevo mensaje desde tu web</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="color:#999;font-size:12px;padding:8px 0;width:80px;vertical-align:top">NOMBRE</td>
              <td style="font-size:15px;padding:8px 0">${nombre}</td>
            </tr>
            <tr>
              <td style="color:#999;font-size:12px;padding:8px 0;vertical-align:top">EMAIL</td>
              <td style="font-size:15px;padding:8px 0"><a href="mailto:${email}" style="color:#FF4500">${email}</a></td>
            </tr>
            <tr>
              <td style="color:#999;font-size:12px;padding:8px 0;vertical-align:top">MENSAJE</td>
              <td style="font-size:15px;padding:8px 0;line-height:1.6">${mensaje.replace(/\n/g, '<br>')}</td>
            </tr>
          </table>
          <a href="mailto:${email}" style="display:inline-block;margin-top:24px;background:#FF4500;color:#000;padding:12px 24px;text-decoration:none;font-weight:bold;font-size:13px;border-radius:4px">Responder →</a>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json({ error: 'Error al enviar' }, { status: 500 });
  }
}
