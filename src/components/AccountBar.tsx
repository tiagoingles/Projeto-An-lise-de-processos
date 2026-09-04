import React from 'react';
import { LogOut, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../lib/auth';

interface AccountBarProps {
  onToggleAdmin: () => void;
  adminActive: boolean;
}

export const AccountBar: React.FC<AccountBarProps> = ({ onToggleAdmin, adminActive }) => {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="bg-slate-900 text-slate-300 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-9 flex items-center justify-between">
        <span className="font-medium tracking-wide text-slate-400">
          GEMAP · Análise de Processos SEI
        </span>
        <div className="flex items-center gap-3">
          {user.role === 'admin' && (
            <button
              onClick={onToggleAdmin}
              className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${
                adminActive ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Administração
            </button>
          )}
          <span className="flex items-center gap-1.5 text-slate-400">
            {user.picture ? (
              <img src={user.picture} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            {user.name || user.email}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};
