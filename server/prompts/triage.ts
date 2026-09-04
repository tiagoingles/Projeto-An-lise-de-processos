import { Type } from '../lib/gemini.js';

/**
 * 1ª passada barata: identifica tema, resumo curto e palavras-chave do processo.
 * O resultado vira a consulta para recuperar (RAG) só as normas e precedentes
 * relevantes antes da análise completa.
 */
export const triagePrompt = `Leia o processo administrativo do SEI abaixo (PDF ou texto) e devolva APENAS:
- tema: o assunto central em poucas palavras (ex: "Repactuação de contrato de TI", "Adicional de qualificação")
- resumo: 2 a 4 frases objetivas sobre o que se pede e o estágio do processo
- palavrasChave: 5 a 12 termos jurídicos/administrativos que ajudem a localizar normas e precedentes aplicáveis
- numeroProcesso: o número SEI, se identificável, ou "Não informado"`;

export const triageResponseSchema = {
  type: Type.OBJECT,
  properties: {
    tema: { type: Type.STRING },
    resumo: { type: Type.STRING },
    palavrasChave: { type: Type.ARRAY, items: { type: Type.STRING } },
    numeroProcesso: { type: Type.STRING },
  },
  required: ['tema', 'resumo', 'palavrasChave'],
};

export interface TriageResult {
  tema: string;
  resumo: string;
  palavrasChave: string[];
  numeroProcesso?: string;
}

export function triageToQuery(t: TriageResult, extra?: string): string {
  return [t.tema, t.resumo, (t.palavrasChave || []).join(', '), extra].filter(Boolean).join('\n');
}
