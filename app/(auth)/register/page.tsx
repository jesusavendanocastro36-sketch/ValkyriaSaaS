'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { validateEmail, validatePassword, validateNombre, type FieldErrors, isValid } from '@/lib/client-validation';
import { useAuthStore } from '@/lib/store/auth-store';

function RegisterForm() {
  const router = useRouter();
  const login = useAuthStore(s => s.login);
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [coachNombre, setCoachNombre] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [form, setForm] = useState({ email: '', password: '', nombre: '', rol: 'ATHLETE' as const });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<'nombre' | 'email' | 'password'>>({});
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const setField = (key: 'nombre' | 'email' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm(f => ({ ...f, [key]: value }));
    setFieldErrors(f => ({ ...f, [key]: undefined }));
  };

  const inputCls = (hasError: boolean) =>
    `w-full bg-gray-800 border rounded-lg px-4 py-3.5 text-white text-base placeholder-gray-500 focus:outline-none ${
      hasError ? 'border-red-500/60 focus:border-red-500' : 'border-gray-700 focus:border-[#FF4500]'
    }`;

  useEffect(() => {
    if (!inviteToken) return;
    fetch(`/api/invites/validate?token=${inviteToken}`)
      .then(r => r.json())
      .then(d => {
        if (d.valid) setCoachNombre(d.coachNombre);
        else setInviteError(d.error ?? 'Código inválido');
      });
  }, [inviteToken]);

  const doRegister = async () => {
    const errs: FieldErrors<'nombre' | 'email' | 'password'> = {
      nombre: validateNombre(form.nombre) ?? undefined,
      email: validateEmail(form.email) ?? undefined,
      password: validatePassword(form.password) ?? undefined,
    };
    setFieldErrors(errs);
    if (!isValid(errs)) return;
    setLoading(true);
    setError('');

    try {
      const body: Record<string, string> = { ...form };
      if (inviteToken) { body.invite_token = inviteToken; body.rol = 'ATHLETE'; }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Error al registrar'); return; }

      // Auto-login after successful register
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const loginData = await loginRes.json();

      if (!loginRes.ok) {
        // Register worked but auto-login failed — send to login page
        router.push('/login?registered=1');
        return;
      }

      login({ token: loginData.token, userId: loginData.user.id, rol: loginData.user.rol, nombre: loginData.user.nombre });

      // Athletes go to onboarding, coaches go to dashboard
      if (loginData.user.rol === 'ATHLETE') {
        router.push('/athlete/onboarding');
      } else {
        router.push('/admin/dashboard');
      }
    } catch {
      setError('Error de conexión. Revisá tu red.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doRegister();
  };

  // Gate: no invite token — access blocked
  if (!inviteToken) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-black text-[#FF4500] tracking-widest mb-8">VALKYRIA</h1>
          <div className="w-16 h-16 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">🔒</span>
          </div>
          <p className="text-white font-bold text-lg mb-2">Acceso por invitación</p>
          <p className="text-gray-500 text-sm leading-relaxed mb-8">
            El registro en Valkyria es solo mediante invitación directa de tu coach. Si ya tenés cuenta,
            ingresá normalmente.
          </p>
          <Link href="/login"
            className="inline-block w-full py-3.5 bg-[#FF4500] hover:bg-[#e03d00] text-white font-bold rounded-xl transition-colors text-sm">
            Ir al login
          </Link>
        </div>
      </div>
    );
  }

  if (inviteToken && inviteError) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-3xl font-black text-[#FF4500] tracking-widest mb-8">VALKYRIA</h1>
          <div className="w-16 h-16 rounded-full bg-red-900/20 border border-red-800/40 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">⛔</span>
          </div>
          <p className="text-red-400 font-bold text-lg mb-2">Enlace inválido</p>
          <p className="text-gray-500 text-sm mb-8">{inviteError}</p>
          <Link href="/login" className="inline-block w-full py-3.5 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 rounded-xl transition-colors text-sm font-semibold">
            Ir al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 border border-[#FF4500]/40 rounded-xl p-8">
        <h1 className="text-3xl font-black text-[#FF4500] tracking-widest mb-2 text-center">VALKYRIA</h1>

        {coachNombre && (
          <div className="bg-green-900/20 border border-green-700/30 rounded-xl px-4 py-3 mb-6 text-center">
            <p className="text-green-400 text-sm font-semibold">Invitación de {coachNombre}</p>
            <p className="text-gray-500 text-xs mt-0.5">Tu cuenta quedará asignada a este coach automáticamente</p>
          </div>
        )}

        {inviteToken && coachNombre && (
          <div className="bg-[#111] border border-[#FF4500]/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Después del registro</p>
            <p className="text-sm text-gray-300">Completarás tu perfil físico para que <span className="text-white font-semibold">{coachNombre}</span> pueda crear tu plan de entrenamiento.</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Nombre completo"
              value={form.nombre}
              onChange={setField('nombre')}
              onKeyDown={handleKeyDown}
              autoComplete="name"
              aria-invalid={!!fieldErrors.nombre}
              className={inputCls(!!fieldErrors.nombre)}
            />
            {fieldErrors.nombre && <p className="text-red-400 text-xs mt-1.5 ml-1">{fieldErrors.nombre}</p>}
          </div>
          <div>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={setField('email')}
              onKeyDown={handleKeyDown}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="email"
              aria-invalid={!!fieldErrors.email}
              className={inputCls(!!fieldErrors.email)}
            />
            {fieldErrors.email && <p className="text-red-400 text-xs mt-1.5 ml-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <input
              type="password"
              placeholder="Contraseña (mínimo 8 caracteres)"
              value={form.password}
              onChange={setField('password')}
              onKeyDown={handleKeyDown}
              autoComplete="new-password"
              aria-invalid={!!fieldErrors.password}
              className={inputCls(!!fieldErrors.password)}
            />
            {fieldErrors.password && <p className="text-red-400 text-xs mt-1.5 ml-1">{fieldErrors.password}</p>}
          </div>

          {/* Tipo de cuenta — siempre Atleta en registro público */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-500">Tipo de cuenta</p>
            <p className="text-sm text-white font-semibold mt-0.5">Atleta</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm font-semibold">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={doRegister}
            disabled={!mounted || loading || (!!inviteToken && !coachNombre)}
            className="w-full bg-[#FF4500] hover:bg-[#e03d00] active:scale-[0.98] text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50 text-base"
          >
            {!mounted ? 'Cargando...' : loading ? 'Registrando...' : inviteToken ? 'Crear cuenta y completar perfil →' : 'Crear cuenta'}
          </button>
        </div>

        <p className="text-gray-500 text-sm text-center mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#FF4500] hover:underline">Ingresar</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#080808] flex items-center justify-center text-gray-500">Cargando...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
