import React, { useState, useRef } from 'react';
import {
  FileUp,
  FileText,
  Sparkles,
  CheckCircle2,
  BookOpen,
  Loader2,
  FileBadge,
} from 'lucide-react';
import { SAMPLE_PROCESS_TEXT } from '../lib/sample';
import { useToast } from '../lib/toast';

interface ProcessUploaderProps {
  onStartAnalysis: (payload: {
    pdfBase64?: string;
    fileName?: string;
    manualText?: string;
    customPromptNotes?: string;
  }) => Promise<void>;
  isAnalyzing: boolean;
  progressText?: string | null;
  activeRulesCount: number;
  precedentsCount: number;
  onOpenLegalDocs: () => void;
  onOpenPrecedents: () => void;
}

export const ProcessUploader: React.FC<ProcessUploaderProps> = ({
  onStartAnalysis,
  isAnalyzing,
  progressText,
  activeRulesCount,
  precedentsCount,
  onOpenLegalDocs,
  onOpenPrecedents,
}) => {
  const toast = useToast();
  const [mode, setMode] = useState<'pdf' | 'text'>('pdf');
  const [file, setFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [notes, setNotes] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const takeFile = (f: File) => {
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Selecione um arquivo em formato PDF.');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPdfBase64(reader.result as string);
    reader.onerror = () => toast.error('Erro ao ler o arquivo PDF.');
    reader.readAsDataURL(f);
  };

  const loadSample = () => {
    setMode('text');
    setManualText(SAMPLE_PROCESS_TEXT);
    setNotes('Verificar a regularidade da repactuação e a conformidade com as orientações da Consultoria Jurídica.');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'pdf' && !pdfBase64) return toast.error('Anexe o PDF dos autos do processo.');
    if (mode === 'text' && !manualText.trim()) return toast.error('Cole o texto das peças ou autos.');
    await onStartAnalysis({
      pdfBase64: mode === 'pdf' ? pdfBase64 || undefined : undefined,
      fileName: mode === 'pdf' ? file?.name || 'processo_sei.pdf' : 'autos_sei.txt',
      manualText: mode === 'text' ? manualText : undefined,
      customPromptNotes: notes.trim() || undefined,
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="rise mb-8">
        <span className="font-data inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-700">
          <Sparkles className="h-3.5 w-3.5" />
          Instrução processual · GEMAP
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
          Analisar um processo do SEI
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-slate-600">
          Envie os autos. O sistema identifica o tema, resume os fatos, cruza com o acervo de leis
          e pareceres e com os precedentes da GEMAP, e devolve a minuta do Despacho SEI.
        </p>

        <div className="mt-5 flex flex-wrap gap-2.5 text-xs">
          <button
            onClick={onOpenLegalDocs}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition-colors hover:border-brand-200"
          >
            <BookOpen className="h-3.5 w-3.5 text-brand-600" />
            Acervo legal
            <span className="font-data font-semibold text-brand-700">{activeRulesCount}</span>
          </button>
          <button
            onClick={onOpenPrecedents}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-600 transition-colors hover:border-brand-200"
          >
            <FileBadge className="h-3.5 w-3.5 text-[var(--color-defere)]" />
            Precedentes
            <span className="font-data font-semibold text-[var(--color-defere)]">{precedentsCount}</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-slate-200 bg-white shadow-sm">
        <div className="flex border-b border-slate-200">
          {(['pdf', 'text'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex flex-1 items-center justify-center gap-2 border-b-2 py-3.5 text-[13px] font-semibold transition-colors ${
                mode === m
                  ? 'border-brand-600 bg-white text-brand-700'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {m === 'pdf' ? <FileUp className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {m === 'pdf' ? 'PDF dos autos (SEI)' : 'Colar texto das peças'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-5 p-6 sm:p-8">
          {mode === 'pdf' ? (
            <div
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                if (e.dataTransfer.files?.[0]) takeFile(e.dataTransfer.files[0]);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                dragging
                  ? 'border-brand-600 bg-brand-50'
                  : file
                    ? 'border-[var(--color-defere)] bg-[var(--color-defere-soft)]'
                    : 'border-slate-300 bg-slate-50 hover:border-brand-400'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && takeFile(e.target.files[0])}
              />
              {file ? (
                <div className="space-y-1.5">
                  <CheckCircle2 className="mx-auto h-9 w-9 text-[var(--color-defere)]" />
                  <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                  <p className="font-data text-xs text-slate-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB · pronto para envio
                  </p>
                  <p className="text-xs font-semibold text-brand-600 underline">Trocar arquivo</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileUp className="mx-auto h-9 w-9 text-brand-500" />
                  <p className="text-sm font-semibold text-slate-800">
                    Arraste ou clique para anexar o PDF integral dos autos
                  </p>
                  <p className="text-xs text-slate-500">
                    Gerado pelo SEI em "Gerar Arquivo PDF do Processo". Arquivos grandes são
                    aceitos.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="font-data text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  Conteúdo do processo
                </label>
                <button
                  type="button"
                  onClick={loadSample}
                  className="text-xs font-semibold text-brand-600 underline"
                >
                  Carregar exemplo
                </button>
              </div>
              <textarea
                rows={10}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Cole aqui o extrato das peças, requerimentos, notas técnicas ou pareceres juntados ao processo…"
                className="w-full rounded-xl border border-slate-300 bg-white p-3.5 font-mono text-[13px] text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block font-data text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Foco da análise <span className="font-sans font-medium normal-case text-slate-400">(opcional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: verificar preclusão lógica da repactuação; pedir diligência se faltar parecer jurídico…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-600 focus:ring-1 focus:ring-brand-600"
            />
          </div>

          {isAnalyzing && (
            <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 p-4 text-[13px] font-medium text-brand-900">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" />
              <span>{progressText || 'Processando os autos…'}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isAnalyzing}
              className="flex items-center gap-2 rounded-lg bg-brand-600 px-7 py-3 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analisando…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Iniciar análise
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
