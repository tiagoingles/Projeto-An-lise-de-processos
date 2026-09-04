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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Análise de Processos SEI</h1>
            <p className="text-xs text-slate-500">GEMAP · uso interno</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-semibold text-slate-800 mb-1">Entrar</h2>
          <p className="text-xs text-slate-500 mb-5">
            Acesse com sua conta Google institucional. Apenas e-mails autorizados pela
            coordenação conseguem entrar.
          </p>

          <div className="flex justify-center min-h-[40px]">
            {busy ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Validando acesso...
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
            <p className="mt-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
              {error}
            </p>
          )}
        </div>

        <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5 justify-center">
          <ShieldCheck className="w-3.5 h-3.5" />
          Sessão protegida · o conteúdo dos autos é enviado ao Google para processamento
        </p>
      </div>
    </div>
  );
};
