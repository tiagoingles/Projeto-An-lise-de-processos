import { Type } from '../lib/gemini.js';
import { type PrecedentRow, type RuleRow } from './shared.js';

export function buildAnalyzeTopicPrompt(input: {
  topicQuery: string;
  rules: RuleRow[];
  precedents: PrecedentRow[];
}): string {
  const repositoryText =
    input.rules.length > 0
      ? input.rules
          .map(
            (r, idx) =>
              `[DOC ${idx + 1}] ID: ${r.id} | Tipo: ${(r.category || 'norma').toUpperCase()} | Tema: "${r.theme || 'Geral'}" | Título: "${r.title}" | Citação: "${r.citationOrArticle || 'S/C'}" | Pasta: "${r.subfolderPath || 'Raiz'}"\nConteúdo: ${r.content}\n`,
          )
          .join('\n')
      : 'Nenhum documento cadastrado no acervo legal.';

  const precedentsText =
    input.precedents.length > 0
      ? input.precedents
          .map(
            (p, idx) =>
              `[PRECEDENTE GEMAP ${idx + 1}] Processo SEI nº ${p.processNumber} | Assunto: ${p.subject} | Tema: ${p.theme}\n- Decisão: ${p.finalDecision}\n- Tese: ${p.precedentSummary}\n`,
          )
          .join('\n')
      : 'Nenhum precedente cadastrado ainda.';

  return `Você é o Consultor Jurídico Especializado da GEMAP.
O usuário deseja uma análise temática profunda sobre: "${input.topicQuery}".

SUA TAREFA:
Varra minuciosamente todo o Acervo de Normas (leis, decretos, pareceres jurídicos e orientações informais) e o Banco de Processos Reais da GEMAP fornecidos abaixo para responder o que dizem os dispositivos e a prática da unidade sobre o tema "${input.topicQuery}".

ACERVO DE LEIS, DECRETOS, PARECERES E ORIENTAÇÕES:
${repositoryText}

BANCO DE PRECEDENTES E PROCESSOS REAIS GEMAP:
${precedentsText}

Gere uma resposta estruturada contendo:
1. theme: O tema identificado e normalizado (ex: "Repactuação de Preços", "Concessão de Diárias e Passagens", "Fiscalização de Contratos de TI").
2. query: O termo de busca original.
3. executiveSummary: Síntese executiva clara e direta do entendimento da GEMAP sobre este tema.
4. whatLawsAndDecreesSay: Lista de pontos com o que a legislação federal/estadual e os Decretos preveem especificamente para o caso.
5. whatPareceresSay: Lista de conclusões dos Pareceres Jurídicos (Conjur/AGU/Procuradoria), apontando os requisitos e impedimentos fixados pelas consultorias jurídicas.
6. informalGuidelines: Orientações informais, memorandos, checklists ou orientações práticas internas da GEMAP.
7. gemapPrecedentsFound: O que os processos reais anteriores da GEMAP já decidiram sobre o tema (identificando números de processo quando houver).
8. gemapRecommendedProcedure: Procedimento recomendado passo a passo para instruir processos desse assunto no SEI (documentos que devem ser juntados, diligências necessárias e proposta de decisão).
9. matchedDocuments: Array de documentos do acervo citados ou diretamente pertinentes (com id, title, category, theme, citation, contentExcerpt, subfolderPath).`;
}

export const analyzeTopicResponseSchema = {
  type: Type.OBJECT,
  properties: {
    theme: { type: Type.STRING },
    query: { type: Type.STRING },
    executiveSummary: { type: Type.STRING },
    whatLawsAndDecreesSay: { type: Type.ARRAY, items: { type: Type.STRING } },
    whatPareceresSay: { type: Type.ARRAY, items: { type: Type.STRING } },
    informalGuidelines: { type: Type.ARRAY, items: { type: Type.STRING } },
    gemapPrecedentsFound: { type: Type.ARRAY, items: { type: Type.STRING } },
    gemapRecommendedProcedure: { type: Type.STRING },
    matchedDocuments: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          theme: { type: Type.STRING },
          citation: { type: Type.STRING },
          contentExcerpt: { type: Type.STRING },
          subfolderPath: { type: Type.STRING },
        },
        required: ['title', 'category', 'theme', 'contentExcerpt'],
      },
    },
  },
  required: [
    'theme',
    'query',
    'executiveSummary',
    'whatLawsAndDecreesSay',
    'whatPareceresSay',
    'informalGuidelines',
    'gemapPrecedentsFound',
    'gemapRecommendedProcedure',
    'matchedDocuments',
  ],
};
