import { ProcessRule, UserWorkProfile, ProcessAnalysisResult, PrecedentProcessItem } from '../types';
import { DEFAULT_USER_PROFILE } from '../data/defaultRules';

const STORAGE_KEYS = {
  RULES: 'sei_process_rules_v2',
  PROFILE: 'sei_process_profile_v2',
  HISTORY: 'sei_process_history_v2',
  PRECEDENTS: 'sei_process_precedents_v1',
  THEMES: 'sei_process_themes_v1',
};

export const DEFAULT_THEMES = [
  'Contratações Públicas e Terceirização',
  'Reajuste, Repactuação e Equilíbrio Econômico',
  'Gestão de Pessoas e Benefícios',
  'Diárias, Passagens e Deslocamentos',
  'Fiscalização Contratual e Penalidades',
  'Dispensa e Inexigibilidade de Licitação',
  'Patrimônio e Suprimento de Fundos',
  'Processo Administrativo Disciplinar / Sindicância',
  'Convênios e Termos de Execução Descentralizada',
];

export function getStoredThemes(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEMES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.THEMES, JSON.stringify(DEFAULT_THEMES));
      return DEFAULT_THEMES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_THEMES;
  } catch (err) {
    console.error('Erro ao ler temas do localStorage:', err);
    return DEFAULT_THEMES;
  }
}

export function saveStoredThemes(themes: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEMES, JSON.stringify(themes));
  } catch (err) {
    console.error('Erro ao salvar temas no localStorage:', err);
  }
}

export function getStoredPrecedents(): PrecedentProcessItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRECEDENTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PRECEDENTS, JSON.stringify([]));
      return [];
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler precedentes do localStorage:', err);
    return [];
  }
}

export function saveStoredPrecedents(precedents: PrecedentProcessItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PRECEDENTS, JSON.stringify(precedents));
  } catch (err) {
    console.error('Erro ao salvar precedentes no localStorage:', err);
  }
}

export function saveSinglePrecedent(item: PrecedentProcessItem): PrecedentProcessItem[] {
  const current = getStoredPrecedents();
  const updated = [item, ...current.filter((p) => p.id !== item.id)];
  saveStoredPrecedents(updated);
  return updated;
}

export function deleteStoredPrecedent(id: string): PrecedentProcessItem[] {
  const current = getStoredPrecedents();
  const updated = current.filter((p) => p.id !== id);
  saveStoredPrecedents(updated);
  return updated;
}

export function getStoredRules(): ProcessRule[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RULES);
    if (!raw) {
      // Se não houver nada gravado ou se for primeira execução, começa vazio conforme solicitado pelo usuário
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify([]));
      return [];
    }
    const parsed = JSON.parse(raw);
    // Se ainda contiver resquícios de regras judiciais antigas, limpa para o usuário
    if (Array.isArray(parsed) && parsed.some((r: any) => r.id === 'rule-cpc-10')) {
      localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify([]));
      return [];
    }
    return parsed;
  } catch (err) {
    console.error('Erro ao ler regras do localStorage:', err);
    return [];
  }
}

export function saveStoredRules(rules: ProcessRule[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify(rules));
  } catch (err) {
    console.error('Erro ao salvar regras no localStorage:', err);
  }
}

export function clearAllStoredRules(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.RULES, JSON.stringify([]));
  } catch (err) {
    console.error('Erro ao limpar regras:', err);
  }
}

export function getStoredProfile(): UserWorkProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_USER_PROFILE));
      return DEFAULT_USER_PROFILE;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler perfil do localStorage:', err);
    return DEFAULT_USER_PROFILE;
  }
}

export function saveStoredProfile(profile: UserWorkProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (err) {
    console.error('Erro ao salvar perfil no localStorage:', err);
  }
}

export function getStoredHistory(): ProcessAnalysisResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erro ao ler histórico:', err);
    return [];
  }
}

export function saveProcessToHistory(analysis: ProcessAnalysisResult): void {
  try {
    const existing = getStoredHistory();
    const updated = [analysis, ...existing.filter((item) => item.id !== analysis.id)];
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated.slice(0, 50)));
  } catch (err) {
    console.error('Erro ao salvar no histórico:', err);
  }
}

