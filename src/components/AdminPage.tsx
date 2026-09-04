import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Trash2,
  Loader2,
  BarChart3,
  ShieldCheck,
  AlertCircle,
  Database,
  RefreshCw,
} from 'lucide-react';
import { api } from '../lib/apiClient';

interface AllowedUser {
  email: string;
  role: 'admin' | 'member';
  note: string | null;
  addedByEmail: string | null;
  createdAt: string;
}

interface UsageData {
  days: number;
  byUser: { userEmail: string; calls: number; tokens: number; errors: number }[];
  byAction: { action: string; calls: number; tokens: number }[];
  recent: {
    id: string;
    userEmail: string;
    action: string;
    totalTokens: number;
    status: string;
    createdAt: string;
  }[];
}

interface RagStatus {
  rules: number;
  indexedRules: number;
  chunks: number;
  precedents: number;
  indexedPrecedents: number;
}

export const AdminPage: React.FC = () => {
  const [tab, setTab] = useState<'users' | 'usage' | 'index'>('users');
  const [allowed, setAllowed] = useState<AllowedUser[]>([]);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [rag, setRag] = useState<RagStatus | null>(null);
  const [reindexing, setReindexing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [saving, setSaving] = useState(false);

  const loadUsers = () => api.get<AllowedUser[]>('/api/admin/allowed-users').then(setAllowed);
  const loadUsage = () => api.get<UsageData>('/api/admin/usage?days=30').then(setUsage);
  const loadRag = () => api.get<RagStatus>('/api/admin/rag-status').then(setRag);

  useEffect(() => {
    Promise.all([loadUsers(), loadUsage(), loadRag()])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const runReindex = async () => {
    setReindexing(true);
    setError(null);
    try {
      await api.post('/api/admin/reindex');
      await loadRag();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReindexing(false);
    }
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setSaving(true);
    setError(null);
    try {
      setAllowed(await api.post<AllowedUser[]>('/api/admin/allowed-users', { email: newEmail.trim(), role: newRole }));
      setNewEmail('');
      setNewRole('member');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeUser = async (email: string) => {
    if (!confirm(`Remover o acesso de ${email}?`)) return;
    try {
      await api.del(`/api/admin/allowed-users/${encodeURIComponent(email)}`);
      setAllowed((prev) => prev.filter((u) => u.email !== email));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-20 flex items-center justify-center text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando administração...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <h1 className="text-xl font-bold text-slate-900 mb-1">Administração</h1>
      <p className="text-sm text-slate-500 mb-6">Controle de acesso e uso da equipe.</p>

      <div className="flex gap-1.5 mb-6">
        {(['users', 'usage', 'index'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
              tab === t
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'border-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t === 'users' ? 'Usuários autorizados' : t === 'usage' ? 'Uso e auditoria' : 'Índice de busca'}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-6">
          <form onSubmit={addUser} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                E-mail Google
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="pessoa@orgao.gov.br"
                className="w-full text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Papel</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'member')}
                className="text-sm rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-600 outline-none"
              >
                <option value="member">Membro</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Autorizar
            </button>
          </form>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold">E-mail</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Papel</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {allowed.map((u) => (
                  <tr key={u.email} className="border-t border-slate-100">
                    <td className="px-4 py-2.5 text-slate-800">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded ${
                          u.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {u.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                        {u.role === 'admin' ? 'Admin' : 'Membro'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => removeUser(u.email)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Remover acesso"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'usage' && usage && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5" /> Por pessoa · últimos {usage.days} dias
              </h3>
              <ul className="space-y-1.5 text-sm">
                {usage.byUser.length === 0 && <li className="text-slate-400">Sem uso registrado.</li>}
                {usage.byUser.map((u) => (
                  <li key={u.userEmail} className="flex justify-between">
                    <span className="text-slate-700 truncate mr-2">{u.userEmail}</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {u.calls} análises · {(u.tokens / 1000).toFixed(0)}k tok
                      {u.errors > 0 && <span className="text-rose-600"> · {u.errors} erro(s)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Por tipo de operação</h3>
              <ul className="space-y-1.5 text-sm">
                {usage.byAction.map((a) => (
                  <li key={a.action} className="flex justify-between">
                    <span className="text-slate-700">{a.action}</span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {a.calls} · {(a.tokens / 1000).toFixed(0)}k tok
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-4 py-3 border-b border-slate-100">
              Atividade recente
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {usage.recent.map((r) => (
                  <tr key={r.id} className="border-t border-slate-50">
                    <td className="px-4 py-2 text-slate-500 font-mono text-xs whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-4 py-2 text-slate-700 truncate max-w-[160px]">{r.userEmail}</td>
                    <td className="px-4 py-2 text-slate-600">{r.action}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs tabular-nums text-slate-500">
                      {r.totalTokens.toLocaleString('pt-BR')} tok
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={r.status === 'ok' ? 'text-emerald-600' : 'text-rose-600'}>
                        {r.status === 'ok' ? '✓' : '✕'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'index' && rag && (
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            A análise e a pesquisa temática usam busca semântica: em vez de mandar o acervo
            inteiro para a IA a cada consulta, o sistema recupera só os trechos relevantes.
            Reindexe depois de importar um backup ou de cadastrar muitos documentos de uma vez.
          </p>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: 'Regras no acervo', value: rag.rules, sub: `${rag.indexedRules} indexadas` },
              { label: 'Trechos vetorizados', value: rag.chunks, sub: 'chunks de busca' },
              {
                label: 'Precedentes',
                value: rag.precedents,
                sub: `${rag.indexedPrecedents} indexados`,
              },
            ].map((c) => (
              <div key={c.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-2xl font-bold text-slate-900 tabular-nums">{c.value}</div>
                <div className="text-xs font-semibold text-slate-600 mt-1">{c.label}</div>
                <div className="text-[11px] text-slate-400">{c.sub}</div>
              </div>
            ))}
          </div>

          {(rag.indexedRules < rag.rules || rag.indexedPrecedents < rag.precedents) && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              Há documentos sem índice. Enquanto isso, as consultas usam o acervo completo
              (mais lento e caro). Rode a reindexação.
            </div>
          )}

          <button
            onClick={runReindex}
            disabled={reindexing}
            className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-50"
          >
            {reindexing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {reindexing ? 'Reindexando… (pode levar alguns minutos)' : 'Reindexar tudo agora'}
          </button>

          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> Embeddings: {rag.chunks} vetores no PostgreSQL (pgvector)
          </p>
        </div>
      )}
    </div>
  );
};
