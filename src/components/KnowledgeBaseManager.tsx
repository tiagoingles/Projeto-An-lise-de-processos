import React, { useState, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Sparkles,
  Search,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  Brain,
  Sliders,
  Check,
  Loader2,
  UploadCloud,
  FileText,
  FileCheck,
  AlertCircle,
  FileUp,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { ProcessRule, RuleCategory, UserWorkProfile } from '../types';

interface KnowledgeBaseManagerProps {
  rules: ProcessRule[];
  profile: UserWorkProfile;
  onSaveRules: (rules: ProcessRule[]) => void;
  onSaveProfile: (profile: UserWorkProfile) => void;
  onExportKnowledge: () => void;
  onImportKnowledge: () => void;
}

export const KnowledgeBaseManager: React.FC<KnowledgeBaseManagerProps> = ({
  rules,
  profile,
  onSaveRules,
  onSaveProfile,
  onExportKnowledge,
  onImportKnowledge,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [subTab, setSubTab] = useState<'rules' | 'profile' | 'learnings'>('rules');

  // Modal states
  const [isAddRuleModalOpen, setIsAddRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ProcessRule | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<RuleCategory>('lei');
  const [formCitation, setFormCitation] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTags, setFormTags] = useState('');

  // AI Extractor states (text)
  const [isAiExtractorOpen, setIsAiExtractorOpen] = useState(false);
  const [rawTextToExtract, setRawTextToExtract] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // File Upload states (PDF, TXT)
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadStatusMessage, setUploadStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile edit states
  const [editingProfile, setEditingProfile] = useState<UserWorkProfile>({ ...profile });
  const [profileSavedToast, setProfileSavedToast] = useState(false);

  // Filter rules
  const filteredRules = rules.filter((r) => {
    const matchesCategory = activeCategoryFilter === 'all' || r.category === activeCategoryFilter;
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.citationOrArticle && r.citationOrArticle.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.documentSource && r.documentSource.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    onSaveRules(updated);
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta regra/lei da sua base de trabalho?')) {
      const updated = rules.filter((r) => r.id !== id);
      onSaveRules(updated);
    }
  };

  const handleClearAllRules = () => {
    if (confirm('Atenção: deseja realmente APAGAR TODAS as leis, pareceres e regras cadastradas? Sua base ficará completamente limpa.')) {
      onSaveRules([]);
      setUploadStatusMessage('Base limpa com sucesso. Nenhuma regra cadastrada.');
      setTimeout(() => setUploadStatusMessage(null), 4000);
    }
  };

  const handleOpenAddModal = () => {
    setEditingRule(null);
    setFormTitle('');
    setFormCategory('lei');
    setFormCitation('');
    setFormDescription('');
    setFormContent('');
    setFormTags('');
    setIsAddRuleModalOpen(true);
  };

  const handleOpenEditModal = (rule: ProcessRule) => {
    setEditingRule(rule);
    setFormTitle(rule.title);
    setFormCategory(rule.category);
    setFormCitation(rule.citationOrArticle || '');
    setFormDescription(rule.description);
    setFormContent(rule.content);
    setFormTags(rule.tags.join(', '));
    setIsAddRuleModalOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      alert('Preencha pelo menos o título e o conteúdo da diretriz ou artigo.');
      return;
    }

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    if (editingRule) {
      const updated = rules.map((r) =>
        r.id === editingRule.id
          ? {
              ...r,
              title: formTitle.trim(),
              category: formCategory,
              citationOrArticle: formCitation.trim() || undefined,
              description: formDescription.trim(),
              content: formContent.trim(),
              tags: tagsArray,
            }
          : r
      );
      onSaveRules(updated);
    } else {
      const newRule: ProcessRule = {
        id: `rule-${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory,
        citationOrArticle: formCitation.trim() || undefined,
        description: formDescription.trim(),
        content: formContent.trim(),
        tags: tagsArray,
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
      };
      onSaveRules([newRule, ...rules]);
    }

    setIsAddRuleModalOpen(false);
  };

  // Upload PDF or Text Document containing laws, decrees or pareceres
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploadingDocument(true);
    let totalAdded = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatusMessage(`Processando arquivo ${i + 1} de ${files.length}: "${file.name}"...`);

      try {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const base64Data = await base64Promise;
          const res = await fetch('/api/upload-rules-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pdfBase64: base64Data,
              fileName: file.name,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erro ao processar PDF.');

          if (data.extractedRules && Array.isArray(data.extractedRules) && data.extractedRules.length > 0) {
            onSaveRules([...data.extractedRules, ...rules]);
            totalAdded += data.extractedRules.length;
          }
        } else {
          // Text or other format
          const textContent = await file.text();
          const res = await fetch('/api/upload-rules-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rawText: textContent,
              fileName: file.name,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Erro ao processar texto.');

          if (data.extractedRules && Array.isArray(data.extractedRules) && data.extractedRules.length > 0) {
            onSaveRules([...data.extractedRules, ...rules]);
            totalAdded += data.extractedRules.length;
          }
        }
      } catch (err: any) {
        console.error('Erro no upload de documento de regras:', err);
        alert(`Erro ao processar "${file.name}": ${err.message}`);
      }
    }

    setIsUploadingDocument(false);
    if (totalAdded > 0) {
      setUploadStatusMessage(`Sucesso: ${totalAdded} novas diretrizes/artigos adicionados à sua base!`);
      setTimeout(() => setUploadStatusMessage(null), 5000);
    } else {
      setUploadStatusMessage(null);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExtractWithAi = async () => {
    if (!rawTextToExtract.trim() || rawTextToExtract.length < 20) {
      alert('Cole um trecho representativo de lei, decreto, portaria ou parecer jurídico.');
      return;
    }

    setIsExtracting(true);
    try {
      const response = await fetch('/api/extract-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: rawTextToExtract }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao extrair regras.');
      }

      if (data.extractedRules && Array.isArray(data.extractedRules) && data.extractedRules.length > 0) {
        const newRules: ProcessRule[] = data.extractedRules.map((item: any, idx: number) => ({
          id: `rule-ai-${Date.now()}-${idx}`,
          title: item.title || 'Diretriz Extraída',
          category: (['lei', 'parecer', 'norma', 'regra', 'estilo'].includes(item.category)
            ? item.category
            : 'parecer') as RuleCategory,
          citationOrArticle: item.citationOrArticle || undefined,
          description: item.description || '',
          content: item.content || '',
          tags: item.tags || ['extraido-ia'],
          isActive: true,
          createdAt: new Date().toISOString().split('T')[0],
        }));

        onSaveRules([...newRules, ...rules]);
        alert(`${newRules.length} diretriz(es) extraída(s) e adicionada(s) à sua base de conhecimento!`);
        setIsAiExtractorOpen(false);
        setRawTextToExtract('');
      } else {
        alert('Nenhuma regra estruturada pôde ser extraída deste texto.');
      }
    } catch (err: any) {
      alert(`Erro: ${err.message || 'Falha ao processar texto.'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(editingProfile);
    setProfileSavedToast(true);
    setTimeout(() => setProfileSavedToast(false), 2500);
  };

  const handleDeleteLearning = (learningId: string) => {
    const updated = profile.accumulatedLearnings.filter((l) => l.id !== learningId);
    const newProfile = { ...profile, accumulatedLearnings: updated };
    setEditingProfile(newProfile);
    onSaveProfile(newProfile);
  };

  const getCategoryBadge = (category: RuleCategory) => {
    switch (category) {
      case 'lei':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'parecer':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'norma':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'estilo':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-[#C5A059]/10 text-[#C5A059] border-[#C5A059]/30';
    }
  };

  const getCategoryLabel = (category: RuleCategory) => {
    switch (category) {
      case 'lei':
        return 'Lei / Decreto';
      case 'parecer':
        return 'Parecer Jurídico';
      case 'norma':
        return 'Portaria / Normativa';
      case 'estilo':
        return 'Padrão Despacho SEI';
      default:
        return 'Checklist SEI';
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Top Banner */}
      <div className="bg-[#0C0C0E] rounded-2xl border border-[#27272A] p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#18181B] text-[#C5A059] border border-[#C5A059]/30 text-xs font-semibold">
              <FileCheck className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Base Customizada do Usuário para Processos SEI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif italic font-bold text-[#D4D4D8] tracking-tight">
              Minhas Leis, Pareceres e Regras
            </h1>
            <p className="text-xs sm:text-sm text-[#71717A] leading-relaxed">
              Você define exatamente quais leis e pareceres jurídicos o assistente deve usar para confrontar seus processos do SEI.
              Faça upload dos seus documentos em PDF ou adicione regras sob medida.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e.target.files)}
              accept=".pdf,.txt,.json,.docx"
              multiple
              className="hidden"
              id="file-upload-rules-input"
            />

            <button
              id="btn-upload-rules-doc"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingDocument}
              className="bg-[#C5A059] hover:bg-[#D4B26F] text-[#09090B] px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-[0.08em] flex items-center space-x-2 shadow-lg transition-all"
              title="Fazer upload de PDF de Leis ou Pareceres Jurídicos"
            >
              {isUploadingDocument ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#09090B]" />
              ) : (
                <FileUp className="w-4 h-4 text-[#09090B]" />
              )}
              <span>Fazer Upload de Leis/Pareceres (PDF)</span>
            </button>

            <button
              id="btn-ai-extractor"
              onClick={() => setIsAiExtractorOpen(true)}
              className="bg-[#18181B] hover:bg-[#27272A] text-[#E4E4E7] border border-[#3F3F46] px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>Colar Texto</span>
            </button>

            <button
              id="btn-add-rule-manual"
              onClick={handleOpenAddModal}
              className="bg-[#18181B] hover:bg-[#27272A] text-[#E4E4E7] border border-[#3F3F46] px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#D4D4D8]" />
              <span>Nova Regra</span>
            </button>

            {rules.length > 0 && (
              <button
                id="btn-clear-all-rules"
                onClick={handleClearAllRules}
                className="p-2 text-[#71717A] hover:text-rose-400 hover:bg-[#18181B] border border-transparent hover:border-[#3F3F46] rounded-lg transition-colors text-xs"
                title="Limpar todas as regras (Zerar Base)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Upload Status Toast */}
        {uploadStatusMessage && (
          <div className="mt-4 p-3 bg-[#18181B] border border-[#C5A059]/40 rounded-xl text-xs text-[#E4E4E7] flex items-center space-x-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{uploadStatusMessage}</span>
          </div>
        )}

        {/* Sub Navigation */}
        <div className="flex border-b border-[#27272A] mt-6 gap-2">
          <button
            id="subtab-rules"
            onClick={() => setSubTab('rules')}
            className={`py-2.5 px-4 text-xs font-bold uppercase tracking-[0.1em] border-b-2 transition-colors flex items-center space-x-2 ${
              subTab === 'rules'
                ? 'border-[#C5A059] text-[#E4E4E7]'
                : 'border-transparent text-[#71717A] hover:text-[#D4D4D8]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Minhas Leis & Pareceres ({rules.length})</span>
          </button>
          <button
            id="subtab-learnings"
            onClick={() => setSubTab('learnings')}
            className={`py-2.5 px-4 text-xs font-bold uppercase tracking-[0.1em] border-b-2 transition-colors flex items-center space-x-2 ${
              subTab === 'learnings'
                ? 'border-[#C5A059] text-[#E4E4E7]'
                : 'border-transparent text-[#71717A] hover:text-[#D4D4D8]'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>Aprendizados do SEI ({profile.accumulatedLearnings.length})</span>
          </button>
          <button
            id="subtab-profile"
            onClick={() => setSubTab('profile')}
            className={`py-2.5 px-4 text-xs font-bold uppercase tracking-[0.1em] border-b-2 transition-colors flex items-center space-x-2 ${
              subTab === 'profile'
                ? 'border-[#C5A059] text-[#E4E4E7]'
                : 'border-transparent text-[#71717A] hover:text-[#D4D4D8]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Perfil & Despacho SEI</span>
          </button>
        </div>
      </div>

      {/* ================= SUBTAB 1: RULES LIST ================= */}
      {subTab === 'rules' && (
        <div className="space-y-4">
          {/* Quick Upload Drag & Drop Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#27272A] hover:border-[#C5A059]/60 bg-[#0C0C0E]/60 hover:bg-[#121214] rounded-2xl p-5 text-center cursor-pointer transition-all flex flex-col sm:flex-row items-center justify-between gap-4 group"
          >
            <div className="flex items-center space-x-4 text-left">
              <div className="w-10 h-10 rounded-xl bg-[#18181B] border border-[#27272A] group-hover:border-[#C5A059]/40 flex items-center justify-center text-[#C5A059] shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#E4E4E7] group-hover:text-white">
                  Importar Pareceres Jurídicos, Leis e Decretos (PDF ou TXT)
                </p>
                <p className="text-[11px] text-[#71717A]">
                  Clique ou arraste arquivos aqui. A IA lê a íntegra, extrai os artigos e as conclusões vinculantes para as análises no SEI.
                </p>
              </div>
            </div>
            <span className="bg-[#18181B] group-hover:bg-[#27272A] text-[#D4D4D8] border border-[#3F3F46] px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0">
              Selecionar Arquivos
            </span>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-[#0C0C0E] rounded-xl border border-[#27272A] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'Todas' },
                { id: 'lei', label: 'Leis & Decretos' },
                { id: 'parecer', label: 'Pareceres Jurídicos' },
                { id: 'norma', label: 'Portarias & Normas' },
                { id: 'regra', label: 'Checklists SEI' },
                { id: 'estilo', label: 'Padrão de Despacho' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategoryFilter(tab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    activeCategoryFilter === tab.id
                      ? 'bg-[#D4D4D8] text-[#09090B] font-bold'
                      : 'bg-[#18181B] text-[#A1A1AA] hover:text-white border border-[#27272A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por lei, artigo ou parecer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border border-[#27272A] bg-[#121214] text-[#E4E4E7] placeholder-[#52525B] focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>
          </div>

          {/* Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className={`bg-[#0C0C0E] rounded-2xl border p-5 transition-all flex flex-col justify-between shadow-xl ${
                  rule.isActive ? 'border-[#27272A]' : 'border-[#27272A]/50 opacity-50 bg-[#09090B]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getCategoryBadge(rule.category)} font-mono`}>
                        {getCategoryLabel(rule.category)}
                      </span>
                      {rule.citationOrArticle && (
                        <span className="text-[11px] font-semibold text-[#A1A1AA] bg-[#18181B] border border-[#27272A] px-2 py-0.5 rounded font-mono">
                          {rule.citationOrArticle}
                        </span>
                      )}
                      {rule.documentSource && (
                        <span className="text-[10px] text-[#71717A] bg-[#18181B] border border-[#27272A] px-2 py-0.5 rounded truncate max-w-[140px]" title={rule.documentSource}>
                          📄 {rule.documentSource}
                        </span>
                      )}
                    </div>

                    {/* Active Switch */}
                    <button
                      type="button"
                      onClick={() => handleToggleRule(rule.id)}
                      className="text-[#71717A] hover:text-white shrink-0"
                      title={rule.isActive ? 'Desativar temporariamente' : 'Ativar para análises'}
                    >
                      {rule.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-[#52525B]" />
                      )}
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-[#E4E4E7] mb-1 leading-snug font-serif italic">
                    {rule.title}
                  </h3>

                  {rule.description && (
                    <p className="text-xs text-[#71717A] italic mb-3">
                      {rule.description}
                    </p>
                  )}

                  <div className="bg-[#111113] border border-[#27272A] rounded-xl p-3 text-xs text-[#A1A1AA] leading-relaxed font-sans mb-3 whitespace-pre-wrap">
                    {rule.content}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#27272A] text-[11px] text-[#71717A]">
                  <div className="flex flex-wrap gap-1 font-mono">
                    {rule.tags.map((t, idx) => (
                      <span key={idx} className="bg-[#18181B] text-[#71717A] border border-[#27272A] px-1.5 py-0.5 rounded text-[10px]">
                        #{t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(rule)}
                      className="p-1.5 text-[#71717A] hover:text-[#E4E4E7] rounded hover:bg-[#18181B] transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="p-1.5 text-[#71717A] hover:text-rose-400 rounded hover:bg-[#18181B] transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRules.length === 0 && (
            <div className="bg-[#0C0C0E] rounded-2xl border border-[#27272A] p-12 text-center text-[#71717A] space-y-4">
              <BookOpen className="w-10 h-10 mx-auto text-[#3F3F46]" />
              <div className="max-w-md mx-auto space-y-1">
                <p className="text-base font-serif italic font-bold text-[#D4D4D8]">
                  {rules.length === 0 ? 'Nenhuma lei ou parecer carregado ainda' : 'Nenhuma regra encontrada com este filtro'}
                </p>
                <p className="text-xs text-[#71717A] leading-relaxed">
                  {rules.length === 0
                    ? 'Sua base está limpa. Faça o upload dos PDFs das Leis, Decretos e Pareceres Jurídicos que norteiam os seus processos do SEI.'
                    : 'Tente alterar os termos de busca ou selecionar a categoria "Todas".'}
                </p>
              </div>

              {rules.length === 0 && (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#C5A059] hover:bg-[#D4B26F] text-[#09090B] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-[0.08em] flex items-center space-x-2 shadow-md"
                  >
                    <FileUp className="w-4 h-4" />
                    <span>Upload de Leis e Pareceres (PDF)</span>
                  </button>
                  <button
                    onClick={handleOpenAddModal}
                    className="bg-[#18181B] hover:bg-[#27272A] text-[#E4E4E7] border border-[#3F3F46] px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Manualmente</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================= SUBTAB 2: LEARNED INSIGHTS ================= */}
      {subTab === 'learnings' && (
        <div className="bg-[#0C0C0E] rounded-2xl border border-[#27272A] p-6 sm:p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-base font-serif italic font-bold text-[#D4D4D8] mb-1 flex items-center space-x-2">
              <Brain className="w-4 h-4 text-[#C5A059]" />
              <span>Aprendizados Assimilados em Processos SEI</span>
            </h2>
            <p className="text-xs text-[#71717A]">
              Conforme você analisa processos e ajusta propostas, o assistente grava suas preferências operacionais
              para que os próximos processos do SEI já venham alinhados ao seu modo de trabalho.
            </p>
          </div>

          <div className="space-y-3">
            {profile.accumulatedLearnings.map((learning) => (
              <div
                key={learning.id}
                className="p-4 bg-[#111113] border border-[#27272A] rounded-xl flex items-start justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-[11px] text-[#71717A]">
                    <span className="font-mono">{learning.date}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      Aplicado em {learning.appliedCount} análises
                    </span>
                  </div>
                  <p className="text-sm text-[#D4D4D8] font-medium leading-relaxed">
                    {learning.summary}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteLearning(learning.id)}
                  className="p-1.5 text-[#71717A] hover:text-rose-400 rounded transition-colors shrink-0"
                  title="Remover este aprendizado"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {profile.accumulatedLearnings.length === 0 && (
            <div className="text-center py-8 text-[#71717A] text-xs">
              Nenhum aprendizado registrado ainda. Faça a análise de um processo SEI e use o botão "Ajustar & Ensinar ao Assistente".
            </div>
          )}
        </div>
      )}

      {/* ================= SUBTAB 3: USER WORK PROFILE ================= */}
      {subTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="bg-[#0C0C0E] rounded-2xl border border-[#27272A] p-6 sm:p-8 shadow-2xl space-y-6">
          <div>
            <h2 className="text-base font-serif italic font-bold text-[#D4D4D8] mb-1 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[#C5A059]" />
              <span>Configuração do Perfil de Atuação no SEI</span>
            </h2>
            <p className="text-xs text-[#71717A]">
              Personalize sua função, unidade do SEI e preferências de redação para que as Minutas de Despacho venham no formato oficial correto.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                Sua Função / Cargo
              </label>
              <input
                type="text"
                value={editingProfile.role}
                onChange={(e) => setEditingProfile({ ...editingProfile, role: e.target.value })}
                placeholder="Ex: Analista Processual SEI, Chefe de Divisão, Assessor..."
                className="w-full text-xs rounded-xl border border-[#27272A] bg-[#121214] text-[#E4E4E7] placeholder-[#52525B] px-3.5 py-2.5 focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                Unidade SEI / Órgão Competente
              </label>
              <input
                type="text"
                value={editingProfile.jurisdictionOrOrgan}
                onChange={(e) => setEditingProfile({ ...editingProfile, jurisdictionOrOrgan: e.target.value })}
                placeholder="Ex: CGCONT/SEI, DIPES/SEI, Coordenação-Geral de Licitações..."
                className="w-full text-xs rounded-xl border border-[#27272A] bg-[#121214] text-[#E4E4E7] placeholder-[#52525B] px-3.5 py-2.5 focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
              Tom e Estilo da Minuta de Despacho SEI
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'objetivo_direto', title: 'Objetivo e Direto', desc: 'Despacho focado na fundamentação com as leis/pareceres e comando decisório claro.' },
                { id: 'formal_tradicional', title: 'Padrão Técnico Completo', desc: 'Histórico pormenorizado dos autos, citações formais e instrução analítica.' },
                { id: 'pedagogico_didatico', title: 'Orientativo e Didático', desc: 'Despacho instrutório detalhado indicando o que cada unidade deve providenciar.' },
              ].map((tone) => (
                <div
                  key={tone.id}
                  onClick={() => setEditingProfile({ ...editingProfile, decisionTone: tone.id as any })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    editingProfile.decisionTone === tone.id
                      ? 'border-[#C5A059] bg-[#18181B] text-[#E4E4E7]'
                      : 'border-[#27272A] bg-[#111113] text-[#A1A1AA] hover:border-[#3F3F46]'
                  }`}
                >
                  <p className="text-xs font-bold mb-1 text-[#D4D4D8]">{tone.title}</p>
                  <p className={`text-[11px] leading-relaxed ${editingProfile.decisionTone === tone.id ? 'text-[#C5A059]' : 'text-[#71717A]'}`}>
                    {tone.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
              Instruções Gerais de Análise e Padrão de Despacho SEI
            </label>
            <textarea
              rows={4}
              value={editingProfile.customInstructions}
              onChange={(e) => setEditingProfile({ ...editingProfile, customInstructions: e.target.value })}
              placeholder="Ex: Verificar sempre se consta nos autos do SEI a nota técnica do fiscal e certidões válidas antes de deferir repactuação ou pagamento..."
              className="w-full text-xs rounded-xl border border-[#27272A] bg-[#121214] text-[#E4E4E7] placeholder-[#52525B] p-3.5 focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-sans"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[#27272A]">
            {profileSavedToast ? (
              <span className="text-xs text-emerald-400 font-bold flex items-center space-x-1">
                <Check className="w-4 h-4" />
                <span>Perfil salvo com sucesso!</span>
              </span>
            ) : <span />}

            <button
              type="submit"
              id="btn-save-profile"
              className="bg-[#D4D4D8] hover:bg-white text-[#09090B] px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-[0.1em] shadow-md transition-all"
            >
              Salvar Alterações no Perfil
            </button>
          </div>
        </form>
      )}

      {/* ================= MODAL: ADD / EDIT RULE ================= */}
      {isAddRuleModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0C0C0E] rounded-2xl border border-[#27272A] max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-serif italic font-bold text-[#D4D4D8]">
                {editingRule ? 'Editar Regra / Lei / Parecer' : 'Cadastrar Lei, Parecer ou Regra SEI'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddRuleModalOpen(false)}
                className="text-[#71717A] hover:text-[#E4E4E7] font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                    Tipo de Norma / Regra *
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as RuleCategory)}
                    className="w-full text-xs rounded-xl border border-[#27272A] bg-[#121214] text-[#E4E4E7] p-2.5"
                  >
                    <option value="lei">Lei / Decreto / Medida Provisória</option>
                    <option value="parecer">Parecer Jurídico (AGU, Conjur, Procuradoria)</option>
                    <option value="norma">Portaria / Instrução Normativa / Resolução</option>
                    <option value="regra">Checklist SEI / Regra Operacional da Unidade</option>
                    <option value="estilo">Padrão de Minuta de Despacho SEI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                    Citação / Artigo / Número do Parecer
                  </label>
                  <input
                    type="text"
                    value={formCitation}
                    onChange={(e) => setFormCitation(e.target.value)}
                    placeholder="Ex: Art. 107 da Lei 14.133, Parecer AGU nº 05/2023..."
                    className="w-full text-xs rounded-xl border border-[#27272A] bg-[#121214] text-[#E4E4E7] placeholder-[#52525B] px-3 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                  Título da Diretriz *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ex: Exigência de Justificativa e Preclusão Lógica no Reajuste"
                  className="w-full text-xs rounded-xl border border-[#27272A] bg-[#121214] text-[#E4E4E7] placeholder-[#52525B] px-3 py-2.5"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                  Breve Descrição / Hipótese de Incidência
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ex: Aplicar em todos os pedidos de reequilíbrio e repactuação de contratos..."
                  className="w-full text-xs rounded-xl border border-[#27272A] bg-[#121214] text-[#E4E4E7] placeholder-[#52525B] px-3 py-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                  Conteúdo Operacional e Requisitos Vinculantes para a Análise *
                </label>
                <textarea
                  rows={4}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Critérios objetivos que a IA deve verificar nos autos do SEI: quais documentos são obrigatórios, quando deferir, quando indeferir ou quando converter em diligência..."
                  className="w-full text-xs rounded-xl border border-[#27272A] bg-[#121214] text-[#E4E4E7] placeholder-[#52525B] p-3"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#A1A1AA] mb-1">
                  Tags / Palavras-chave (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Ex: contratos, reajuste, parecer-agu, diligencia"
                  className="w-full text-xs rounded-xl border border-[#27272A] bg-[#121214] text-[#E4E4E7] placeholder-[#52525B] px-3 py-2.5"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#27272A]">
                <button
                  type="button"
                  onClick={() => setIsAddRuleModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-[#71717A] hover:bg-[#18181B] hover:text-[#E4E4E7]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  id="btn-save-rule-submit"
                  className="bg-[#D4D4D8] hover:bg-white text-[#09090B] px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-[0.1em]"
                >
                  {editingRule ? 'Salvar Alterações' : 'Adicionar à Base'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: AI EXTRACTOR ================= */}
      {isAiExtractorOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0C0C0E] rounded-2xl border border-[#27272A] max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#E4E4E7]">
                <Sparkles className="w-5 h-5 text-[#C5A059]" />
                <h3 className="text-base font-serif italic font-bold text-[#D4D4D8]">Extrair Regras de Texto com IA</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAiExtractorOpen(false)}
                className="text-[#71717A] hover:text-[#E4E4E7] font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#71717A] leading-relaxed">
              Cole o texto de uma <strong className="text-[#D4D4D8]">lei, decreto, portaria ou parecer jurídico</strong>.
              A IA estruturará automaticamente os artigos e orientações para serem adicionados à sua base de processos do SEI.
            </p>

            <div>
              <textarea
                id="raw-text-extract-input"
                rows={8}
                value={rawTextToExtract}
                onChange={(e) => setRawTextToExtract(e.target.value)}
                placeholder="Cole aqui o texto da lei, portaria ou parecer jurídico..."
                className="w-full text-xs rounded-xl border border-[#27272A] bg-[#121214] text-[#E4E4E7] placeholder-[#52525B] p-3.5 focus:border-[#C5A059] focus:ring-1 focus:ring-[#C5A059] font-mono"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#27272A]">
              <button
                type="button"
                onClick={() => setIsAiExtractorOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#71717A] hover:bg-[#18181B] hover:text-[#E4E4E7]"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="btn-confirm-extract"
                onClick={handleExtractWithAi}
                disabled={isExtracting || !rawTextToExtract.trim()}
                className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-[0.1em] flex items-center space-x-1.5 ${
                  isExtracting || !rawTextToExtract.trim()
                    ? 'bg-[#18181B] text-[#52525B] border border-[#27272A] cursor-not-allowed'
                    : 'bg-[#D4D4D8] hover:bg-white text-[#09090B]'
                }`}
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
                    <span>Estruturando Diretrizes...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-[#09090B]" />
                    <span>Processar e Adicionar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
