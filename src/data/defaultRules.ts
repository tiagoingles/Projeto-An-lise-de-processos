import { ProcessRule, UserWorkProfile } from '../types';

export const DEFAULT_USER_PROFILE: UserWorkProfile = {
  role: 'Analista / Gestor de Processos SEI',
  jurisdictionOrOrgan: 'Unidade SEI / Gestão Processual',
  decisionTone: 'objetivo_direto',
  customInstructions: 'Analisar processos do SEI confrontando minuciosamente os pedidos com as Leis, Decretos, Portarias e Pareceres Jurídicos cadastrados. Fornecer Minuta de Despacho SEI no padrão oficial pronto para inserção no sistema.',
  accumulatedLearnings: []
};

// O usuário inicia com a base limpa, sem diretrizes pré-carregadas indesejadas.
// As regras, leis e pareceres são carregados diretamente pelo usuário via upload (PDF ou texto).
export const DEFAULT_RULES: ProcessRule[] = [];

