import React, { useState } from 'react';
import { History, Search, ArrowRight, Trash2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { ProcessAnalysisResult, SuggestedOutcomeType } from '../types';

interface ProcessHistoryViewProps {
  history: ProcessAnalysisResult[];
  onSelectProcess: (process: ProcessAnalysisResult) => void;
  onDeleteProcess: (id: string) => void;
  onNewProcess: () => void;
}

export const ProcessHistoryView: React.FC<ProcessHistoryViewProps> = ({
  history,
  onSelectProcess,
  onDeleteProcess,
  onNewProcess,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const getOutcomeBadge = (outcome: SuggestedOutcomeType) => {
    switch (outcome) {
      case 'DEFERIMENTO_TOTAL':
        return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Deferimento' };
      case 'DEFERIMENTO_PARCIAL':
        return { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Deferimento Parcial' };
      case 'INDEFERIMENTO':
        return { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Indeferimento' };
      case 'DILIGENCIA_PREVIA':
        return { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Diligência' };
      case 'EXTINCAO':
        return { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: 'Extinção' };
      default:
        return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Decisão' };
    }
  };

  const filteredHistory = history.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.processNumber.toLowerCase().includes(term) ||
      item.subject.toLowerCase().includes(term) ||
      item.parties.requesterOrPlaintiff.toLowerCase().includes(term) ||
      (item.theme && item.theme.toLowerCase().includes(term)) ||
      item.fileName.toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold mb-2">
              <History className="w-3.5 h-3.5 text-blue-600" />
              <span>Arquivo de Análises Realizadas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Histórico de Processos SEI
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Consulte deliberações anteriores, acesse minutas geradas e reabra análises salvas.
            </p>
          </div>

          <button
            type="button"
            onClick={onNewProcess}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shrink-0 transition-all shadow-xs"
          >
            + Novo Processo SEI
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mt-6">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por número do processo, assunto, requerente ou tema..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden font-medium"
          />
        </div>
      </div>

      {/* Process List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <History className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-800 mb-1">
            Nenhum processo no histórico
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Inicie a análise de um processo SEI para que ele fique registrado aqui.
          </p>
          <button
            onClick={onNewProcess}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold"
          >
            Analisar Processo Agora
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => {
            const badge = getOutcomeBadge(item.decision.suggestedOutcome);
            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      SEI: {item.processNumber}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase tracking-wider ${badge.bg}`}>
                      {badge.label}
                    </span>
                    {item.theme && (
                      <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                        {item.theme}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {item.subject}
                  </h4>

                  <p className="text-xs text-slate-500 truncate">
                    <strong>Interessado:</strong> {item.parties.requesterOrPlaintiff} • <strong>Proposta:</strong> {item.decision.outcomeTitle}
                  </p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectProcess(item)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold flex items-center space-x-1.5 border border-blue-200 transition-colors"
                  >
                    <span>Abrir Análise</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDeleteProcess(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remover do histórico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
