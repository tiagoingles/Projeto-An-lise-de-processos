import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  Scale,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  FileCheck2,
  Copy,
  Check,
  Loader2,
  ArrowRight,
  ShieldCheck,
  FolderTree,
  FileBadge,
} from 'lucide-react';
import { ProcessRule, PrecedentProcessItem, TopicAnalysisResult } from '../types';

interface TopicAnalysisPageProps {
  rules: ProcessRule[];
  precedents: PrecedentProcessItem[];
  themes: string[];
}

export const TopicAnalysisPage: React.FC<TopicAnalysisPageProps> = ({
  rules,
  precedents,
  themes,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TopicAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);
    setQuery(q);

    try {
      const response = await fetch('/api/analyze-topic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicQuery: q,
          legalRepository: rules,
          precedents,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Falha ao analisar o assunto.');
      }

      setResult(data.result);
    } catch (err: any) {
      console.error('Erro na análise de assunto:', err);
      setError(err.message || 'Erro ao processar consulta do assunto.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!result) return;
    const text = `ANÁLISE DE ASSUNTO GEMAP - ${result.theme.toUpperCase()}
TERMO PESQUISADO: ${result.query}

SÍNTESE EXECUTIVA:
${result.executiveSummary}

O QUE DIZEM LEIS E DECRETOS:
${result.whatLawsAndDecreesSay.map((p) => `• ${p}`).join('\n')}

O QUE DIZEM OS PARECERES JURÍDICOS:
${result.whatPareceresSay.map((p) => `• ${p}`).join('\n')}

ORIENTAÇÕES INFORMAIS E PRÁTICA INTERNA:
${result.informalGuidelines.map((p) => `• ${p}`).join('\n')}

PRECEDENTES ANTERIORES DA GEMAP:
${result.gemapPrecedentsFound.map((p) => `• ${p}`).join('\n')}

PROCEDIMENTO RECOMENDADO NO SEI:
${result.gemapRecommendedProcedure}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            Módulo Temático
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {rules.length} leis/pareceres ativos • {precedents.length} precedentes reais
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
          Análise e Pesquisa de Assunto
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Pesquise qualquer tema para verificar detalhadamente o que dizem as leis, decretos, pareceres jurídicos e orientações práticas cadastrados na GEMAP.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(query);
          }}
          className="space-y-4"
        >
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite um tema, dispositivo ou dúvida (ex: Repactuação de contratos, Adicional de insalubridade, Diárias em recesso)..."
              className="w-full pl-12 pr-32 py-3 text-sm rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 font-medium outline-hidden shadow-xs placeholder-slate-400"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Buscando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Pesquisar Tema</span>
                </>
              )}
            </button>
          </div>

          {/* Quick suggestions by registered themes */}
          {themes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Temas cadastrados:
              </span>
              {themes.slice(0, 7).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleSearch(t)}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium border border-slate-200 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Error notification */}
      {error && (
        <div className="mb-8 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
          <Loader2 className="w-10 h-10 mx-auto text-blue-600 animate-spin mb-4" />
          <h3 className="text-base font-bold text-slate-800 mb-1">
            Varrendo Acervo de Leis, Decretos e Pareceres da GEMAP...
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            A inteligência artificial está cruzando os entendimentos jurídicos, diretrizes normativas e precedentes reais já julgados.
          </p>
        </div>
      )}

      {/* Analysis Result View */}
      {result && !isLoading && (
        <div className="space-y-8">
          {/* Top Overview Banner */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                    Tema Analisado
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Consulta: "{result.query}"
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {result.theme}
                </h2>
              </div>

              <button
                onClick={handleCopySummary}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all flex items-center gap-1.5 self-start sm:self-auto"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-600" />
                    <span>Copiar Síntese para SEI</span>
                  </>
                )}
              </button>
            </div>

            {/* Executive Summary */}
            <div className="mt-5 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Síntese Executiva do Entendimento da GEMAP</span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                {result.executiveSummary}
              </p>
            </div>
          </div>

          {/* 3 Pillars Grid: Leis/Decretos vs Pareceres Jurídicos vs Orientações Informais */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Leis e Decretos */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Leis e Decretos
                  </h3>
                  <p className="text-[10px] text-slate-500">Dispositivos normativos vigentes</p>
                </div>
              </div>

              {result.whatLawsAndDecreesSay && result.whatLawsAndDecreesSay.length > 0 ? (
                <ul className="space-y-3">
                  {result.whatLawsAndDecreesSay.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nenhuma lei ou decreto específico cadastrado para este tema.
                </p>
              )}
            </div>

            {/* Pareceres Jurídicos */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Pareceres Jurídicos
                  </h3>
                  <p className="text-[10px] text-slate-500">Entendimentos da Conjur / AGU / Procuradoria</p>
                </div>
              </div>

              {result.whatPareceresSay && result.whatPareceresSay.length > 0 ? (
                <ul className="space-y-3">
                  {result.whatPareceresSay.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nenhum parecer referencial cadastrado especificamente para este tema.
                </p>
              )}
            </div>

            {/* Orientações Informais & Prática */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-bold text-xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Orientações Informais
                  </h3>
                  <p className="text-[10px] text-slate-500">Checklists internos e notas práticas</p>
                </div>
              </div>

              {result.informalGuidelines && result.informalGuidelines.length > 0 ? (
                <ul className="space-y-3">
                  {result.informalGuidelines.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700 leading-relaxed">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  Nenhuma orientação informal ou checklist específico registrado.
                </p>
              )}
            </div>
          </div>

          {/* Precedentes Reais & Roteiro Recomendado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Precedentes Reais Anteriores na GEMAP */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileBadge className="w-4 h-4 text-blue-600" />
                <span>Precedentes Anteriores da GEMAP sobre o Tema</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Decisões anteriores adotadas em processos reais similares para assegurar a isonomia.
              </p>

              {result.gemapPrecedentsFound && result.gemapPrecedentsFound.length > 0 ? (
                <div className="space-y-3">
                  {result.gemapPrecedentsFound.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                  Nenhum processo real anterior cadastrado para este tema no Banco de Jurisprudência.
                </div>
              )}
            </div>

            {/* Procedimento Recomendado no SEI */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span>Roteiro de Instrução Recomendado no SEI</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Como instruir, quais documentos anexar e como propor a minuta decisória.
              </p>

              <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-200 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-medium">
                {result.gemapRecommendedProcedure}
              </div>
            </div>
          </div>

          {/* Matched Documents from the Acervo */}
          {result.matchedDocuments && result.matchedDocuments.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Documentos do Acervo Diretamente Pertinentes ({result.matchedDocuments.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.matchedDocuments.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white border border-slate-200 text-slate-700">
                        {doc.category}
                      </span>
                      {doc.subfolderPath && (
                        <span className="text-[10px] font-mono text-slate-400">
                          {doc.subfolderPath}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mb-1">
                      {doc.title}
                    </h4>
                    {doc.citation && (
                      <p className="text-[11px] font-mono text-blue-700 font-semibold mb-2">
                        {doc.citation}
                      </p>
                    )}
                    <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                      {doc.contentExcerpt}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State when no search executed */}
      {!result && !isLoading && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">
            Pesquise um tema para consultar a jurisprudência da GEMAP
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-6">
            O assistente fará o cruzamento de todas as leis, pareceres jurídicos, orientações informais e precedentes cadastrados no sistema.
          </p>

          <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
            {themes.slice(0, 5).map((t) => (
              <button
                key={t}
                onClick={() => handleSearch(t)}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 transition-colors font-medium"
              >
                Pesquisar "{t}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
