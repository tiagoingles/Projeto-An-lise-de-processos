import React, { useState } from 'react';
import { Scale, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../lib/auth';

export const LoginScreen: React.FC = () => {
  const { login, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch {
      /* erro exibido pelo contexto */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rise">
        <div className="mb-7 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Scale className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-[17px] font-bold tracking-tight text-slate-900">
              Análise de Processos SEI
            </h1>
            <p className="font-data text-xs text-slate-500">GEMAP · uso interno</p>
          </div>
        </div>

        <form
          onSubmit={submit}
          className="rounded-[var(--radius-card)] border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="text-sm font-semibold text-slate-800">Entrar</h2>
          <p className="mb-5 mt-1 text-xs leading-relaxed text-slate-500">
            Use o e-mail e a senha cadastrados pela coordenação.
          </p>

          <label className="mb-1 block font-data text-[11px] font-bold uppercase tracking-wide text-slate-500">
            E-mail
          </label>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
            required
          />

          <label className="mb-1 block font-data text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Senha
          </label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
            required
          />

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Entrar
          </button>

          {error && (
            <p className="mt-4 rounded-lg border border-[var(--color-indefere)]/30 bg-[var(--color-indefere-soft)] p-2.5 text-xs text-[var(--color-indefere)]">
              {error}
            </p>
          )}
        </form>

        <p className="mt-4 text-center text-[11px] text-slate-400">
          O conteúdo dos autos é enviado ao Google (Gemini) para processamento.
        </p>
      </div>
    </div>
  );
};
