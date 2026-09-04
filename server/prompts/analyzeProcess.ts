import { Type } from '../lib/gemini.js';
import {
  buildPrecedentsText,
  buildProfileText,
  buildRulesText,
  type PrecedentRow,
  type RuleRow,
  type WorkProfileRow,
} from './shared.js';

export function buildAnalyzeProcessSystemInstruction(input: {
  rules: RuleRow[];
  precedents: PrecedentRow[];
  profile?: WorkProfileRow | null;
  customPromptNotes?: string;
}): string {
  const rulesText = buildRulesText(input.rules);
  const precedentsText = buildPrecedentsText(input.precedents);
  const profileText = buildProfileText(input.profile);

  return `Você é o Especialista em Instrução e Análise de Processos Administrativos SEI da GEMAP.
Sua missão primordial é ler integralmente o processo administrativo do SEI (em PDF exportado dos autos ou texto), identificar do que se trata (tema central), fazer um resumo fiel e objetivo dos fatos, e confrontá-lo RIGOROSAMENTE com:
1. DISPOSITIVOS NORMATIVOS E PARECERES CADASTRADOS NO ACERVO DA GEMAP (Leis, Decretos, Pareceres Jurídicos da Conjur/AGU, Orientações Informais da unidade).
2. BANCO DE PROCESSOS REAIS DA GEMAP (Jurisprudência e precedentes de casos idênticos ou análogos já decididos anteriormente).

ESTRUTURA OBRIGATÓRIA DA ANÁLISE:
1. IDENTIFICAÇÃO DO TEMA E RESUMO DOS FATOS:
   - Identifique com clareza o tema/assunto central do processo (ex: "Reajuste e Repactuação de Contrato de TI", "Concessão de Adicional de Qualificação", "Aplicação de Penalidade por Atraso na Entrega").
   - Faça um resumo objetivo, cronológico e fidedigno dos fatos relatados nos autos.

2. BUSCA E CONFRONTO COM DISPOSITIVOS DO ACERVO:
   - Procure e cite quais artigos de leis, decretos, pareceres jurídicos e orientações informais do acervo se aplicam diretamente ao caso.
   - Demonstre se os requisitos exigidos pelas normas foram cumpridos ou descumpridos.

3. CONFRONTO COM PRECEDENTES REAIS DA GEMAP:
   - Verifique se há algum processo análogo no Banco de Processos Reais da GEMAP. Se houver, aponte a coerência com a tese fixada.

4. TRÍADE DECISÓRIA:
   A) O QUE DECIDIR:
      - Conclusão administrativa explícita: DEFERIMENTO_TOTAL, DEFERIMENTO_PARCIAL (com ressalvas), INDEFERIMENTO, DILIGENCIA_PREVIA (saneamento nos autos SEI), ENCAMINHAMENTO (tramitação) ou EXTINCAO.
      - Fundamentação estrita nas Leis, Decretos e Pareceres da GEMAP.
      - MINUTA OFICIAL DE DESPACHO SEI (no padrão oficial para copiar e colar diretamente no SEI):
        * Epígrafe: DESPACHO SEI Nº [Ano]/GEMAP
        * Referência: Processo SEI nº [Número dos autos]
        * Interessado(a): [Nome do Requerente/Empresa]
        * 1. HISTÓRICO DOS AUTOS: Relatório sucinto das peças acostadas ao SEI.
        * 2. ANÁLISE TÉCNICA E FUNDAMENTAÇÃO: Confronto analítico dos pedidos com a lei e pareceres aplicáveis.
        * 3. CONCLUSÃO E DELIBERAÇÃO: Dispositivo claro com a decisão e comandos de tramitação.
   B) O QUE CONSIDERAR:
      - Análise de instrução processual: documentos obrigatórios juntados, tempestividade, competência, riscos de nulidade ou apontamentos dos órgãos de controle.
   C) O QUE DELIBERAR:
      - Ações imediatas no SEI (assinatura, juntada de comprovantes, certidões).
      - Tramitação no SEI (unidade de destino).
      - Notificações aos interessados com prazo fixado.

ACERVO DE LEIS, DECRETOS, PARECERES E ORIENTAÇÕES DA GEMAP:
${rulesText}

BANCO DE PROCESSOS REAIS E JURISPRUDÊNCIA GEMAP:
${precedentsText}

DIRETRIZES DA UNIDADE:
${profileText}

${input.customPromptNotes ? `OBSERVAÇÕES ADICIONAIS DO USUÁRIO PARA ESTE CASO ESPECÍFICO:\n${input.customPromptNotes}` : ''}`;
}

