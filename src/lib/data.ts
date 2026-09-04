import { api } from './apiClient';
import type {
  ProcessRule,
  PrecedentProcessItem,
  UserWorkProfile,
  ProcessAnalysisResult,
} from '../types';

/** Camada de dados compartilhados. Substitui o antigo utils/storage.ts (localStorage). */

/* ---------------------------------- Regras --------------------------------- */
export const getRules = () => api.get<ProcessRule[]>('/api/rules');
export const createRule = (rule: ProcessRule) => api.post<ProcessRule>('/api/rules', rule);
export const createRulesBatch = (rules: ProcessRule[]) =>
  api.post<{ created: number; rules: ProcessRule[] }>('/api/rules', { rules });
export const updateRule = (id: string, patch: Partial<ProcessRule>) =>
  api.patch<ProcessRule>(`/api/rules/${id}`, patch);
export const deleteRule = (id: string) => api.del(`/api/rules/${encodeURIComponent(id)}`);

/* -------------------------------- Precedentes ------------------------------ */
export const getPrecedents = () => api.get<PrecedentProcessItem[]>('/api/precedents');
export const savePrecedent = (item: PrecedentProcessItem) =>
  api.post<PrecedentProcessItem>('/api/precedents', item);
export const deletePrecedent = (id: string) =>
  api.del(`/api/precedents/${encodeURIComponent(id)}`);

/* ----------------------------------- Temas -------------------------------- */
export const getThemes = () => api.get<string[]>('/api/themes');
export const addTheme = (name: string) => api.post<string[]>('/api/themes', { name });

/* ---------------------------------- Perfil -------------------------------- */
export const getProfile = () => api.get<UserWorkProfile | null>('/api/profile');
export const saveProfile = (profile: UserWorkProfile) =>
  api.put<UserWorkProfile>('/api/profile', profile);

/* --------------------------------- Histórico ------------------------------ */
export const getHistory = () => api.get<ProcessAnalysisResult[]>('/api/history');
export const saveHistory = (analysis: ProcessAnalysisResult) =>
  api.post<{ ok: boolean; id: string }>('/api/history', { analysis });
export const deleteHistory = (id: string) =>
  api.del(`/api/history/${encodeURIComponent(id)}`);

/* ----------------------------- Backup / migração -------------------------- */
export const exportKnowledge = () => api.get<Record<string, unknown>>('/api/knowledge/export');
export const importBackup = (payload: Record<string, unknown>) =>
  api.post<{ ok: boolean; imported: Record<string, number | boolean> }>(
    '/api/admin/import-backup',
    payload,
  );

export const DEFAULT_USER_PROFILE: UserWorkProfile = {
  role: 'Analista / Gestor de Processos SEI',
  jurisdictionOrOrgan: 'GEMAP',
  decisionTone: 'objetivo_direto',
  customInstructions:
    'Analisar processos do SEI confrontando minuciosamente os pedidos com as Leis, Decretos, Portarias e Pareceres Jurídicos cadastrados. Fornecer Minuta de Despacho SEI no padrão oficial pronto para inserção no sistema.',
  accumulatedLearnings: [],
};
