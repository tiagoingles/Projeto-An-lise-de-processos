import React from 'react';
import {
  Scale,
  BookOpen,
  History,
  PlusCircle,
  Download,
  UploadCloud,
  FileBadge,
  Search,
  Layers,
} from 'lucide-react';

interface HeaderProps {
  currentTab: 'analysis' | 'topic' | 'legal-docs' | 'precedents' | 'history';
  setCurrentTab: (tab: 'analysis' | 'topic' | 'legal-docs' | 'precedents' | 'history') => void;
  activeRulesCount: number;
  precedentsCount: number;
  onNewProcess: () => void;
  onExportKnowledge: () => void;
  onImportKnowledge: () => void;
}

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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setCurrentTab('analysis')}
          >
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-xs group-hover:border-blue-500 transition-colors">
              <Scale className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                  SEI GEMAP
                </span>
                <span className="inline-block bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block">
                Análise de Processos Administrativos
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-1">
            {/* Tab 1: Analisar Processo */}
            <button
              id="tab-analysis"
              onClick={() => setCurrentTab('analysis')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
                currentTab === 'analysis'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-blue-600" />
              <span>Análise de Processo</span>
            </button>

            {/* Tab 2: Pesquisa de Assunto */}
            <button
              id="tab-topic"
              onClick={() => setCurrentTab('topic')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
                currentTab === 'topic'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pesquisar Assunto</span>
            </button>

            {/* Tab 3: Upload de Documentos Legais */}
            <button
              id="tab-legal-docs"
              onClick={() => setCurrentTab('legal-docs')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
                currentTab === 'legal-docs'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-600" />
              <span>Documentos Legais</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                currentTab === 'legal-docs'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {activeRulesCount}
              </span>
            </button>

            {/* Tab 4: Processos Reais */}
            <button
              id="tab-precedents"
              onClick={() => setCurrentTab('precedents')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
                currentTab === 'precedents'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <FileBadge className="w-3.5 h-3.5 text-emerald-600" />
              <span>Processos Reais</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                currentTab === 'precedents'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {precedentsCount}
              </span>
            </button>

            {/* Tab 5: Histórico */}
            <button
              id="tab-history"
              onClick={() => setCurrentTab('history')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 border ${
                currentTab === 'history'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <History className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Histórico</span>
            </button>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-new-process"
              onClick={onNewProcess}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-xs transition-all"
              title="Iniciar nova análise de processo SEI"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Novo Processo</span>
            </button>

            <div className="hidden lg:flex items-center border-l border-slate-200 pl-2 space-x-1">
              <button
                id="btn-export-knowledge"
                onClick={onExportKnowledge}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Exportar backup do acervo e precedentes (JSON)"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                id="btn-import-knowledge"
                onClick={onImportKnowledge}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Importar backup do acervo (JSON)"
              >
                <UploadCloud className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
