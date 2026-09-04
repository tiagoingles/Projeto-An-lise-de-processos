import React, { useState } from 'react';
import {
  Scale,
  Gavel,
  HelpCircle,
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Copy,
  Download,
  MessageSquare,
  Sparkles,
  BookOpen,
  Send,
  Check,
  ChevronRight,
  ShieldAlert,
  Edit3,
  BookmarkPlus,
  RefreshCw,
  FileBadge,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { ProcessAnalysisResult, SuggestedOutcomeType, PrecedentProcessItem } from '../types';

interface AnalysisResultViewProps {
  analysis: ProcessAnalysisResult;
  onOpenChat: () => void;
  onNewProcess: () => void;
  onRecordLearning: (learningSummary: string) => void;
  onUpdateAnalysisMinuta: (newMinuta: string) => void;
  onSaveToPrecedents?: (precedent: PrecedentProcessItem) => void;
}

export const AnalysisResultView: React.FC<AnalysisResultViewProps> = ({
  analysis,
  onOpenChat,
  onNewProcess,
  onRecordLearning,
  onUpdateAnalysisMinuta,
  onSaveToPrecedents,
}) => {
  const [activeTab, setActiveTab] = useState<'decidir' | 'considerar' | 'deliberar' | 'regras'>('decidir');
  const [copiedMinuta, setCopiedMinuta] = useState(false);
  const [isEditingMinuta, setIsEditingMinuta] = useState(false);
  const [minutaText, setMinutaText] = useState(analysis.decision.draftDocument);
  const [learningFeedbackText, setLearningFeedbackText] = useState('');
  const [learningSaved, setLearningSaved] = useState(false);
  const [savedToPrecedents, setSavedToPrecedents] = useState(false);

  const getOutcomeBadge = (outcome: SuggestedOutcomeType) => {
    switch (outcome) {
      case 'DEFERIMENTO_TOTAL':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Deferimento Total',
          icon: CheckCircle2,
        };
      case 'DEFERIMENTO_PARCIAL':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Deferimento Parcial',
          icon: AlertTriangle,
        };
      case 'INDEFERIMENTO':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'Indeferimento',
          icon: ShieldAlert,
        };
      case 'DILIGENCIA_PREVIA':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Conversão em Diligência',
          icon: RefreshCw,
        };
      case 'EXTINCAO':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          label: 'Extinção sem Resolução do Mérito',
          icon: Scale,
        };
      default:
        return {
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          label: 'Decisão Interlocutória / Encaminhamento',
          icon: Scale,
        };
    }
  };

  const outcomeInfo = getOutcomeBadge(analysis.decision.suggestedOutcome);
  const OutcomeIcon = outcomeInfo.icon;

  const handleCopyMinuta = () => {
    navigator.clipboard.writeText(minutaText);
    setCopiedMinuta(true);
    setTimeout(() => setCopiedMinuta(false), 2500);
  };

  const handleSaveToPrecedentsBank = () => {
    if (!onSaveToPrecedents) return;
    const newPrecedent: PrecedentProcessItem = {
      id: `prec-from-${Date.now()}`,
      processNumber: analysis.processNumber || 'Processo SEI',
      subject: analysis.subject || 'Assunto em análise',
      theme: analysis.theme || 'Geral',
      factualSummary: analysis.factualSummary || analysis.subject,
      finalDecision: `${outcomeInfo.label} - ${analysis.decision.outcomeTitle}`,
      outcomeType: analysis.decision.suggestedOutcome,
      deliberationsOrDespacho: minutaText,
      unit: 'GEMAP',
      date: new Date().toISOString().split('T')[0],
      tags: [analysis.theme?.toLowerCase() || 'sei', 'jurisprudencia-gemap'],
      precedentSummary: analysis.decision.substantiveReasoning || 'Tese fixada conforme análise de mérito.',
      sourceFileName: analysis.fileName,
    };

    onSaveToPrecedents(newPrecedent);
    setSavedToPrecedents(true);
    setTimeout(() => setSavedToPrecedents(false), 3000);
  };

  const handleDownloadReport = () => {
    const reportText = `================================================================================
RELATÓRIO DE INSTRUÇÃO E ANÁLISE PROCESSUAL SEI - GEMAP
================================================================================
Processo SEI: ${analysis.processNumber}
Assunto: ${analysis.subject}
Tema Identificado: ${analysis.theme || 'Não classificado'}
Interessado: ${analysis.parties.requesterOrPlaintiff}
Data da Análise: ${new Date(analysis.createdAt).toLocaleString('pt-BR')}
Proposta: ${outcomeInfo.label} (${analysis.decision.outcomeTitle})

--------------------------------------------------------------------------------
1. RESUMO DOS FATOS
--------------------------------------------------------------------------------
${analysis.factualSummary}

--------------------------------------------------------------------------------
2. DISPOSITIVOS NORMATIVOS E PARECERES APLICADOS
--------------------------------------------------------------------------------
${analysis.rulesApplied.map((r) => `• [${r.category.toUpperCase()}] ${r.title}\n  Dispositivo: ${r.citation || 'N/A'}\n  Aplicação: ${r.applicationJustification}`).join('\n\n')}

${analysis.precedentsMatched && analysis.precedentsMatched.length > 0 ? `--------------------------------------------------------------------------------
PRECEDENTES GEMAP CONFRONTADOS
--------------------------------------------------------------------------------
${analysis.precedentsMatched.map((p) => `• Processo nº ${p.processNumber} (${p.theme})\n  Tese: ${p.precedentSummary}`).join('\n\n')}` : ''}

--------------------------------------------------------------------------------
3. TRÍADE DECISÓRIA GEMAP
--------------------------------------------------------------------------------
A) O QUE CONSIDERAR (FUNDAMENTAÇÃO DE MÉRITO):
${analysis.decision.substantiveReasoning}

B) O QUE DELIBERAR (PROVIDÊNCIAS ADMINISTRATIVAS):
${analysis.decision.proceduralOrders.map((o) => `• [${o.orderType}] ${o.description} (Prazo: ${o.targetDeadline || 'Normal'} | Resp: ${o.assignee || 'GEMAP'})`).join('\n')}

C) O QUE DECIDIR (MINUTA DO DESPACHO SEI):
${minutaText}
================================================================================`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio_SEI_${analysis.processNumber.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveLearning = () => {
    if (!learningFeedbackText.trim()) return;
    onRecordLearning(learningFeedbackText.trim());
    setLearningSaved(true);
    setLearningFeedbackText('');
    setTimeout(() => setLearningSaved(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${outcomeInfo.bg}`}>
                <OutcomeIcon className="w-3.5 h-3.5" />
                <span>{outcomeInfo.label}</span>
              </span>

              {analysis.theme && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  Tema: {analysis.theme}
                </span>
              )}

              <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                SEI nº {analysis.processNumber}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {analysis.subject}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium">
              <span><strong>Interessado:</strong> {analysis.parties.requesterOrPlaintiff}</span>
              <span>•</span>
              <span><strong>Unidade Responsável:</strong> {analysis.parties.respondentOrDefendant || 'GEMAP'}</span>
              <span>•</span>
              <span><strong>Fase:</strong> {analysis.proceduralStage}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onSaveToPrecedents && (
              <button
                onClick={handleSaveToPrecedentsBank}
                className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                title="Salvar esta análise no Banco de Processos Reais da GEMAP como balizador"
              >
                {savedToPrecedents ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-700" />
                    <span>Salvo como Jurisprudência!</span>
                  </>
                ) : (
                  <>
                    <FileBadge className="w-4 h-4 text-emerald-600" />
                    <span>Salvar no Banco de Jurisprudência</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onOpenChat}
              className="px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              <span>Chat do Processo</span>
            </button>

            <button
              onClick={handleDownloadReport}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600"
              title="Baixar Relatório Completo (.txt)"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onNewProcess}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all"
            >
              Novo Processo
            </button>
          </div>
        </div>

        {/* Resumo dos Fatos - Em destaque */}
        <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Resumo dos Fatos (Dos Autos do Processo)</span>
          </h3>
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
            {analysis.factualSummary}
          </p>
        </div>
      </div>

      {/* Main Tabs Navigation (Tríade Decisória) */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 gap-2 shadow-2xs">
        <button
          onClick={() => setActiveTab('decidir')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'decidir'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gavel className="w-4 h-4" />
          <span>1. O que Decidir (Minuta SEI)</span>
        </button>

        <button
          onClick={() => setActiveTab('considerar')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'considerar'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>2. O que Considerar (Fundamentação)</span>
        </button>

        <button
          onClick={() => setActiveTab('deliberar')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'deliberar'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          <span>3. O que Deliberar (Providências)</span>
        </button>

        <button
          onClick={() => setActiveTab('regras')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'regras'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Normas & Precedentes Aplicados</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
            {analysis.rulesApplied.length + (analysis.precedentsMatched?.length || 0)}
          </span>
        </button>
      </div>

      {/* TAB 1: O QUE DECIDIR (MINUTA DO DESPACHO SEI) */}
      {activeTab === 'decidir' && (
        <div className="bg-white border border-slate-200 rounded-b-xl p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Minuta de Despacho SEI
              </h2>
              <p className="text-xs text-slate-500">
                Texto formatado conforme o padrão oficial da GEMAP, pronto para copiar e colar no editor do SEI.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditingMinuta(!isEditingMinuta)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingMinuta ? 'Concluir Edição' : 'Editar Minuta'}</span>
              </button>

              <button
                onClick={handleCopyMinuta}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
              >
                {copiedMinuta ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copiado para o SEI!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Minuta</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isEditingMinuta ? (
            <textarea
              rows={16}
              value={minutaText}
              onChange={(e) => {
                setMinutaText(e.target.value);
                onUpdateAnalysisMinuta(e.target.value);
              }}
              className="w-full text-xs sm:text-sm font-mono p-4 rounded-xl border border-blue-400 bg-blue-50/20 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 leading-relaxed"
            />
          ) : (
            <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-mono text-slate-900 whitespace-pre-wrap leading-relaxed shadow-inner">
              {minutaText}
            </div>
          )}

          {/* Quick Guidance */}
          <div className="p-3.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Dica de Instrução no SEI:</p>
              <p className="text-blue-800 mt-0.5">
                Você pode copiar esta minuta diretamente para o documento do tipo "Despacho" ou "Nota Técnica" no SEI. Caso queira ajustar cláusulas ou fazer perguntas sobre os autos, utilize o <strong>Chat do Processo</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: O QUE CONSIDERAR (FUNDAMENTAÇÃO DE MÉRITO) */}
      {activeTab === 'considerar' && (
        <div className="bg-white border border-slate-200 rounded-b-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Fundamentação Fática e Jurídica
            </h2>
            <p className="text-xs text-slate-500">
              Análise detalhada de admissibilidade, requisitos legais, conformidade com os pareceres e motivação do ato.
            </p>
          </div>

          {/* Core Reasoning */}
          <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-800 leading-relaxed space-y-3 font-normal">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Exposição dos Motivos & Confrontação dos Requisitos
            </h3>
            <p className="whitespace-pre-line">{analysis.decision.substantiveReasoning}</p>
          </div>

          {/* Pontos de Atenção / Alertas */}
          {analysis.decision.criticalAlerts && analysis.decision.criticalAlerts.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Pontos de Atenção Críticos para o Gestor</span>
              </h3>
              <ul className="space-y-1.5 text-xs text-amber-800">
                {analysis.decision.criticalAlerts.map((alert, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold">•</span>
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dispositivos Aplicados no Caso */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Dispositivos do Acervo Pertinentes a este Processo
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysis.rulesApplied.map((r, idx) => (
                <div key={idx} className="p-3.5 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700">
                      {r.category}
                    </span>
                    {r.citation && (
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">
                        {r.citation}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mb-1">{r.title}</h4>
                  <p className="text-xs text-slate-600">{r.applicationJustification}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: O QUE DELIBERAR (PROVIDÊNCIAS ADMINISTRATIVAS) */}
      {activeTab === 'deliberar' && (
        <div className="bg-white border border-slate-200 rounded-b-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Providências Administrativas e de Secretaria
            </h2>
            <p className="text-xs text-slate-500">
              Ordens de encaminhamento no SEI, notificações, publicações e prazos regulamentares.
            </p>
          </div>

          <div className="space-y-3">
            {analysis.decision.proceduralOrders.map((order, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-700">
                      {order.orderType}
                    </span>
                    {order.targetDeadline && (
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        Prazo: {order.targetDeadline}
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-900">
                    {order.description}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-500 font-mono">
                    Responsável: {order.assignee || 'GEMAP'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: REGRAS E PRECEDENTES CONFRONTADOS */}
      {activeTab === 'regras' && (
        <div className="bg-white border border-slate-200 rounded-b-xl p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">
              Dispositivos e Precedentes Confrontados
            </h2>
            <p className="text-xs text-slate-500">
              Confrontação explícita entre as Leis, Decretos, Pareceres do acervo e os Processos Reais da Jurisprudência da GEMAP.
            </p>
          </div>

          {/* Acervo Normativo */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Normas, Leis e Pareceres Jurídicos do Acervo ({analysis.rulesApplied.length})</span>
            </h3>

            <div className="space-y-3">
              {analysis.rulesApplied.map((rule, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-blue-700">
                      {rule.category}
                    </span>
                    {rule.citation && (
                      <span className="text-xs font-mono font-bold text-slate-600">
                        {rule.citation}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">{rule.title}</h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {rule.applicationJustification}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Precedentes Reais GEMAP */}
          {analysis.precedentsMatched && analysis.precedentsMatched.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
                <FileBadge className="w-4 h-4 text-emerald-600" />
                <span>Precedentes GEMAP Conectados ao Caso ({analysis.precedentsMatched.length})</span>
              </h3>

              <div className="space-y-3">
                {analysis.precedentsMatched.map((prec, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-emerald-900">
                        Processo SEI nº {prec.processNumber}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {prec.theme}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 font-medium">
                      <strong className="text-emerald-950">Tese Balizadora:</strong> {prec.precedentSummary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ensinar / Gravar Novo Aprendizado */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Registrar Nova Diretriz ou Aprendizado a partir deste Processo</span>
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Se você tomou uma decisão diferente ou deseja fixar uma regra para casos semelhantes no futuro, digite abaixo:
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={learningFeedbackText}
                onChange={(e) => setLearningFeedbackText(e.target.value)}
                placeholder="Ex: Em pedidos de repactuação sem certidão FGTS, não indeferir de pronto; abrir prazo de 5 dias úteis..."
                className="flex-1 text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden font-medium"
              />
              <button
                onClick={handleSaveLearning}
                disabled={!learningFeedbackText.trim()}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {learningSaved ? 'Salvo!' : 'Fixar Aprendizado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
