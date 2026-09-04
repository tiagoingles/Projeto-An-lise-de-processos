import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { Scale, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';

export const LoginScreen: React.FC = () => {
  const { loginWithGoogle, error } = useAuth();
  const [busy, setBusy] = React.useState(false);

  const handleCredential = async (credential?: string) => {
    if (!credential) return;
    setBusy(true);
    try {
      await loginWithGoogle(credential);
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

        <div className="rounded-[var(--radius-card)] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-800">Entrar</h2>
          <p className="mb-5 mt-1 text-xs leading-relaxed text-slate-500">
            Acesse com sua conta Google institucional. Só e-mails autorizados pela coordenação
            conseguem entrar.
          </p>

          <div className="flex min-h-[40px] justify-center">
            {busy ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Validando acesso…
              </div>
            ) : (
              <GoogleLogin
                onSuccess={(resp) => handleCredential(resp.credential)}
                onError={() => undefined}
                text="signin_with"
                locale="pt-BR"
                shape="pill"
              />
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-lg border border-[var(--color-indefere)]/30 bg-[var(--color-indefere-soft)] p-2.5 text-xs text-[var(--color-indefere)]">
              {error}
            </p>
          )}
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" />
          O conteúdo dos autos é enviado ao Google (Gemini) para processamento
        </p>
      </div>
    </div>
  );
};
