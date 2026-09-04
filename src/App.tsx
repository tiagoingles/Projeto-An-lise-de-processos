import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ProcessUploader } from './components/ProcessUploader';
import { AnalysisResultView } from './components/AnalysisResultView';
import { LegalDocumentsPage } from './components/LegalDocumentsPage';
import { TopicAnalysisPage } from './components/TopicAnalysisPage';
import { RealProcessesPage } from './components/RealProcessesPage';
import { ProcessHistoryView } from './components/ProcessHistoryView';
import { ProcessChatModal } from './components/ProcessChatModal';
import {
  ProcessRule,
  UserWorkProfile,
  ProcessAnalysisResult,
  PrecedentProcessItem,
} from './types';
import {
  getStoredRules,
  saveStoredRules,
  getStoredProfile,
  saveStoredProfile,
  getStoredHistory,
  saveProcessToHistory,
  deleteProcessFromHistory,
  getStoredPrecedents,
  saveStoredPrecedents,
  saveSinglePrecedent,
  deleteStoredPrecedent,
  getStoredThemes,
  saveStoredThemes,
  exportKnowledgeBase,
  importKnowledgeBase,
} from './utils/storage';
import { ShieldAlert, X } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<'analysis' | 'topic' | 'legal-docs' | 'precedents' | 'history'>('analysis');
  const [rules, setRules] = useState<ProcessRule[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [precedents, setPrecedents] = useState<PrecedentProcessItem[]>([]);
  const [profile, setProfile] = useState<UserWorkProfile>(getStoredProfile);
  const [history, setHistory] = useState<ProcessAnalysisResult[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<ProcessAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const importFileInputRef = useRef<HTMLInputElement>(null);

  // Initialize data on mount
  useEffect(() => {
    setRules(getStoredRules());
    setThemes(getStoredThemes());
    setPrecedents(getStoredPrecedents());
    setProfile(getStoredProfile());
    setHistory(getStoredHistory());
  }, []);

  const activeRulesCount = rules.filter((r) => r.isActive).length;

  // Rules handlers
  const handleSaveRules = (updatedRules: ProcessRule[]) => {
    setRules(updatedRules);
    saveStoredRules(updatedRules);
  };

  const handleAddRule = (rule: ProcessRule) => {
    const updated = [rule, ...rules];
    handleSaveRules(updated);
  };

  const handleAddRulesBatch = (newRules: ProcessRule[]) => {
    const updated = [...newRules, ...rules];
    handleSaveRules(updated);
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    handleSaveRules(updated);
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    handleSaveRules(updated);
  };

  // Precedents handlers
  const handleSavePrecedent = (item: PrecedentProcessItem) => {
    const updated = saveSinglePrecedent(item);
    setPrecedents(updated);
  };

  const handleDeletePrecedent = (id: string) => {
    const updated = deleteStoredPrecedent(id);
    setPrecedents(updated);
  };

  // Themes handler
  const handleCreateTheme = (newTheme: string) => {
    if (!themes.includes(newTheme)) {
      const updated = [newTheme, ...themes];
      setThemes(updated);
      saveStoredThemes(updated);
    }
  };

  // Process Analysis execution
  const handleStartAnalysis = async (payload: {
    pdfBase64?: string;
    fileName?: string;
    manualText?: string;
    customPromptNotes?: string;
  }) => {
    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/analyze-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: payload.pdfBase64,
          fileName: payload.fileName,
          manualText: payload.manualText,
          customPromptNotes: payload.customPromptNotes,
          contextRules: rules.filter((r) => r.isActive),
          userWorkProfile: profile,
          precedents: precedents,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao processar análise do documento.');
      }

      if (!data.analysis) {
        throw new Error('O assistente não retornou a estrutura de análise esperada.');
      }

      const fullAnalysis: ProcessAnalysisResult = {
        id: `proc-${Date.now()}`,
        createdAt: new Date().toISOString(),
        fileName: payload.fileName || 'processo_sei.pdf',
        ...data.analysis,
      };

      setActiveAnalysis(fullAnalysis);
      saveProcessToHistory(fullAnalysis);
      setHistory(getStoredHistory());
      setCurrentTab('analysis');
    } catch (err: any) {
      console.error('Falha na análise do processo:', err);
      setErrorMessage(err.message || 'Ocorreu um erro ao comunicar com o servidor.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleNewProcess = () => {
    setActiveAnalysis(null);
    setCurrentTab('analysis');
    setErrorMessage(null);
  };

  const handleSelectHistoryProcess = (proc: ProcessAnalysisResult) => {
    setActiveAnalysis(proc);
    setCurrentTab('analysis');
  };

  const handleDeleteHistoryProcess = (id: string) => {
    const updated = deleteProcessFromHistory(id);
    setHistory(updated);
    if (activeAnalysis?.id === id) {
      setActiveAnalysis(null);
    }
  };

  const handleRecordLearning = (learningSummary: string) => {
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
    handleSaveRules([newRule, ...rules]);
  };

  const handleUpdateMinuta = (newMinuta: string) => {
    if (!activeAnalysis) return;
    const updated: ProcessAnalysisResult = {
      ...activeAnalysis,
      decision: {
        ...activeAnalysis.decision,
        draftDocument: newMinuta,
      },
    };
    setActiveAnalysis(updated);
    saveProcessToHistory(updated);
    setHistory(getStoredHistory());
  };

  const handleExportKnowledge = () => {
    const json = exportKnowledgeBase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sei_gemap_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportKnowledgeClick = () => {
    importFileInputRef.current?.click();
  };

  const handleImportFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = importKnowledgeBase(content);
      if (res.success) {
        setRules(getStoredRules());
        setThemes(getStoredThemes());
        setPrecedents(getStoredPrecedents());
        setProfile(getStoredProfile());
        alert(res.message);
      } else {
        alert(res.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setErrorMessage(null);
        }}
        activeRulesCount={activeRulesCount}
        precedentsCount={precedents.length}
        onNewProcess={handleNewProcess}
        onExportKnowledge={handleExportKnowledge}
        onImportKnowledge={handleImportKnowledgeClick}
      />

      {/* Hidden file input for importing knowledge JSON */}
      <input
        type="file"
        ref={importFileInputRef}
        onChange={handleImportFileSelected}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="max-w-7xl mx-auto mt-4 px-4 w-full">
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between text-rose-900 text-xs sm:text-sm shadow-sm">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Atenção ao processar solicitação:</p>
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

      {/* Main Content Area according to selected Tab */}
      <main className="flex-1 pb-16">
        {currentTab === 'analysis' && (
          <>
            {activeAnalysis ? (
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
            )}
          </>
        )}

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
      </main>

      {/* Process Interactive Chat Modal */}
      {activeAnalysis && (
        <ProcessChatModal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          analysis={activeAnalysis}
          rules={rules.filter((r) => r.isActive)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">Análises de Processos SEI GEMAP</span>
            <span>•</span>
            <span>Módulo Especializado de Decisões e Pareceres</span>
          </div>
          <div className="font-mono text-[11px] text-slate-400">
            Tríade Decisória • Jurisprudência & Precedentes GEMAP
          </div>
        </div>
      </footer>
    </div>
  );
}
