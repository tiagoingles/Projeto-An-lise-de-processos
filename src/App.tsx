import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { ProcessUploader } from './components/ProcessUploader';
import { AnalysisResultView } from './components/AnalysisResultView';
import { LegalDocumentsPage } from './components/LegalDocumentsPage';
import { TopicAnalysisPage } from './components/TopicAnalysisPage';
import { RealProcessesPage } from './components/RealProcessesPage';
import { ProcessHistoryView } from './components/ProcessHistoryView';
import { ProcessChatModal } from './components/ProcessChatModal';
import { LoginScreen } from './components/LoginScreen';
import { AdminPage } from './components/AdminPage';
import { AccountBar } from './components/AccountBar';
import {
  ProcessRule,
  UserWorkProfile,
  ProcessAnalysisResult,
  PrecedentProcessItem,
} from './types';
import * as data from './lib/data';
import { api } from './lib/apiClient';
import { useAuth } from './lib/auth';
import { ShieldAlert, X, Loader2 } from 'lucide-react';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  const [currentTab, setCurrentTab] = useState<
    'analysis' | 'topic' | 'legal-docs' | 'precedents' | 'history'
  >('analysis');
  const [showAdmin, setShowAdmin] = useState(false);
  const [rules, setRules] = useState<ProcessRule[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [precedents, setPrecedents] = useState<PrecedentProcessItem[]>([]);
  const [profile, setProfile] = useState<UserWorkProfile>(data.DEFAULT_USER_PROFILE);
  const [history, setHistory] = useState<ProcessAnalysisResult[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeAnalysis, setActiveAnalysis] = useState<ProcessAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Carrega os dados compartilhados assim que o usuário está autenticado.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setDataLoading(true);
    Promise.all([
      data.getRules(),
      data.getThemes(),
      data.getPrecedents(),
      data.getProfile(),
      data.getHistory(),
    ])
      .then(([r, t, p, prof, h]) => {
        if (cancelled) return;
        setRules(r);
        setThemes(t);
        setPrecedents(p);
        setProfile(prof ?? data.DEFAULT_USER_PROFILE);
        setHistory(h);
      })
      .catch((err) => !cancelled && setErrorMessage(err.message || 'Falha ao carregar os dados.'))
      .finally(() => !cancelled && setDataLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const activeRulesCount = rules.filter((r) => r.isActive).length;
  const reloadRules = useCallback(async () => setRules(await data.getRules()), []);

  /* ------------------------------- Regras -------------------------------- */
  const handleAddRule = async (rule: ProcessRule) => {
    setRules((prev) => [rule, ...prev]);
    try {
      await data.createRule(rule);
      await reloadRules();
    } catch (err: any) {
      setErrorMessage(err.message);
      await reloadRules();
    }
  };

  const handleAddRulesBatch = async (newRules: ProcessRule[]) => {
    setRules((prev) => [...newRules, ...prev]);
    try {
      await data.createRulesBatch(newRules);
      await reloadRules();
    } catch (err: any) {
      setErrorMessage(err.message);
      await reloadRules();
    }
  };

  const handleDeleteRule = async (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    try {
      await data.deleteRule(id);
    } catch (err: any) {
      setErrorMessage(err.message);
      await reloadRules();
    }
  };

  const handleToggleRule = async (id: string) => {
    const target = rules.find((r) => r.id === id);
    if (!target) return;
    const next = !target.isActive;
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: next } : r)));
    try {
      await data.updateRule(id, { isActive: next });
    } catch (err: any) {
      setErrorMessage(err.message);
      await reloadRules();
    }
  };

  /* ----------------------------- Precedentes ---------------------------- */
  const handleSavePrecedent = async (item: PrecedentProcessItem) => {
    setPrecedents((prev) => [item, ...prev.filter((p) => p.id !== item.id)]);
    try {
      await data.savePrecedent(item);
      setPrecedents(await data.getPrecedents());
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleDeletePrecedent = async (id: string) => {
    setPrecedents((prev) => prev.filter((p) => p.id !== id));
    try {
      await data.deletePrecedent(id);
    } catch (err: any) {
      setErrorMessage(err.message);
      setPrecedents(await data.getPrecedents());
    }
  };

  /* -------------------------------- Temas ------------------------------- */
  const handleCreateTheme = async (newTheme: string) => {
    if (themes.includes(newTheme)) return;
    setThemes((prev) => [newTheme, ...prev]);
    try {
      setThemes(await data.addTheme(newTheme));
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  /* --------------------------- Análise de processo --------------------- */
  const handleStartAnalysis = async (payload: {
    pdfBase64?: string;
    fileName?: string;
    manualText?: string;
    customPromptNotes?: string;
  }) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const res = await api.post<{ analysis: Record<string, unknown> }>('/api/analyze-process', {
        pdfBase64: payload.pdfBase64,
        fileName: payload.fileName,
        manualText: payload.manualText,
        customPromptNotes: payload.customPromptNotes,
      });
      if (!res.analysis) throw new Error('O assistente não retornou a estrutura esperada.');

      const fullAnalysis = {
        id: `proc-${Date.now()}`,
        createdAt: new Date().toISOString(),
        fileName: payload.fileName || 'processo_sei.pdf',
        ...res.analysis,
      } as ProcessAnalysisResult;

      setActiveAnalysis(fullAnalysis);
      setCurrentTab('analysis');
      await data.saveHistory(fullAnalysis);
      setHistory(await data.getHistory());
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewProcess = () => {
    setActiveAnalysis(null);
    setShowAdmin(false);
    setCurrentTab('analysis');
    setErrorMessage(null);
  };

  const handleSelectHistoryProcess = (proc: ProcessAnalysisResult) => {
    setActiveAnalysis(proc);
    setShowAdmin(false);
    setCurrentTab('analysis');
  };

  const handleDeleteHistoryProcess = async (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    if (activeAnalysis?.id === id) setActiveAnalysis(null);
    try {
      await data.deleteHistory(id);
    } catch (err: any) {
      setErrorMessage(err.message);
      setHistory(await data.getHistory());
    }
  };

  const handleRecordLearning = async (learningSummary: string) => {
    const newRule: ProcessRule = {
      id: `rule-learn-${Date.now()}`,
      title: `Diretriz Assimilada: ${learningSummary.slice(0, 45)}...`,
      category: 'orientacao_informal',
      theme: activeAnalysis?.theme || 'Geral',
      description: `Aprendizado extraído do processo ${activeAnalysis?.processNumber || 'recente'}`,
      content: learningSummary,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      tags: ['aprendizado-continuo', 'estilo-gemap'],
    };
    await handleAddRule(newRule);
  };

  const handleUpdateMinuta = async (newMinuta: string) => {
    if (!activeAnalysis) return;
    const updated: ProcessAnalysisResult = {
      ...activeAnalysis,
      decision: { ...activeAnalysis.decision, draftDocument: newMinuta },
    };
    setActiveAnalysis(updated);
    setHistory((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
    try {
      await data.saveHistory(updated);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  /* --------------------------- Backup / migração ----------------------- */
  const handleExportKnowledge = async () => {
    try {
      const json = await data.exportKnowledge();
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sei_gemap_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage(err.message);
    }
  };

  const handleImportKnowledgeClick = () => {
    if (user?.role !== 'admin') {
      setErrorMessage('Apenas administradores podem importar um backup para a base compartilhada.');
      return;
    }
    importFileInputRef.current?.click();
  };

  const handleImportFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const payload = JSON.parse((event.target?.result as string) || '{}');
        const res = await data.importBackup(payload);
        const imp = res.imported;
        alert(
          `Backup importado: ${imp.rules || 0} regras, ${imp.precedents || 0} precedentes, ${imp.themes || 0} temas.`,
        );
        const [r, t, p, prof] = await Promise.all([
          data.getRules(),
          data.getThemes(),
          data.getPrecedents(),
          data.getProfile(),
        ]);
        setRules(r);
        setThemes(t);
        setPrecedents(p);
        setProfile(prof ?? data.DEFAULT_USER_PROFILE);
      } catch (err: any) {
        setErrorMessage(err.message || 'Arquivo de backup inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /* -------------------------------- Render ----------------------------- */
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      <AccountBar
        onToggleAdmin={() => {
          setShowAdmin((v) => !v);
          setActiveAnalysis(null);
        }}
        adminActive={showAdmin}
      />

      <Header
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setShowAdmin(false);
          setErrorMessage(null);
        }}
        activeRulesCount={activeRulesCount}
        precedentsCount={precedents.length}
        onNewProcess={handleNewProcess}
        onExportKnowledge={handleExportKnowledge}
        onImportKnowledge={handleImportKnowledgeClick}
      />

      <input
        type="file"
        ref={importFileInputRef}
        onChange={handleImportFileSelected}
        accept=".json,application/json"
        className="hidden"
      />

      {errorMessage && (
        <div className="max-w-7xl mx-auto mt-4 px-4 w-full">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between text-rose-900 text-xs sm:text-sm shadow-sm">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Atenção:</p>
                <p className="mt-0.5 text-rose-800">{errorMessage}</p>
              </div>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-500 hover:text-rose-800 ml-3 p-1 rounded hover:bg-rose-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 pb-16">
        {dataLoading ? (
          <div className="max-w-4xl mx-auto py-20 flex items-center justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando a base da GEMAP...
          </div>
        ) : showAdmin ? (
          <AdminPage />
        ) : (
          <>
            {currentTab === 'analysis' &&
              (activeAnalysis ? (
                <AnalysisResultView
                  analysis={activeAnalysis}
                  onOpenChat={() => setIsChatOpen(true)}
                  onNewProcess={handleNewProcess}
                  onRecordLearning={handleRecordLearning}
                  onUpdateAnalysisMinuta={handleUpdateMinuta}
                  onSaveToPrecedents={handleSavePrecedent}
                />
              ) : (
                <ProcessUploader
                  onStartAnalysis={handleStartAnalysis}
                  isAnalyzing={isAnalyzing}
                  activeRulesCount={activeRulesCount}
                  precedentsCount={precedents.length}
                  onOpenLegalDocs={() => setCurrentTab('legal-docs')}
                  onOpenPrecedents={() => setCurrentTab('precedents')}
                />
              ))}

            {currentTab === 'topic' && (
              <TopicAnalysisPage
                rules={rules.filter((r) => r.isActive)}
                precedents={precedents}
                themes={themes}
              />
            )}

            {currentTab === 'legal-docs' && (
              <LegalDocumentsPage
                rules={rules}
                themes={themes}
                onAddRule={handleAddRule}
                onAddRulesBatch={handleAddRulesBatch}
                onDeleteRule={handleDeleteRule}
                onToggleRule={handleToggleRule}
                onCreateTheme={handleCreateTheme}
              />
            )}

            {currentTab === 'precedents' && (
              <RealProcessesPage
                precedents={precedents}
                themes={themes}
                onAddPrecedent={handleSavePrecedent}
                onDeletePrecedent={handleDeletePrecedent}
                onCreateTheme={handleCreateTheme}
              />
            )}

            {currentTab === 'history' && (
              <ProcessHistoryView
                history={history}
                onSelectProcess={handleSelectHistoryProcess}
                onDeleteProcess={handleDeleteHistoryProcess}
                onNewProcess={handleNewProcess}
              />
            )}
          </>
        )}
      </main>

      {activeAnalysis && (
        <ProcessChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          analysis={activeAnalysis}
          rules={rules.filter((r) => r.isActive)}
        />
      )}

      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">Análises de Processos SEI GEMAP</span>
            <span>•</span>
            <span>Módulo Especializado de Decisões e Pareceres</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Tríade Decisória • Jurisprudência &amp; Precedentes GEMAP
          </div>
        </div>
      </footer>
    </div>
  );
}