export function deleteProcessFromHistory(id: string): ProcessAnalysisResult[] {
  try {
    const existing = getStoredHistory();
    const updated = existing.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error('Erro ao excluir do histórico:', err);
    return [];
  }
}

export function exportKnowledgeBase(): string {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '3.0',
    profile: getStoredProfile(),
    rules: getStoredRules(),
    precedents: getStoredPrecedents(),
    themes: getStoredThemes(),
  };
  return JSON.stringify(data, null, 2);
}

export function importKnowledgeBase(jsonString: string): { success: boolean; message: string } {
  try {
    const data = JSON.parse(jsonString);
    if (!data.rules || !Array.isArray(data.rules)) {
      return { success: false, message: 'Arquivo inválido: campo "rules" ausente ou corrompido.' };
    }
    saveStoredRules(data.rules);
    if (data.profile) {
      saveStoredProfile(data.profile);
    }
    if (Array.isArray(data.precedents)) {
      saveStoredPrecedents(data.precedents);
    }
    if (Array.isArray(data.themes)) {
      saveStoredThemes(data.themes);
    }
    return {
      success: true,
      message: `Base importada com sucesso: ${data.rules.length} leis/pareceres e ${data.precedents?.length || 0} precedentes carregados.`,
    };
  } catch (err: any) {
    return { success: false, message: `Erro ao importar: ${err.message || 'JSON inválido'}` };
  }
}

// Exemplo representativo de Processo Administrativo no SEI (Sistema Eletrônico de Informações)
export const SAMPLE_PROCESS_TEXT = `SISTEMA ELETRÔNICO DE INFORMAÇÕES - SEI
ÓRGÃO / ENTIDADE: MINISTÉRIO DA GESTÃO E DA INOVAÇÃO EM SERVIÇOS PÚBLICOS
UNIDADE: COORDENAÇÃO DE GESTÃO DE CONTRATOS E PROCESSOS - CGCONT/SEI

PROCESSO SEI Nº: 19975.002481/2024-33
INTERESSADO(A): TECHSOLUTIONS SERVIÇOS DE TECNOLOGIA LTDA (CNPJ 12.345.678/0001-99)
ASSUNTO: Pedido de Reequilíbrio Econômico-Financeiro (Reajuste de Preços) / Contrato Administrativo nº 14/2023

HISTÓRICO E DOCUMENTOS JUNTADOS NOS AUTOS DO SEI:
1. Doc. SEI nº 1045230: Requerimento da contratada solicitando a concessão de reajuste contratual de 6,8% com base no IPCA acumulado no interregno de 12 meses, referente ao Contrato nº 14/2023 de suporte de TI.
2. Doc. SEI nº 1045231: Planilha de custos e formação de preços apresentada pela empresa com memória de cálculo da variação inflacionária.
3. Doc. SEI nº 1048912: Nota Técnica do Fiscal do Contrato atestando a regular execução dos serviços durante todo o período, sem aplicação de glosas ou penalidades.
4. Doc. SEI nº 1048925: Certidões de Regularidade Fiscal, Trabalhista e FGTS atualizadas da empresa (todas válidas no SICAF).
5. Doc. SEI nº 1051204: Declaração de Disponibilidade Orçamentária emitida pela Coordenação de Orçamento e Finanças (COFIN), indicando a existência de saldo na ação orçamentária 2000 para cobrir o impacto financeiro até o fim do exercício corrente.

PONTO DE DÚVIDA / ANÁLISE SOLICITADA NO DESPACHO DE ENCAMINHAMENTO:
- Verificar se o pedido atende ao prazo de preclusão lógica da repactuação/reajuste (se foi requerido antes da assinatura de termo aditivo de prorrogação contratual).
- Confrontar com as diretrizes do Parecer Jurídico da Consultoria Jurídica e legislação de contratações aplicáveis.
- Minutar o Despacho SEI conclusivo com o deferimento ou solicitação de diligência documental complementar.`;

