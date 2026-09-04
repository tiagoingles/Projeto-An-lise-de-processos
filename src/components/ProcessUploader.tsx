import React, { useState, useRef } from 'react';
import {
  FileUp,
  FileText,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Clock,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Scale,
  FileBadge,
} from 'lucide-react';
import { SAMPLE_PROCESS_TEXT } from '../lib/sample';

interface ProcessUploaderProps {
  onStartAnalysis: (payload: {
    pdfBase64?: string;
    fileName?: string;
    manualText?: string;
    customPromptNotes?: string;
  }) => Promise<void>;
  isAnalyzing: boolean;
  activeRulesCount: number;
  precedentsCount: number;
  onOpenLegalDocs: () => void;
  onOpenPrecedents: () => void;
}

export const ProcessUploader: React.FC<ProcessUploaderProps> = ({
  onStartAnalysis,
  isAnalyzing,
  activeRulesCount,
  precedentsCount,
  onOpenLegalDocs,
  onOpenPrecedents,
}) => {
  const [activeMode, setActiveMode] = useState<'pdf' | 'text'>('pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [customPromptNotes, setCustomPromptNotes] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Por favor, selecione um arquivo em formato PDF.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setPdfBase64(reader.result as string);
    };
    reader.onerror = () => {
      alert('Erro ao ler o arquivo PDF.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleLoadSample = () => {
    setActiveMode('text');
    setManualText(SAMPLE_PROCESS_TEXT);
    setCustomPromptNotes('Verificar a regularidade da repactuação e a conformidade com as orientações da Consultoria Jurídica.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeMode === 'pdf' && !pdfBase64) {
      alert('Por favor, anexe o arquivo PDF do processo SEI.');
      return;
    }
    if (activeMode === 'text' && !manualText.trim()) {
      alert('Por favor, cole o texto das peças ou autos do processo.');
      return;
    }

    setAnalysisStep(1);
    const stepTimer1 = setTimeout(() => setAnalysisStep(2), 2500);
    const stepTimer2 = setTimeout(() => setAnalysisStep(3), 5500);

    try {
      await onStartAnalysis({
        pdfBase64: activeMode === 'pdf' ? (pdfBase64 || undefined) : undefined,
        fileName: activeMode === 'pdf' ? (selectedFile?.name || 'processo_sei.pdf') : 'autos_sei.txt',
        manualText: activeMode === 'text' ? manualText : undefined,
        customPromptNotes: customPromptNotes.trim() || undefined,
      });
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAnalysisStep(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Banner de Boas-Vindas Clean */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-8">
        <div className="max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Instrução Processual SEI • Módulo GEMAP</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
            Análise Inteligente de Processos SEI
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-5">
            Faça upload dos autos para resumir os fatos, identificar o tema, cruzar com o seu acervo de leis e pareceres cadastrados e obter a minuta pronta do Despacho SEI.
          </p>

          {/* Status dos Balizadores Ativos */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
            <button
              onClick={onOpenLegalDocs}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Acervo Legal:</span>
              <span className="font-bold font-mono text-blue-700">{activeRulesCount} dispositivo(s)</span>
            </button>

            <button
              onClick={onOpenPrecedents}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors"
            >
              <FileBadge className="w-3.5 h-3.5 text-emerald-600" />
              <span>Jurisprudência GEMAP:</span>
              <span className="font-bold font-mono text-emerald-700">{precedentsCount} precedente(s)</span>
            </button>

            <button
              type="button"
              onClick={handleLoadSample}
              className="ml-auto text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
            >
              Carregar Exemplo de Processo SEI
            </button>
          </div>
        </div>
      </div>

      {/* Main Upload Form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Mode Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveMode('pdf')}
            className={`flex-1 py-3.5 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-all border-b-2 ${
              activeMode === 'pdf'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>Upload dos Autos em PDF (SEI)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('text')}
            className={`flex-1 py-3.5 px-4 text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-all border-b-2 ${
              activeMode === 'text'
                ? 'border-blue-600 text-blue-700 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Colar Texto ou Peças dos Autos</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {activeMode === 'pdf' ? (
            /* PDF Upload Box */
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
                accept=".pdf,application/pdf"
                className="hidden"
              />

              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-600 bg-blue-50/70'
                    : selectedFile
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50/60'
                }`}
              >
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Pronto para envio
                    </p>
                    <p className="text-xs text-blue-600 font-semibold underline pt-1">
                      Clique para escolher outro arquivo
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                      <FileUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        Arraste ou clique para anexar o PDF integral do processo SEI
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Arquivos gerados pelo SEI ("Gerar PDF Único" ou relatório de peças)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Manual Text Box */
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Conteúdo do Processo Administrativo SEI
                </label>
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
                >
                  Carregar Exemplo Real
                </button>
              </div>
              <textarea
                rows={10}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Cole aqui o extrato das peças, requerimentos, notas técnicas ou pareceres juntados ao processo..."
                className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 bg-white p-3.5 text-slate-800 font-mono focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden placeholder-slate-400"
              />
            </div>
          )}

          {/* Custom Prompt Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Observações ou Foco da Análise (Opcional)
            </label>
            <input
              type="text"
              value={customPromptNotes}
              onChange={(e) => setCustomPromptNotes(e.target.value)}
              placeholder="Ex: Verificar se houve preclusão lógica, se há parecer jurídico referencial ou pedir diligência documental..."
              className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden placeholder-slate-400 font-medium"
            />
          </div>

          {/* Loading Animation States */}
          {isAnalyzing && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2">
              <div className="flex items-center space-x-3 text-xs font-bold text-blue-900">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                <span>
                  {analysisStep === 1 && 'Lendo peças e autos do processo SEI...'}
                  {analysisStep === 2 && 'Resumindo fatos e cruzando com Acervo Legal e Precedentes...'}
                  {analysisStep >= 3 && 'Estruturando a Tríade Decisória e redigindo Minuta de Despacho SEI...'}
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 transition-all duration-700"
                  style={{
                    width: analysisStep === 1 ? '30%' : analysisStep === 2 ? '65%' : '90%',
                  }}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full sm:w-auto px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analisando Processo SEI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Iniciar Análise Conforme Regras GEMAP</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
