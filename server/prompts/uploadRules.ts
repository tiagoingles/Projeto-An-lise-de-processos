import { Type } from '../lib/gemini.js';

export function buildUploadRulesPrompt(input: {
  fileName: string;
  category: string;
  theme: string;
  subfolderPath?: string;
  rawText?: string;
}): string {
  const base = `Você é um Analista Especializado em Extração de Normas, Leis, Decretos e Pareceres Jurídicos da GEMAP para Instrução Processual no SEI.
O usuário está enviando o documento: "${input.fileName}".
Categoria indicada: "${input.category}" (ex: parecer, lei, decreto, orientacao_informal, norma, regra).
Tema indicado: "${input.theme}".
${input.subfolderPath ? `Caminho da pasta de origem: "${input.subfolderPath}"` : ''}

SUA MISSÃO:
Leia integralmente este documento e extraia todas as regras, artigos, requisitos obrigatórios, orientações vinculantes, critérios de deferimento/indeferimento e entendimentos que devem nortear análises de processos no SEI.

Para cada regra ou dispositivo identificado, retorne um objeto com:
- title: Título conciso, descritivo e direto da diretriz (ex: "Exigência de Parecer Jurídico Prévio", "Critérios para Adicional de Qualificação", "Prazo Preclusivo para Repactuação")
- category: "${input.category}" (ou "lei", "decreto", "parecer", "orientacao_informal", "norma", "regra")
- theme: "${input.theme}"
- description: Resumo prático em 1 frase de quando e por que esta regra deve ser observada.
- citationOrArticle: Dispositivo legal exato ou número do parecer (ex: "Art. 107 da Lei nº 14.133/2021", "Parecer Referencial nº 05/2023 - CONJUR", "Art. 50 da Lei nº 9.784/1999").
- content: O comando normativo ou diretriz completa com critérios claros: o que deve ser verificado nos autos do SEI, quais documentos são exigidos, quando deferir, quando indeferir ou quando baixar em diligência.
- tags: Array de palavras-chave temáticas (ex: ["contratos", "reajuste", "parecer-agu", "instrucao-processual"]).

Extraia de forma autônoma e estruturada.`;

  return input.rawText
    ? `${base}\n\nCONTEÚDO INTEGRAL DO DOCUMENTO:\n"""\n${input.rawText}\n"""`
    : base;
}

export const uploadRulesResponseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      category: { type: Type.STRING },
      theme: { type: Type.STRING },
      description: { type: Type.STRING },
      citationOrArticle: { type: Type.STRING },
      content: { type: Type.STRING },
      tags: { type: Type.ARRAY, items: { type: Type.STRING } },
    },
    required: ['title', 'category', 'description', 'content'],
  },
};

export function buildExtractRulesPrompt(rawText: string): string {
  return `Analise o seguinte texto de Lei, Decreto, Portaria ou Parecer Jurídico fornecido pelo usuário e extraia 1 ou mais regras, diretrizes ou critérios para orientar análises de processos no SEI (Sistema Eletrônico de Informações):

TEXTO FORNECIDO:
"""
${rawText}
"""

Extraia as regras em JSON com:
- title: Título conciso da regra
- category: "lei" | "parecer" | "norma" | "regra" | "estilo"
- description: Breve resumo em 1 frase
- citationOrArticle: Dispositivo legal ou número do parecer (ex: Art. 12 da Lei nº ..., Parecer AGU nº ...)
- content: Diretriz e requisitos a verificar no processo SEI
- tags: Lista de palavras-chave`;
}
