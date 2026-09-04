import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  FolderArchive,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderTree,
  Tag,
  BookOpen,
  Filter,
  Check,
  X,
  FileCheck,
  Layers,
  Sparkles,
} from 'lucide-react';
import JSZip from 'jszip';
import { ProcessRule, RuleCategory, ZipExtractedItem } from '../types';

interface LegalDocumentsPageProps {
  rules: ProcessRule[];
  themes: string[];
  onAddRule: (rule: ProcessRule) => void;
  onAddRulesBatch: (rules: ProcessRule[]) => void;
  onDeleteRule: (id: string) => void;
  onToggleRule: (id: string) => void;
  onCreateTheme: (newTheme: string) => void;
}

export const LegalDocumentsPage: React.FC<LegalDocumentsPageProps> = ({
  rules,
  themes,
  onAddRule,
  onAddRulesBatch,
  onDeleteRule,
  onToggleRule,
  onCreateTheme,
}) => {
  // Tab within Legal Documents: Upload Form, ZIP Folder, or Acervo List
  const [activeSubTab, setActiveSubTab] = useState<'upload' | 'zip' | 'acervo'>('upload');

  // Single Upload Form State
  const [docCategory, setDocCategory] = useState<RuleCategory>('parecer');
  const [selectedTheme, setSelectedTheme] = useState<string>(themes[0] || 'Contratações Públicas');
  const [newThemeName, setNewThemeName] = useState('');
  const [showNewThemeModal, setShowNewThemeModal] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [citation, setCitation] = useState('');
  const [rawText, setRawText] = useState('');
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isProcessingSingle, setIsProcessingSingle] = useState(false);
  const [singleUploadSuccess, setSingleUploadSuccess] = useState<string | null>(null);
  const [singleUploadError, setSingleUploadError] = useState<string | null>(null);

  // ZIP Upload State
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipExtractedItems, setZipExtractedItems] = useState<ZipExtractedItem[]>([]);
  const [isUnzipping, setIsUnzipping] = useState(false);
  const [isBatchExtracting, setIsBatchExtracting] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number } | null>(null);
  const [zipStatusMessage, setZipStatusMessage] = useState<string | null>(null);

  // Acervo Filter State
  const [searchFilter, setSearchFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [themeFilter, setThemeFilter] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Handle creating a new theme
  const handleSaveNewTheme = () => {
    const trimmed = newThemeName.trim();
    if (!trimmed) return;
    onCreateTheme(trimmed);
    setSelectedTheme(trimmed);
    setNewThemeName('');
    setShowNewThemeModal(false);
  };

  // Detect category from folder or file name
  const detectCategoryFromText = (text: string): RuleCategory => {
    const lower = text.toLowerCase();
    if (lower.includes('parecer') || lower.includes('conjur') || lower.includes('agu') || lower.includes('procurador')) {
      return 'parecer';
    }
    if (lower.includes('decreto')) {
      return 'decreto';
    }
    if (lower.includes('lei') || lower.includes('constituic')) {
      return 'lei';
    }
    if (lower.includes('orientac') || lower.includes('circular') || lower.includes('nota') || lower.includes('informal')) {
      return 'orientacao_informal';
    }
    if (lower.includes('portaria') || lower.includes('resoluc') || lower.includes('normat')) {
      return 'norma';
    }
    return 'parecer';
  };

  // Detect theme from folder hierarchy
  const detectThemeFromPath = (path: string): string => {
    const parts = path.split('/').filter(Boolean);
    if (parts.length > 1) {
      // Top-level or subfolder name
      const folderName = parts[0].replace(/[-_]/g, ' ').trim();
      // Match against known themes if close
      const match = themes.find((t) => t.toLowerCase().includes(folderName.toLowerCase()) || folderName.toLowerCase().includes(t.toLowerCase()));
      if (match) return match;
      // Capitalize
      return folderName.charAt(0).toUpperCase() + folderName.slice(1);
    }
    return themes[0] || 'Geral';
  };

  // Process single document upload (PDF or Text)
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleUploadError(null);
    setSingleUploadSuccess(null);

    if (!fileToUpload && !rawText.trim()) {
      setSingleUploadError('Forneça um arquivo PDF ou cole o texto do documento legal.');
      return;
    }

    setIsProcessingSingle(true);
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

      const response = await fetch('/api/upload-rules-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          rawText: rawText.trim() || undefined,
          fileName: fileToUpload ? fileToUpload.name : (docTitle || 'Documento Legal'),
          category: docCategory,
          theme: selectedTheme,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao processar e extrair regras do documento.');
      }

      if (data.extractedRules && data.extractedRules.length > 0) {
        onAddRulesBatch(data.extractedRules);
        setSingleUploadSuccess(`${data.extractedRules.length} diretriz(es) de ${data.fileName} cadastrada(s) no tema "${selectedTheme}" com sucesso!`);
        setRawText('');
        setFileToUpload(null);
        setDocTitle('');
        setCitation('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        // Fallback manual rule if model returned 0 structured rules
        const fallbackRule: ProcessRule = {
          id: `rule-manual-${Date.now()}`,
          title: docTitle || fileToUpload?.name || 'Documento Legal Cadastrado',
          category: docCategory,
          theme: selectedTheme,
          description: `Dispositivo de ${docCategory.toUpperCase()} no tema ${selectedTheme}`,
          content: rawText || `Documento legal ${fileToUpload?.name || ''} cadastrado no acervo.`,
          isActive: true,
          createdAt: new Date().toISOString().split('T')[0],
          tags: [selectedTheme.toLowerCase(), docCategory],
          citationOrArticle: citation || undefined,
          documentSource: fileToUpload?.name || 'Cadastro Manual',
        };
        onAddRule(fallbackRule);
        setSingleUploadSuccess(`Documento cadastrado no tema "${selectedTheme}" com sucesso!`);
      }
    } catch (err: any) {
      console.error('Erro no upload de documento:', err);
      setSingleUploadError(err.message || 'Erro ao processar o arquivo.');
    } finally {
      setIsProcessingSingle(false);
    }
  };

  // Handle ZIP File Selection and In-Browser Unzipping
  const handleZipFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.zip')) {
      alert('Por favor, selecione um arquivo no formato .ZIP');
      return;
    }

    setZipFile(file);
    setIsUnzipping(true);
    setZipStatusMessage('Descompactando arquivo ZIP e mapeando subpastas...');
    setZipExtractedItems([]);

    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(file);

      const items: ZipExtractedItem[] = [];

      const fileKeys = Object.keys(loadedZip.files);

      for (const relativePath of fileKeys) {
        const zipEntry = loadedZip.files[relativePath];

        // Ignore directories or hidden mac __MACOSX / .DS_Store
        if (zipEntry.dir || relativePath.includes('__MACOSX') || relativePath.startsWith('.') || relativePath.includes('/.')) {
          continue;
        }

        const fileName = relativePath.split('/').pop() || relativePath;
        const lowerName = fileName.toLowerCase();

        let fileType: 'pdf' | 'text' | 'other' = 'other';
        if (lowerName.endsWith('.pdf')) {
          fileType = 'pdf';
        } else if (lowerName.endsWith('.txt') || lowerName.endsWith('.md') || lowerName.endsWith('.doc') || lowerName.endsWith('.docx')) {
          fileType = 'text';
        }

        if (fileType === 'other') continue; // Only process supported files

        const detectedTheme = detectThemeFromPath(relativePath);
        const suggestedCategory = detectCategoryFromText(relativePath);

        items.push({
          fileName,
          filePath: relativePath,
          folderCategory: relativePath.includes('/') ? relativePath.substring(0, relativePath.lastIndexOf('/')) : 'Raiz',
          fileType,
          detectedTheme,
          suggestedCategory,
          status: 'pending',
        });
      }

      setZipExtractedItems(items);
      setZipStatusMessage(`ZIP descompactado! ${items.length} documento(s) identificado(s) nas subpastas.`);
    } catch (err: any) {
      console.error('Erro ao descompactar ZIP:', err);
      alert('Erro ao abrir o arquivo ZIP: ' + (err.message || 'Arquivo corrompido ou formato inválido.'));
      setZipStatusMessage(null);
    } finally {
      setIsUnzipping(false);
    }
  };

  // Batch extract all items from the unzipped archive
  const handleBatchProcessZip = async () => {
    if (!zipFile || zipExtractedItems.length === 0) return;

    setIsBatchExtracting(true);
    const total = zipExtractedItems.length;
    let successCount = 0;

    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(zipFile);

    const updatedItems = [...zipExtractedItems];

    for (let i = 0; i < total; i++) {
      setZipProgress({ current: i + 1, total });
      const item = updatedItems[i];
      item.status = 'processing';
      setZipExtractedItems([...updatedItems]);

      try {
        const zipEntry = loadedZip.files[item.filePath];
        if (!zipEntry) throw new Error('Entrada não encontrada no ZIP');

        let pdfBase64: string | undefined = undefined;
        let rawText: string | undefined = undefined;

        if (item.fileType === 'pdf') {
          const base64Content = await zipEntry.async('base64');
          pdfBase64 = `data:application/pdf;base64,${base64Content}`;
        } else {
          rawText = await zipEntry.async('string');
        }

        const response = await fetch('/api/upload-rules-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfBase64,
            rawText,
            fileName: item.fileName,
            category: item.suggestedCategory,
            theme: item.detectedTheme,
            subfolderPath: item.folderCategory,
          }),
        });

        const data = await response.json();
        if (response.ok && data.success && Array.isArray(data.extractedRules)) {
          onAddRulesBatch(data.extractedRules);
          item.status = 'imported';
          item.extractedCount = data.extractedRules.length;
          successCount++;
        } else {
          // Fallback single rule
          const fallbackRule: ProcessRule = {
            id: `rule-zip-${Date.now()}-${i}`,
            title: item.fileName.replace(/\.[^/.]+$/, ''),
            category: item.suggestedCategory,
            theme: item.detectedTheme,
            description: `Documento extraído de ${item.folderCategory || 'ZIP'}`,
            content: rawText || `Arquivo ${item.fileName} importado da pasta ${item.folderCategory}`,
            isActive: true,
            createdAt: new Date().toISOString().split('T')[0],
            tags: [item.detectedTheme.toLowerCase(), item.suggestedCategory],
            documentSource: item.fileName,
            subfolderPath: item.folderCategory,
          };
          onAddRule(fallbackRule);
          item.status = 'imported';
          item.extractedCount = 1;
          successCount++;
        }
      } catch (err) {
        console.error(`Erro ao processar item ${item.filePath}:`, err);
        item.status = 'error';
      }

      setZipExtractedItems([...updatedItems]);
    }

    setIsBatchExtracting(false);
    setZipProgress(null);
    setZipStatusMessage(`Processamento concluído! ${successCount} arquivo(s) importado(s) para o acervo GEMAP.`);
  };

  // Filtered rules in the Acervo
  const filteredRules = rules.filter((r) => {
    const matchesSearch =
      searchFilter === '' ||
      r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.content.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (r.citationOrArticle && r.citationOrArticle.toLowerCase().includes(searchFilter.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesTheme = themeFilter === 'all' || r.theme === themeFilter;

    return matchesSearch && matchesCategory && matchesTheme;
  });

  const categoryLabels: Record<RuleCategory, string> = {
    parecer: 'Parecer Jurídico',
    lei: 'Lei',
    decreto: 'Decreto',
    orientacao_informal: 'Orientação Informal',
    norma: 'Portaria / Resolução',
    regra: 'Checklist / Regra',
    estilo: 'Diretriz de Estilo',
  };

  const categoryColors: Record<RuleCategory, string> = {
    parecer: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    lei: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    decreto: 'bg-blue-50 text-blue-700 border-blue-200',
    orientacao_informal: 'bg-amber-50 text-amber-700 border-amber-200',
    norma: 'bg-purple-50 text-purple-700 border-purple-200',
    regra: 'bg-slate-100 text-slate-700 border-slate-200',
    estilo: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                Acervo Normativo GEMAP
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {rules.length} dispositivos cadastrados
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
              Upload de Documentos Legais & Normas
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Faça upload de Pareceres Jurídicos, Leis, Decretos ou pastas ZIP com subpastas organizadas por tema.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewThemeModal(true)}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-blue-600" />
              <span>Criar Novo Tema</span>
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex border-b border-slate-200 mt-6 gap-2">
          <button
            onClick={() => setActiveSubTab('upload')}
            className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'upload'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Individual (PDF ou Texto)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('zip')}
            className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'zip'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Upload de Pasta ZIP com Subpastas</span>
            {zipExtractedItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-bold">
                {zipExtractedItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('acervo')}
            className={`pb-3 px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeSubTab === 'acervo'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Consultar Acervo Cadastrado</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 font-bold">
              {rules.length}
            </span>
          </button>
        </div>
      </div>

      {/* TAB 1: SINGLE / DIRECT UPLOAD */}
      {activeSubTab === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Cadastrar Nova Norma ou Parecer Jurídico</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              A IA lerá o documento na íntegra, extrairá os artigos ou conclusões vinculantes e classificará no tema escolhido.
            </p>

            {singleUploadSuccess && (
              <div className="mb-6 p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{singleUploadSuccess}</span>
              </div>
            )}

            {singleUploadError && (
              <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{singleUploadError}</span>
              </div>
            )}

            <form onSubmit={handleSingleSubmit} className="space-y-5">
              {/* Type and Theme Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tipo de Documento */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Tipo do Documento Legal
                  </label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as RuleCategory)}
                    className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden font-medium"
                  >
                    <option value="parecer">Parecer Jurídico (AGU / Conjur / Procuradoria)</option>
                    <option value="lei">Lei (Ordinária, Complementar, Federal)</option>
                    <option value="decreto">Decreto Federal / Estadual / Regulamentar</option>
                    <option value="orientacao_informal">Orientação Informal / Circular / Nota Prática</option>
                    <option value="norma">Portaria / Resolução / Instrução Normativa</option>
                    <option value="regra">Checklist Interno / Regra Operacional</option>
                  </select>
                </div>

                {/* Tema / Assunto */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Tema / Assunto do Dispositivo
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowNewThemeModal(true)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Novo Tema</span>
                    </button>
                  </div>
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                    className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden font-medium"
                  >
                    {themes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload PDF */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Arquivo em PDF da Lei, Decreto ou Parecer
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf"
                    onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Upload className="w-7 h-7 mx-auto text-slate-400 mb-2" />
                  {fileToUpload ? (
                    <div className="text-xs font-semibold text-blue-700">
                      Arquivo selecionado: <span className="underline">{fileToUpload.name}</span> ({(fileToUpload.size / 1024).toFixed(1)} KB)
                    </div>
                  ) : (
                    <>
                      <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                        Clique para anexar o PDF da Lei ou Parecer
                      </p>
                      <p className="text-[11px] text-slate-400">
                        O assistente lerá as páginas e extrairá as teses e comandos decisórios.
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Ou colar texto */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Ou Cole o Texto do Artigo, Parecer ou Orientação
                </label>
                <textarea
                  rows={6}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Cole aqui a ementa do parecer, artigos de lei ou nota orientadora..."
                  className="w-full text-xs sm:text-sm rounded-xl border border-slate-300 bg-white p-3 text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono placeholder-slate-400 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isProcessingSingle}
                  className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isProcessingSingle ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processando e Extraindo Diretrizes...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      <span>Cadastrar no Acervo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Tips / Help Card */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Como funciona a extração</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Ao cadastrar um parecer ou lei, o sistema analisa os dispositivos e cria regras acionáveis que serão automaticamente consultadas quando você analisar um processo do SEI daquele tema.
              </p>
              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Extrai artigos de lei, requisitos e prazos obrigatórios</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Identifica critérios de deferimento ou diligência</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <span>Cria os fundamentos que constarão na minuta do Despacho SEI</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Temas mais comuns na GEMAP
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {themes.slice(0, 8).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTheme(t)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ZIP FOLDER UPLOAD & SUBFOLDER EXTRACTION */}
      {activeSubTab === 'zip' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="max-w-3xl">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-blue-600" />
                <span>Upload de Pasta ZIP com Subpastas</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Suba o arquivo <strong>.ZIP</strong> contendo sua estrutura de pastas. A aplicação descompactará tudo no próprio navegador, identificará os nomes das subpastas como temas ou categorias e permitirá importar todos os documentos de uma vez.
              </p>
            </div>

            {/* ZIP Input Area */}
            <div className="mt-6">
              <input
                type="file"
                ref={zipInputRef}
                accept=".zip"
                onChange={handleZipFileSelected}
                className="hidden"
              />

              <div
                onClick={() => zipInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-blue-600 rounded-xl p-8 text-center cursor-pointer transition-colors bg-blue-50/40 hover:bg-blue-50/70"
              >
                <FolderTree className="w-10 h-10 mx-auto text-blue-500 mb-3" />
                <p className="text-sm font-bold text-slate-800 mb-1">
                  Clique para selecionar sua pasta ZIP
                </p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Ex: <code>Normas_GEMAP.zip</code> com subpastas <code>Contratos/Pareceres/</code>, <code>Pessoal/Leis/</code>, etc.
                </p>

                {zipFile && (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
                    <FolderArchive className="w-3.5 h-3.5" />
                    <span>{zipFile.name} ({(zipFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status Message */}
            {isUnzipping && (
              <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>{zipStatusMessage}</span>
              </div>
            )}

            {zipStatusMessage && !isUnzipping && (
              <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center justify-between">
                <span>{zipStatusMessage}</span>
                {zipExtractedItems.length > 0 && !isBatchExtracting && (
                  <button
                    onClick={handleBatchProcessZip}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Extrair e Cadastrar Todos ({zipExtractedItems.length})</span>
                  </button>
                )}
              </div>
            )}

            {/* Progress Bar during batch extraction */}
            {isBatchExtracting && zipProgress && (
              <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex justify-between text-xs font-semibold text-blue-900 mb-1.5">
                  <span>Processando documentos e extraindo normas com IA...</span>
                  <span>
                    {zipProgress.current} de {zipProgress.total} ({Math.round((zipProgress.current / zipProgress.total) * 100)}%)
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 transition-all duration-300"
                    style={{ width: `${(zipProgress.current / zipProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Table of Unzipped Files */}
          {zipExtractedItems.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Estrutura de Arquivos Identificada na Pasta ZIP
                  </h3>
                  <p className="text-xs text-slate-500">
                    Confira a classificação de tema e categoria extraída das subpastas antes de processar.
                  </p>
                </div>

                <button
                  onClick={handleBatchProcessZip}
                  disabled={isBatchExtracting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isBatchExtracting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirmar e Importar Todos</span>
                    </>
                  )}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Arquivo</th>
                      <th className="px-4 py-3">Subpasta de Origem</th>
                      <th className="px-4 py-3">Tipo Identificado</th>
                      <th className="px-4 py-3">Tema Sugerido</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {zipExtractedItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <span className="truncate max-w-xs">{item.fileName}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                          {item.folderCategory || 'Raiz'}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.suggestedCategory}
                            onChange={(e) => {
                              const updated = [...zipExtractedItems];
                              updated[idx].suggestedCategory = e.target.value as RuleCategory;
                              setZipExtractedItems(updated);
                            }}
                            className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium"
                          >
                            <option value="parecer">Parecer Jurídico</option>
                            <option value="lei">Lei</option>
                            <option value="decreto">Decreto</option>
                            <option value="orientacao_informal">Orientação Informal</option>
                            <option value="norma">Portaria / Resolução</option>
                            <option value="regra">Checklist</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={item.detectedTheme}
                            onChange={(e) => {
                              const updated = [...zipExtractedItems];
                              updated[idx].detectedTheme = e.target.value;
                              setZipExtractedItems(updated);
                            }}
                            className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium max-w-[180px] truncate"
                          >
                            {themes.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                            {!themes.includes(item.detectedTheme) && (
                              <option value={item.detectedTheme}>{item.detectedTheme}</option>
                            )}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {item.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                              Pendente
                            </span>
                          )}
                          {item.status === 'processing' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Extraindo...</span>
                            </span>
                          )}
                          {item.status === 'imported' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Importado ({item.extractedCount || 1} regras)</span>
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                              Erro
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACERVO CADASTRADO VIEW */}
      {activeSubTab === 'acervo' && (
        <div className="space-y-6">
          {/* Search and Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Buscar no acervo..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden text-slate-800"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-700 font-medium outline-hidden"
              >
                <option value="all">Todas as Categorias</option>
                <option value="parecer">Pareceres Jurídicos</option>
                <option value="lei">Leis</option>
                <option value="decreto">Decretos</option>
                <option value="orientacao_informal">Orientações Informais</option>
                <option value="norma">Portarias / Resoluções</option>
                <option value="regra">Checklists / Regras</option>
              </select>

              {/* Theme Filter */}
              <select
                value={themeFilter}
                onChange={(e) => setThemeFilter(e.target.value)}
                className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 bg-white text-slate-700 font-medium outline-hidden max-w-[200px] truncate"
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

          {/* Rules Grid */}
          {filteredRules.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Nenhum documento encontrado no acervo
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Utilize as abas de upload acima para cadastrar pareceres, leis ou subir sua pasta ZIP.
              </p>
              <button
                onClick={() => setActiveSubTab('upload')}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold"
              >
                Cadastrar Primeiro Documento
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredRules.map((rule) => (
                <div
                  key={rule.id}
                  className={`bg-white border rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between ${
                    rule.isActive ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${categoryColors[rule.category] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {categoryLabels[rule.category] || rule.category}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {rule.createdAt}
                      </span>
                    </div>

                    <div className="mb-2">
                      <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                        {rule.theme || 'Geral'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 leading-snug mb-1.5">
                      {rule.title}
                    </h4>

                    {rule.citationOrArticle && (
                      <p className="text-xs font-mono font-semibold text-slate-600 mb-2">
                        {rule.citationOrArticle}
                      </p>
                    )}

                    <p className="text-xs text-slate-600 line-clamp-3 mb-3 leading-relaxed">
                      {rule.content}
                    </p>

                    {rule.subfolderPath && (
                      <p className="text-[10px] text-slate-400 font-mono mb-2">
                        Pasta ZIP: {rule.subfolderPath}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    <button
                      onClick={() => onToggleRule(rule.id)}
                      className={`text-[11px] font-semibold px-2 py-1 rounded transition-colors ${
                        rule.isActive
                          ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                          : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                      }`}
                    >
                      {rule.isActive ? 'Ativo na Análise' : 'Desativado'}
                    </button>

                    <button
                      onClick={() => onDeleteRule(rule.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Excluir do acervo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Create New Theme */}
      {showNewThemeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-blue-600" />
                <span>Criar Novo Tema / Assunto</span>
              </h3>
              <button
                onClick={() => setShowNewThemeModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Defina um novo tema para categorizar leis, pareceres e orientações informais da GEMAP (ex: "Convênios", "Suprimento de Fundos", "Inexigibilidade").
            </p>

            <input
              type="text"
              autoFocus
              value={newThemeName}
              onChange={(e) => setNewThemeName(e.target.value)}
              placeholder="Nome do novo tema..."
              className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 p-2.5 text-slate-800 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden mb-5"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowNewThemeModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNewTheme}
                disabled={!newThemeName.trim()}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-xs disabled:opacity-50"
              >
                Salvar Tema
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
