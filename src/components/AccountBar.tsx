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
    <div className="bg-brand-900 text-xs text-brand-100">
      <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <span className="font-data tracking-wide text-brand-200">GEMAP · Gestão de Processos SEI</span>
        <div className="flex items-center gap-2">
          {user.role === 'admin' && (
            <button
              onClick={onToggleAdmin}
              className={`flex items-center gap-1.5 rounded px-2 py-1 transition-colors ${
                adminActive ? 'bg-brand-600 text-white' : 'text-brand-100 hover:bg-brand-700'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Administração
            </button>
          )}
          <span className="flex items-center gap-1.5 text-brand-100">
            <ShieldCheck className="h-3.5 w-3.5" />
            {user.name || user.email}
          </span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-brand-700"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};
