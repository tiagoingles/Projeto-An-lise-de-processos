import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastApi {
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++seq;
      setToasts((prev) => [...prev, { id, kind, message }]);
      window.setTimeout(() => remove(id), kind === 'error' ? 8000 : 4500);
    },
    [remove],
  );

  const api: ToastApi = {
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,380px)]">
        {toasts.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertTriangle : Info;
          const tone =
            t.kind === 'success'
              ? 'border-l-[var(--color-defere)] text-[var(--color-defere)]'
              : t.kind === 'error'
                ? 'border-l-[var(--color-indefere)] text-[var(--color-indefere)]'
                : 'border-l-brand-600 text-brand-700';
          return (
            <div
              key={t.id}
              className={`rise flex items-start gap-3 rounded-xl border border-slate-200 border-l-4 bg-white px-4 py-3 shadow-lg ${tone}`}
            >
              <Icon className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="flex-1 text-sm text-slate-700 leading-snug">{t.message}</p>
              <button onClick={() => remove(t.id)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  return ctx;
}
