'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { validateEmail, type FieldErrors, isValid } from '@/lib/client-validation';
import { useAuthStore } from '@/lib/store/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore(s => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<'email' | 'password'>>({});
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const doLogin = async () => {
    const errs: FieldErrors<'email' | 'password'> = {
      email: validateEmail(email) ?? undefined,
      password: !password.trim() ? 'La contraseña es obligatoria' : undefined,
    };
    setFieldErrors(errs);
    if (!isValid(errs)) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Credenciales incorrectas');
        return;
      }

      // El store limpia el flag de perfil de sesiones previas y persiste en localStorage
      login({ token: data.token, userId: data.user.id, rol: data.user.rol, nombre: data.user.nombre });

      router.push(data.user.rol === 'ADMIN' ? '/admin/dashboard' : '/athlete/dashboard');
    } catch {
      setError('Error de conexión. Revisá tu red.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') doLogin();
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 border border-[#FF4500]/40 rounded-xl p-8">
        <h1 className="text-3xl font-black text-[#FF4500] tracking-widest mb-2 text-center">
          VALKYRIA
        </h1>
        <p className="text-gray-500 text-sm text-center mb-8">Powerlifting SaaS</p>

        <div className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setFieldErrors(f => ({ ...f, email: undefined })); }}
              onKeyDown={handleKeyDown}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              inputMode="email"
              aria-invalid={!!fieldErrors.email}
              className={`w-full bg-gray-800 border rounded-lg px-4 py-3.5 text-white text-base placeholder-gray-500 focus:outline-none ${
                fieldErrors.email ? 'border-red-500/60 focus:border-red-500' : 'border-gray-700 focus:border-[#FF4500]'
              }`}
            />
            {fieldErrors.email && <p className="text-red-400 text-xs mt-1.5 ml-1">{fieldErrors.email}</p>}
          </div>

          <div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, password: undefined })); }}
                onKeyDown={handleKeyDown}
                autoComplete="current-password"
                aria-invalid={!!fieldErrors.password}
                className={`w-full bg-gray-800 border rounded-lg px-4 py-3.5 pr-12 text-white text-base placeholder-gray-500 focus:outline-none ${
                  fieldErrors.password ? 'border-red-500/60 focus:border-red-500' : 'border-gray-700 focus:border-[#FF4500]'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 text-sm px-1 py-1"
              >
                {showPassword ? 'Ocultar' : 'Ver'}
              </button>
            </div>
            {fieldErrors.password && <p className="text-red-400 text-xs mt-1.5 ml-1">{fieldErrors.password}</p>}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm font-semibold">{error}</p>
            </div>
          )}

          <button
            type="button"
            onClick={doLogin}
            disabled={!mounted || loading}
            className="w-full bg-[#FF4500] hover:bg-[#e03d00] active:scale-[0.98] text-white font-bold py-4 rounded-lg transition-all disabled:opacity-50 text-base"
          >
            {!mounted ? 'Cargando...' : loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </div>

        <p className="text-gray-500 text-sm text-center mt-6">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-[#FF4500] hover:underline">
            Regístrate
          </Link>
        </p>
        <p className="text-center mt-3">
          <Link href="/" className="text-gray-600 text-xs hover:text-gray-400">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
