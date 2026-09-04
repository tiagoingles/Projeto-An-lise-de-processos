import { Type } from '../lib/gemini.js';

export function buildExtractRealProcessPrompt(fileName: string, rawText?: string): string {
  const base = `Você é um Analista Especialista em Catalogação de Precedentes e Jurisprudência Administrativa da GEMAP no SEI.
O usuário está enviando os autos ou a decisão de um processo real já concluído: "${fileName}".

SUA MISSÃO:
Extraia os dados essenciais deste processo real para que ele sirva de balizador de aprendizado e precedência para análises futuras da GEMAP:
- processNumber: Número do processo SEI (ex: 19975.001234/2023-11)
- subject: Assunto principal do processo
- theme: Tema categorizado (ex: Contratações Públicas, Gestão de Pessoas, Diárias, Reajuste de Preços)
- factualSummary: Resumo objetivo dos fatos que originaram a demanda
- finalDecision: A decisão final adotada pela autoridade (ex: Deferimento do pedido, Homologação com ressalva, Indeferimento)
- outcomeType: "DEFERIMENTO_TOTAL" | "DEFERIMENTO_PARCIAL" | "INDEFERIMENTO" | "DILIGENCIA_PREVIA" | "ENCAMINHAMENTO" | "EXTINCAO" | "OUTRO"
- deliberationsOrDespacho: O teor essencial do despacho decisório ou deliberações
- unit: Unidade SEI que decidiu (ex: GEMAP, COFIN, GAB)
- date: Data aproximada da decisão (formato YYYY-MM-DD ou ano)
- tags: Array de palavras-chave
- precedentSummary: A tese ou regra prática fixada neste caso concreto que servirá de balizador para casos futuros similares.`;

  return rawText ? `${base}\n\nCONTEÚDO DO PROCESSO REAL:\n"""\n${rawText}\n"""` : base;
}

export const extractRealProcessResponseSchema = {
  type: Type.OBJECT,
  properties: {
    processNumber: { type: Type.STRING },
    subject: { type: Type.STRING },
    theme: { type: Type.STRING },
    factualSummary: { type: Type.STRING },
    finalDecision: { type: Type.STRING },
    outcomeType: { type: Type.STRING },
    deliberationsOrDespacho: { type: Type.STRING },
    unit: { type: Type.STRING },
    date: { type: Type.STRING },
    tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    precedentSummary: { type: Type.STRING },
  },
  required: [
    'processNumber',
    'subject',
    'theme',
    'factualSummary',
    'finalDecision',
    'deliberationsOrDespacho',
    'precedentSummary',
  ],
};