export const analyzeProcessResponseSchema = {
  type: Type.OBJECT,
  properties: {
    processNumber: {
      type: Type.STRING,
      description: "Número do processo SEI identificado (ex: 19975.002481/2024-33) ou 'Não informado'",
    },
    subject: { type: Type.STRING, description: 'Assunto principal do processo administrativo SEI' },
    theme: {
      type: Type.STRING,
      description: 'Tema central classificado (ex: Contratações Públicas, Gestão de Pessoas, Diárias, Reajuste)',
    },
    parties: {
      type: Type.OBJECT,
      properties: {
        requesterOrPlaintiff: { type: Type.STRING, description: 'Interessado(a), Requerente ou Empresa Contratada' },
        respondentOrDefendant: { type: Type.STRING, description: 'Unidade SEI de Origem / GEMAP / Órgão Competente' },
        others: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Outras Unidades SEI envolvidas, fiscais de contrato ou terceiros interessados',
        },
      },
      required: ['requesterOrPlaintiff', 'respondentOrDefendant'],
    },
    factualSummary: {
      type: Type.STRING,
      description: 'Resumo objetivo e detalhado dos fatos e documentos dos autos do SEI (3 a 5 parágrafos)',
    },
    proceduralStage: {
      type: Type.STRING,
      description: 'Fase processual no SEI (ex: Análise de Admissibilidade, Instrução Documental, Concluso para Despacho)',
    },
    urgentMatters: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Prazos em curso no SEI, vencimentos ou urgências administrativas',
    },
    considerations: {
      type: Type.OBJECT,
      properties: {
        factualPoints: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Fatos comprovados pelos documentos juntados aos autos do SEI',
        },
        legalBasis: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              normOrLaw: { type: Type.STRING },
              applicationToCase: { type: Type.STRING },
              sourceRuleTitle: { type: Type.STRING },
            },
            required: ['normOrLaw', 'applicationToCase'],
          },
          description: 'Dispositivos das Leis, Decretos e Pareceres Jurídicos da GEMAP aplicados ao caso',
        },
        proceduralAspects: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Regularidade formal: tempestividade, competência e legitimidade no SEI',
        },
        risksAndCaveats: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Riscos de nulidade, exigências de órgãos de controle ou pontos de cautela',
        },
      },
      required: ['factualPoints', 'legalBasis', 'proceduralAspects', 'risksAndCaveats'],
    },
    decision: {
      type: Type.OBJECT,
      properties: {
        suggestedOutcome: {
          type: Type.STRING,
          description: 'DEFERIMENTO_TOTAL, DEFERIMENTO_PARCIAL, INDEFERIMENTO, DILIGENCIA_PREVIA, ENCAMINHAMENTO, EXTINCAO ou OUTRO',
        },
        outcomeTitle: { type: Type.STRING, description: 'Título ou ementa da deliberação recomendada' },
        legalReasoning: {
          type: Type.STRING,
          description: 'Fundamentação com aplicação expressa dos dispositivos e precedentes cadastrados',
        },
        draftDocument: {
          type: Type.STRING,
          description: 'Texto integral da MINUTA DE DESPACHO SEI (no padrão oficial do SEI com epígrafe, 1. Histórico, 2. Análise/Fundamentação, 3. Decisão e Providências)',
        },
      },
      required: ['suggestedOutcome', 'outcomeTitle', 'legalReasoning', 'draftDocument'],
    },
    deliberations: {
      type: Type.OBJECT,
      properties: {
        immediateActions: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Ações imediatas a serem praticadas no SEI (assinar despacho, juntar certidão)',
        },
        subsequentSteps: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Próximos passos e tramitação no SEI (unidade de destino)',
        },
        notificationsRequired: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Comunicações ou notificações a serem emitidas no SEI para o interessado',
        },
      },
      required: ['immediateActions', 'subsequentSteps', 'notificationsRequired'],
    },
    rulesApplied: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ruleTitle: { type: Type.STRING },
          category: { type: Type.STRING },
          explanation: { type: Type.STRING },
        },
        required: ['ruleTitle', 'category', 'explanation'],
      },
      description: 'Relação de leis, decretos, pareceres ou orientações do acervo que foram aplicados',
    },
    precedentsMatched: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          processNumber: { type: Type.STRING },
          subject: { type: Type.STRING },
          relevance: { type: Type.STRING },
          precedentOutcome: { type: Type.STRING },
        },
        required: ['processNumber', 'subject', 'relevance', 'precedentOutcome'],
      },
      description: 'Processos análogos do Banco de Processos Reais da GEMAP identificados',
    },
    learnedInsights: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Entendimentos ou boas práticas observadas neste processo SEI',
    },
  },
  required: [
    'processNumber',
    'subject',
    'theme',
    'parties',
    'factualSummary',
    'proceduralStage',
    'urgentMatters',
    'considerations',
    'decision',
    'deliberations',
    'rulesApplied',
    'learnedInsights',
  ],
};
