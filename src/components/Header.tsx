import React from 'react';
import { BookOpen, History, Plus, Download, UploadCloud, FileBadge, Search, Scale } from 'lucide-react';

type Tab = 'analysis' | 'topic' | 'legal-docs' | 'precedents' | 'history';

interface HeaderProps {
  currentTab: Tab;
  setCurrentTab: (tab: Tab) => void;
  activeRulesCount: number;
  precedentsCount: number;
  onNewProcess: () => void;
  onExportKnowledge: () => void;
  onImportKnowledge: () => void;
}

const TABS: { id: Tab; label: string; icon: React.ElementType; badge?: 'rules' | 'precedents' }[] = [
  { id: 'analysis', label: 'Analisar processo', icon: Scale },
  { id: 'topic', label: 'Pesquisar assunto', icon: Search },
  { id: 'legal-docs', label: 'Acervo legal', icon: BookOpen, badge: 'rules' },
  { id: 'precedents', label: 'Precedentes', icon: FileBadge, badge: 'precedents' },
  { id: 'history', label: 'Histórico', icon: History },
];

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  activeRulesCount,
  precedentsCount,
  onNewProcess,
  onExportKnowledge,
  onImportKnowledge,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <button onClick={() => setCurrentTab('analysis')} className="flex items-center gap-2.5 shrink-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Scale className="h-5 w-5" />
            </span>
            <span className="text-left leading-tight">
              <span className="block text-sm font-bold tracking-tight text-slate-900">
                Análise de Processos SEI
              </span>
              <span className="block text-[11px] font-medium text-slate-500">GEMAP</span>
            </span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onExportKnowledge}
              title="Exportar backup (JSON)"
              className="hidden rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:block"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={onImportKnowledge}
              title="Importar backup (JSON)"
              className="hidden rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:block"
            >
              <UploadCloud className="h-4 w-4" />
            </button>
            <button
              onClick={onNewProcess}
              className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo processo</span>
            </button>
          </div>
        </div>

        <nav className="-mx-1 flex items-center gap-1 overflow-x-auto pb-2">
          {TABS.map(({ id, label, icon: Icon, badge }) => {
            const active = currentTab === id;
            const count =
              badge === 'rules' ? activeRulesCount : badge === 'precedents' ? precedentsCount : null;
            return (
              <button
                key={id}
                onClick={() => setCurrentTab(id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${active ? 'text-brand-600' : ''}`} />
                {label}
                {count !== null && (
                  <span
                    className={`font-data rounded px-1.5 text-[11px] font-medium ${
                      active ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
