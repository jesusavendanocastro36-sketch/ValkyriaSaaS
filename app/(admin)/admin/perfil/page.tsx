'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type CoachProfile = {
  id: string;
  biografia: string | null;
  ubicacion: string | null;
  telefono: string | null;
  especialidades: string[];
  experienciaAnos: number | null;
  user: { nombre: string; email: string };
};

export default function PerfilPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [form, setForm] = useState({
    biografia: '',
    ubicacion: '',
    telefono: '',
    especialidades: '',
    experienciaAnos: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Invite state
  const [inviteLink, setInviteLink] = useState('');
  const [generando, setGenerando] = useState(false);
  const [copied, setCopied] = useState(false);

  const getToken = () => localStorage.getItem('token') ?? '';

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    fetch('/api/admin/perfil', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: CoachProfile) => {
        setProfile(d);
        setForm({
          biografia: d.biografia ?? '',
          ubicacion: d.ubicacion ?? '',
          telefono: d.telefono ?? '',
          especialidades: d.especialidades.join(', '),
          experienciaAnos: d.experienciaAnos ? String(d.experienciaAnos) : '',
        });
      });
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const res = await fetch('/api/admin/perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        biografia: form.biografia || null,
        ubicacion: form.ubicacion || null,
        telefono: form.telefono || null,
        especialidades: form.especialidades
          ? form.especialidades.split(',').map(s => s.trim()).filter(Boolean)
          : [],
        experienciaAnos: form.experienciaAnos || null,
      }),
    });
    if (res.ok) {
      const d = await res.json();
      setProfile(d);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const handleGenerarInvite = async () => {
    setGenerando(true);
    const res = await fetch('/api/invites', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    const url = `${window.location.origin}/register?invite=${data.token}`;
    setInviteLink(url);
    setGenerando(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!profile) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center text-gray-500">Cargando...</div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-1">Mi perfil</h1>
        <p className="text-gray-500 text-sm mb-8">{profile.user.nombre} · {profile.user.email}</p>

        {/* Profile form */}
        <form onSubmit={handleSave} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 mb-6">
          <h2 className="font-semibold text-[#FFB800] text-sm uppercase tracking-wider">Información del coach</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Años de experiencia</label>
              <input type="number" min={0} max={50}
                value={form.experienciaAnos}
                onChange={e => setForm(f => ({ ...f, experienciaAnos: e.target.value }))}
                placeholder="0"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Ubicación</label>
              <input
                value={form.ubicacion}
                onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))}
                placeholder="Lima, Perú"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Teléfono / WhatsApp</label>
            <input
              value={form.telefono}
              onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
              placeholder="+51 999 000 000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Especialidades <span className="text-gray-600">(separadas por coma)</span>
            </label>
            <input
              value={form.especialidades}
              onChange={e => setForm(f => ({ ...f, especialidades: e.target.value }))}
              placeholder="Powerlifting, Fuerza base, RPE, Método RV"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500]"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Biografía</label>
            <textarea
              value={form.biografia}
              onChange={e => setForm(f => ({ ...f, biografia: e.target.value }))}
              rows={4}
              placeholder="Coach especializado en powerlifting y método RV..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF4500] resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="px-5 py-2.5 bg-[#FF4500] hover:bg-[#e03d00] text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            {saved && <span className="text-green-400 text-sm font-semibold">¡Guardado!</span>}
          </div>
        </form>

        {/* Invite section */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-[#FFB800] text-sm uppercase tracking-wider mb-1">Invitar atleta</h2>
          <p className="text-xs text-gray-500 mb-5">
            Genera un enlace de invitación — el atleta se registra y queda asignado automáticamente a ti.
            Válido por 7 días, de un solo uso.
          </p>

          <button onClick={handleGenerarInvite} disabled={generando}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 mb-4">
            {generando ? 'Generando...' : '+ Generar enlace de invitación'}
          </button>

          {inviteLink && (
            <div className="bg-[#0d0d0d] border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2">Enlace generado — cópialo y envíalo al atleta:</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-xs text-green-400 font-mono break-all leading-relaxed">
                  {inviteLink}
                </code>
                <button onClick={handleCopy}
                  className={`shrink-0 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    copied
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}>
                  {copied ? '¡Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Expira en 7 días · Uso único
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
