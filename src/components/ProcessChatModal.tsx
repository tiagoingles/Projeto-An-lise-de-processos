import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Bot, User, Loader2, X, Sparkles, Copy, Check } from 'lucide-react';
import { ProcessAnalysisResult, ProcessRule, ChatMessage } from '../types';

interface ProcessChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ProcessAnalysisResult;
  rules: ProcessRule[];
}

export const ProcessChatModal: React.FC<ProcessChatModalProps> = ({
  isOpen,
  onClose,
  analysis,
  rules,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Olá! Estou à disposição para debater os autos do processo SEI ${analysis.processNumber || ''} ("${analysis.subject}"). Você pode me pedir para redigir uma minuta de Despacho SEI alternativa, verificar conformidade com uma lei ou parecer específico, ou listar diligências necessárias.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'Redija um Despacho SEI determinando diligência prévia à unidade demandante',
    'Confronte este pedido com os pareceres jurídicos e leis cadastradas',
    'Redija a minuta de Despacho caso eu decida pelo INDEFERIMENTO fundamentado',
    'Quais certidões ou documentos obrigatórios ainda faltam nos autos do SEI?',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const historySnapshot = messages;
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    const assistantId = `assistant-${Date.now()}`;
    const stamp = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let streamed = '';
    let started = false;

    const pushDelta = (delta: string) => {
      streamed += delta;
      if (!started) {
        started = true;
        setMessages((prev) => [
          ...prev,
          { id: assistantId, sender: 'assistant', text: streamed, timestamp: stamp() },
        ]);
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, text: streamed } : m)),
        );
      }
    };

    try {
      const response = await fetch('/api/chat-process/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query.trim(),
          processContext: analysis,
          history: historySnapshot,
        }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao comunicar com o assistente.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';
        for (const frame of frames) {
          const evline = frame.split('\n').find((l) => l.startsWith('event:'));
          const dataline = frame.split('\n').find((l) => l.startsWith('data:'));
          if (!evline || !dataline) continue;
          const event = evline.slice(6).trim();
          const payload = JSON.parse(dataline.slice(5).trim());
          if (event === 'delta') pushDelta(payload as string);
          else if (event === 'error') throw new Error(payload as string);
        }
      }
      if (!started) pushDelta('Sem resposta disponível.');
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          text: `Erro: ${err.message || 'Falha ao processar solicitação.'}`,
          timestamp: stamp(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-50 text-slate-900 p-4 sm:px-6 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center border border-blue-200">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Assistente de Processo SEI
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Processo: <span className="text-blue-700 font-semibold">{analysis.processNumber || 'Em análise'}</span> • {analysis.parties.requesterOrPlaintiff}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="bg-slate-100/50 border-b border-slate-200 px-4 py-2.5 overflow-x-auto flex items-center space-x-2 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1 shrink-0">
            <Sparkles className="w-3 h-3 text-blue-600" />
            <span>Sugestões:</span>
          </span>
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(prompt)}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-blue-500 hover:text-blue-700 transition-colors whitespace-nowrap shrink-0 shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed relative group ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                    : 'bg-white text-slate-800 border border-slate-200 shadow-xs rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-line select-text font-normal">{msg.text}</div>
                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-400 font-mono">
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'assistant' && (
                    <button
                      type="button"
                      onClick={() => handleCopyMessage(msg.id, msg.text)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-blue-600 flex items-center space-x-1"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600 font-semibold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white text-slate-600 border border-slate-200 p-3.5 rounded-2xl rounded-tl-xs text-xs flex items-center space-x-2 shadow-xs">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Consultando os autos e redigindo resposta...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua dúvida, peça para redigir uma certidão, despacho ou nota..."
              className="flex-1 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white text-slate-800 placeholder-slate-400 px-4 py-2.5 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-hidden font-medium"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className={`p-2.5 rounded-xl font-semibold transition-colors flex items-center justify-center ${
                !inputText.trim() || isLoading
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
