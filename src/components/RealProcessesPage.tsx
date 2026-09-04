import React, { useState, useRef } from 'react';
import {
  Scale,
  Upload,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Eye,
  FileBadge,
  Tag,
  BookMarked,
  Sparkles,
  Check,
  X,
} from 'lucide-react';
import { PrecedentProcessItem } from '../types';

interface RealProcessesPageProps {
  precedents: PrecedentProcessItem[];
  themes: string[];
  onAddPrecedent: (item: PrecedentProcessItem) => void;
  onDeletePrecedent: (id: string) => void;
  onCreateTheme: (theme: string) => void;
}

export const RealProcessesPage: React.FC<RealProcessesPageProps> = ({
  precedents,
  themes,
  onAddPrecedent,
  onDeletePrecedent,
  onCreateTheme,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedPrecedent, setSelectedPrecedent] = useState<PrecedentProcessItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [themeFilter, setThemeFilter] = useState('all');

  // Form State
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploadSuccess(null);

    if (!fileToUpload && !rawText.trim()) {
      setUploadError('Forneça o arquivo PDF do processo real ou cole o texto dos autos.');
      return;
    }

    setIsExtracting(true);
    try {
      let pdfBase64: string | undefined = undefined;
      if (fileToUpload) {
        pdfBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(fileToUpload);
        });
      }

      const response = await fetch('/api/extract-real-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          rawText: rawText.trim() || undefined,
          fileName: fileToUpload?.name || 'processo_real.pdf',
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success || !data.precedent) {
        throw new Error(data.error || 'Falha ao analisar e catalogar processo real.');
      }

      onAddPrecedent(data.precedent);
      setUploadSuccess(`Processo nº ${data.precedent.processNumber} catalogado com sucesso como balizador de aprendizado!`);
      setFileToUpload(null);
      setRawText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => {
        setShowUploadModal(false);
        setUploadSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao catalogar processo real:', err);
      setUploadError(err.message || 'Erro ao processar o arquivo.');
    } finally {
      setIsExtracting(false);
    }
  };

  const filteredPrecedents = precedents.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      p.processNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.factualSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.precedentSummary.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTheme = themeFilter === 'all' || p.theme === themeFilter;

    return matchesSearch && matchesTheme;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Banco de Jurisprudência GEMAP
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {precedents.length} processos balizadores
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
              Processos Reais & Precedentes
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Cadastre e consulte processos reais já julgados no SEI. Eles servem de balizadores de aprendizado contínuo para orientar novas decisões da GEMAP.
            </p>
          </div>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Subir Processo Real</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por número SEI, assunto ou tese..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={themeFilter}
            onChange={(e) => setThemeFilter(e.target.value)}
            className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-700 font-medium outline-hidden w-full sm:w-auto"
          >
            <option value="all">Todos os Temas</option>
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Precedents Grid */}
      {filteredPrecedents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <BookMarked className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">
            Nenhum processo real cadastrado ainda
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            Faça o upload dos autos de processos reais da sua unidade que já foram concluídos para criar um banco de jurisprudência administrativa da GEMAP.
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold"
          >
            Subir Primeiro Processo Real
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrecedents.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
                    {item.processNumber}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.date}
                  </span>
                </div>

                <div className="mb-2">
                  <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                    {item.theme}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 leading-snug mb-2 line-clamp-2">
                  {item.subject}
                </h4>

                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Tese / Balizador de Aprendizado:
                  </p>
                  <p className="text-xs text-slate-700 leading-relaxed line-clamp-3 font-medium">
                    {item.precedentSummary}
                  </p>
                </div>

                <div className="text-xs text-slate-600 space-y-1 mb-3">
                  <p className="line-clamp-2">
                    <span className="font-semibold text-slate-800">Decisão:</span> {item.finalDecision}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Unidade:</span> {item.unit}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <button
                  onClick={() => setSelectedPrecedent(item)}
                  className="text-blue-600 hover:text-blue-800 font-semibold text-xs flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Detalhes</span>
                </button>

                <button
                  onClick={() => onDeletePrecedent(item.id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                  title="Excluir precedente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Upload Real Process */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileBadge className="w-5 h-5 text-blue-600" />
                <span>Subir Processo Real (Balizador GEMAP)</span>
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-6">
              Faça upload do PDF dos autos do processo real ou cole o teor da decisão final. A inteligência artificial catalogará o número SEI, tema, fatos, decisão e a tese balizadora.
            </p>

            {uploadSuccess && (
              <div className="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {uploadError && (
              <div className="mb-4 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleProcessUpload} className="space-y-4">
              {/* File Upload Box */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Autos do Processo em PDF
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/60"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf"
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  {fileToUpload ? (
                    <div className="text-xs font-semibold text-blue-700">
                      Arquivo selecionado: <span className="underline">{fileToUpload.name}</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-semibold text-slate-700 mb-0.5">
                        Clique para selecionar o PDF do processo real
                      </p>
                      <p className="text-[11px] text-slate-400">
                        O assistente extrairá automaticamente a decisão e a tese.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Or paste text */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Ou Cole o Texto do Despacho / Decisão dos Autos
                </label>
                <textarea
                  rows={5}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Cole aqui o número SEI, relatório dos fatos e despacho decisório..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 p-3 text-slate-800 font-mono outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isExtracting}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando e Catalogando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Catalogar no Banco</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details of Precedent */}
      {selectedPrecedent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedPrecedent.theme}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-mono">
                  Processo SEI nº {selectedPrecedent.processNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPrecedent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Assunto
                </h4>
                <p className="text-slate-800 font-medium">{selectedPrecedent.subject}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50/60 border border-blue-200">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-1.5">
                  Tese Balizadora (Aprendizado da GEMAP)
                </h4>
                <p className="text-xs sm:text-sm text-blue-950 font-semibold leading-relaxed">
                  {selectedPrecedent.precedentSummary}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Resumo dos Fatos
                </h4>
                <p className="text-slate-700 leading-relaxed">{selectedPrecedent.factualSummary}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Decisão Adotada
                </h4>
                <p className="text-slate-800 font-semibold">{selectedPrecedent.finalDecision}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Despacho Decisório / Deliberações
                </h4>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 whitespace-pre-wrap">
                  {selectedPrecedent.deliberationsOrDespacho}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>Unidade: {selectedPrecedent.unit}</span>
                <span>Data: {selectedPrecedent.date}</span>
                {selectedPrecedent.sourceFileName && (
                  <span>Arquivo: {selectedPrecedent.sourceFileName}</span>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedPrecedent(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
