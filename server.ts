import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy initialization or safe check for GoogleGenAI
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Aviso: GEMINI_API_KEY não foi configurada em process.env.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// Endpoint to analyze process document (PDF or Text)
app.post("/api/analyze-process", async (req, res) => {
  try {
    const {
      pdfBase64,
      fileName,
      manualText,
      contextRules = [],
      precedents = [],
      userWorkProfile,
      customPromptNotes,
    } = req.body;

    if (!pdfBase64 && !manualText) {
      return res.status(400).json({
        error: "É necessário fornecer um arquivo PDF (em base64) ou o texto dos autos para análise.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY não está configurada no servidor. Verifique as configurações de secrets.",
      });
    }

    const ai = getGenAIClient();

    // Prepare active rules guidance (leis, decretos, pareceres, orientações)
    const rulesText = Array.isArray(contextRules) && contextRules.length > 0
      ? contextRules
          .filter((r: any) => r.isActive !== false)
          .map(
            (r: any, idx: number) =>
              `${idx + 1}. [${(r.category || "norma").toUpperCase()}] Tema: "${r.theme || "Geral"}" | Título: "${r.title}" (${r.citationOrArticle || "Sem citação"}):\n${r.content}\n`
          )
          .join("\n")
      : "Nenhuma regra específica cadastrada no momento no acervo. Aplique a Lei Federal nº 9.784/1999 e normas gerais de processo administrativo.";

    // Prepare precedents bank (Banco de Processos Reais GEMAP)
    const precedentsText = Array.isArray(precedents) && precedents.length > 0
      ? precedents
          .map(
            (p: any, idx: number) =>
              `Precedente GEMAP ${idx + 1}: Processo SEI nº ${p.processNumber || "S/N"} | Assunto/Tema: "${p.subject}" (${p.theme || "Geral"})\n- Resumo: ${p.factualSummary}\n- Decisão Adotada: ${p.finalDecision}\n- Tese/Balizador: ${p.precedentSummary || "Sem tese explícita"}\n`
          )
          .join("\n")
      : "Nenhum processo real anterior cadastrado ainda no banco de jurisprudência GEMAP.";

    // Prepare user profile context
    const profileText = userWorkProfile
      ? `Função do Usuário: ${userWorkProfile.role || "Analista/Assessor GEMAP"}
Órgão/Unidade: ${userWorkProfile.jurisdictionOrOrgan || "GEMAP"}
Tom Decisório Desejado: ${userWorkProfile.decisionTone || "objetivo_direto"}
Instruções Gerais: ${userWorkProfile.customInstructions || "Nenhuma"}
Aprendizados Acumulados:
${
  Array.isArray(userWorkProfile.accumulatedLearnings) && userWorkProfile.accumulatedLearnings.length > 0
    ? userWorkProfile.accumulatedLearnings.map((l: any, i: number) => `- [Aprendizado ${i + 1}]: ${l.summary}`).join("\n")
    : "Iniciando histórico de aprendizado."
}`
      : "Perfil de trabalho GEMAP padrão.";

    const systemInstruction = `Você é o Especialista em Instrução e Análise de Processos Administrativos SEI da GEMAP.
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

${customPromptNotes ? `OBSERVAÇÕES ADICIONAIS DO USUÁRIO PARA ESTE CASO ESPECÍFICO:\n${customPromptNotes}` : ""}`;

    // Schema definition for reliable parsing
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        processNumber: {
          type: Type.STRING,
          description: "Número do processo SEI identificado (ex: 19975.002481/2024-33) ou 'Não informado'",
        },
        subject: {
          type: Type.STRING,
          description: "Assunto principal do processo administrativo SEI",
        },
        theme: {
          type: Type.STRING,
          description: "Tema central classificado (ex: Contratações Públicas, Gestão de Pessoas, Diárias, Reajuste)",
        },
        parties: {
          type: Type.OBJECT,
          properties: {
            requesterOrPlaintiff: {
              type: Type.STRING,
              description: "Interessado(a), Requerente ou Empresa Contratada",
            },
            respondentOrDefendant: {
              type: Type.STRING,
              description: "Unidade SEI de Origem / GEMAP / Órgão Competente",
            },
            others: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Outras Unidades SEI envolvidas, fiscais de contrato ou terceiros interessados",
            },
          },
          required: ["requesterOrPlaintiff", "respondentOrDefendant"],
        },
        factualSummary: {
          type: Type.STRING,
          description: "Resumo objetivo e detalhado dos fatos e documentos dos autos do SEI (3 a 5 parágrafos)",
        },
        proceduralStage: {
          type: Type.STRING,
          description: "Fase processual no SEI (ex: Análise de Admissibilidade, Instrução Documental, Concluso para Despacho)",
        },
        urgentMatters: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Prazos em curso no SEI, vencimentos ou urgências administrativas",
        },
        considerations: {
          type: Type.OBJECT,
          properties: {
            factualPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Fatos comprovados pelos documentos juntados aos autos do SEI",
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
                required: ["normOrLaw", "applicationToCase"],
              },
              description: "Dispositivos das Leis, Decretos e Pareceres Jurídicos da GEMAP aplicados ao caso",
            },
            proceduralAspects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Regularidade formal: tempestividade, competência e legitimidade no SEI",
            },
            risksAndCaveats: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Riscos de nulidade, exigências de órgãos de controle ou pontos de cautela",
            },
          },
          required: ["factualPoints", "legalBasis", "proceduralAspects", "risksAndCaveats"],
        },
        decision: {
          type: Type.OBJECT,
          properties: {
            suggestedOutcome: {
              type: Type.STRING,
              description: "DEFERIMENTO_TOTAL, DEFERIMENTO_PARCIAL, INDEFERIMENTO, DILIGENCIA_PREVIA, ENCAMINHAMENTO, EXTINCAO ou OUTRO",
            },
            outcomeTitle: {
              type: Type.STRING,
              description: "Título ou ementa da deliberação recomendada",
            },
            legalReasoning: {
              type: Type.STRING,
              description: "Fundamentação com aplicação expressa dos dispositivos e precedentes cadastrados",
            },
            draftDocument: {
              type: Type.STRING,
              description: "Texto integral da MINUTA DE DESPACHO SEI (no padrão oficial do SEI com epígrafe, 1. Histórico, 2. Análise/Fundamentação, 3. Decisão e Providências)",
            },
          },
          required: ["suggestedOutcome", "outcomeTitle", "legalReasoning", "draftDocument"],
        },
        deliberations: {
          type: Type.OBJECT,
          properties: {
            immediateActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Ações imediatas a serem praticadas no SEI (assinar despacho, juntar certidão)",
            },
            subsequentSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Próximos passos e tramitação no SEI (unidade de destino)",
            },
            notificationsRequired: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Comunicações ou notificações a serem emitidas no SEI para o interessado",
            },
          },
          required: ["immediateActions", "subsequentSteps", "notificationsRequired"],
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
            required: ["ruleTitle", "category", "explanation"],
          },
          description: "Relação de leis, decretos, pareceres ou orientações do acervo que foram aplicados",
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
            required: ["processNumber", "subject", "relevance", "precedentOutcome"],
          },
          description: "Processos análogos do Banco de Processos Reais da GEMAP identificados",
        },
        learnedInsights: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Entendimentos ou boas práticas observadas neste processo SEI",
        },
      },
      required: [
        "processNumber",
        "subject",
        "theme",
        "parties",
        "factualSummary",
        "proceduralStage",
        "urgentMatters",
        "considerations",
        "decision",
        "deliberations",
        "rulesApplied",
        "learnedInsights",
      ],
    };

    // Prepare contents: PDF part or text part
    const parts: any[] = [];

    if (pdfBase64) {
      // Clean base64 string if it has data URL header
      const cleanedBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: cleanedBase64,
        },
      });
      parts.push({
        text: `Arquivo processual analisado: "${fileName || "processo.pdf"}".
Leia todas as páginas deste documento processual, analise as peças, manifestações, datas, certidões e pedidos, e gere a análise completa conforme a estrutura solicitada.`,
      });
    } else if (manualText) {
      parts.push({
        text: `TEXTO DOS AUTOS DO PROCESSO:\n\n${manualText}\n\nFaça a leitura detalhada deste processo e produza a análise estruturada completa.`,
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: { parts },
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const outputText = response.text || "{}";
    let parsedData;
    try {
      parsedData = JSON.parse(outputText);
    } catch (parseErr) {
      console.error("Erro ao fazer parse do JSON do Gemini:", parseErr, outputText);
      return res.status(500).json({
        error: "Falha ao processar a resposta estruturada do modelo.",
        rawOutput: outputText,
      });
    }

    return res.json({
      success: true,
      analysis: parsedData,
    });
  } catch (error: any) {
    console.error("Erro ao analisar processo:", error);
    return res.status(500).json({
      error: error.message || "Ocorreu um erro interno ao processar o arquivo.",
    });
  }
});

// Endpoint for conversational questions / adjustments on an analyzed process
app.post("/api/chat-process", async (req, res) => {
  try {
    const {
      message,
      processContext,
      history = [],
      contextRules = [],
      userWorkProfile,
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem não pode estar vazia." });
    }

    const ai = getGenAIClient();

    const rulesSummary = Array.isArray(contextRules) && contextRules.length > 0
      ? contextRules
          .filter((r: any) => r.isActive !== false)
          .map((r: any) => `- [${r.category.toUpperCase()}] ${r.title}: ${r.content}`)
          .join("\n")
      : "Diretrizes gerais de legalidade e motivação.";

    const systemInstruction = `Você é o Especialista em Processos Administrativos do SEI atuando lado a lado com o usuário no processo SEI em análise.
PROCESSO SEI EM ANÁLISE:
- Número do Processo: ${processContext?.processNumber || "Não informado"}
- Assunto: ${processContext?.subject || "Não informado"}
- Interessado / Unidade: ${processContext?.parties?.requesterOrPlaintiff || "Interessado"} / ${processContext?.parties?.respondentOrDefendant || "Unidade Responsável"}
- Fase no SEI: ${processContext?.proceduralStage || "Em andamento"}
- Proposta prévia: ${processContext?.decision?.suggestedOutcome || "Análise preliminar"} - ${processContext?.decision?.outcomeTitle || ""}

REGRAS, LEIS E PARECERES CADASTRADOS PELO USUÁRIO:
${rulesSummary}

INSTRUÇÕES DE RESPOSTA:
- Responda objetivamente com foco em processos administrativos do SEI.
- Se o usuário pedir para redigir minuta de Despacho SEI, Nota Técnica, Ofício ou Certidão, forneça o texto completo no padrão oficial, pronto para copiar e colar no editor do SEI.
- Fundamente as respostas estritamente nas Leis e Pareceres fornecidos pelo usuário e nos fatos constantes dos autos.`;

    const chat = ai.chats.create({
      model: "gemini-3.8-flash",
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    // Feed prior history if present
    let formattedPrompt = `Pergunta/Solicitação do Usuário sobre o processo SEI:\n${message}`;
    if (history && history.length > 0) {
      const recentHistory = history.slice(-6).map((h: any) => `${h.sender === 'user' ? 'Usuário' : 'Assistente'}: ${h.text}`).join('\n');
      formattedPrompt = `Histórico recente da conversa:\n${recentHistory}\n\nNova solicitação do Usuário:\n${message}`;
    }

    const response = await chat.sendMessage({
      message: formattedPrompt,
    });

    return res.json({
      success: true,
      reply: response.text,
    });
  } catch (error: any) {
    console.error("Erro no chat do processo:", error);
    return res.status(500).json({
      error: error.message || "Erro ao responder a pergunta sobre o processo.",
    });
  }
});

// Endpoint to upload a document (PDF or Text) containing Laws, Decrees, or Legal Opinions (Pareceres)
app.post("/api/upload-rules-document", async (req, res) => {
  try {
    const {
      pdfBase64,
      rawText,
      fileName = "documento-regras.pdf",
      category,
      theme,
      subfolderPath,
    } = req.body;

    if (!pdfBase64 && (!rawText || rawText.trim().length < 20)) {
      return res.status(400).json({
        error: "Forneça o arquivo PDF (em base64) ou o texto completo da Lei, Decreto, Portaria ou Parecer Jurídico.",
      });
    }

    const ai = getGenAIClient();

    const selectedCategory = category || "parecer";
    const selectedTheme = theme || "Geral";

    const promptText = `Você é um Analista Especializado em Extração de Normas, Leis, Decretos e Pareceres Jurídicos da GEMAP para Instrução Processual no SEI.
O usuário está enviando o documento: "${fileName}".
Categoria indicada: "${selectedCategory}" (ex: parecer, lei, decreto, orientacao_informal, norma, regra).
Tema indicado: "${selectedTheme}".
${subfolderPath ? `Caminho da pasta de origem: "${subfolderPath}"` : ""}

SUA MISSÃO:
Leia integralmente este documento e extraia todas as regras, artigos, requisitos obrigatórios, orientações vinculantes, critérios de deferimento/indeferimento e entendimentos que devem nortear análises de processos no SEI.

Para cada regra ou dispositivo identificado, retorne um objeto com:
- title: Título conciso, descritivo e direto da diretriz (ex: "Exigência de Parecer Jurídico Prévio", "Critérios para Adicional de Qualificação", "Prazo Preclusivo para Repactuação")
- category: "${selectedCategory}" (ou "lei", "decreto", "parecer", "orientacao_informal", "norma", "regra")
- theme: "${selectedTheme}"
- description: Resumo prático em 1 frase de quando e por que esta regra deve ser observada.
- citationOrArticle: Dispositivo legal exato ou número do parecer (ex: "Art. 107 da Lei nº 14.133/2021", "Parecer Referencial nº 05/2023 - CONJUR", "Art. 50 da Lei nº 9.784/1999").
- content: O comando normativo ou diretriz completa com critérios claros: o que deve ser verificado nos autos do SEI, quais documentos são exigidos, quando deferir, quando indeferir ou quando baixar em diligência.
- tags: Array de palavras-chave temáticas (ex: ["contratos", "reajuste", "parecer-agu", "instrucao-processual"]).

Extraia de forma autônoma e estruturada.`;

    const parts: any[] = [];
    if (pdfBase64) {
      const cleanedBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: cleanedBase64,
        },
      });
      parts.push({ text: promptText });
    } else {
      parts.push({
        text: `${promptText}\n\nCONTEÚDO INTEGRAL DO DOCUMENTO:\n"""\n${rawText}\n"""`,
      });
    }

    const responseSchema = {
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
        required: ["title", "category", "description", "content"],
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: { parts },
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const parsed = JSON.parse(response.text || "[]");

    const rules = Array.isArray(parsed)
      ? parsed.map((item: any, idx: number) => ({
          id: `rule-up-${Date.now()}-${idx}`,
          title: item.title || `Diretriz de ${fileName}`,
          category: item.category || selectedCategory,
          theme: item.theme || selectedTheme,
          description: item.description || "",
          citationOrArticle: item.citationOrArticle || undefined,
          content: item.content || "",
          tags: Array.isArray(item.tags) ? item.tags : [fileName.replace(/\.[^/.]+$/, "")],
          isActive: true,
          createdAt: new Date().toISOString().split("T")[0],
          documentSource: fileName,
          subfolderPath: subfolderPath || undefined,
        }))
      : [];

    return res.json({
      success: true,
      fileName,
      extractedCount: rules.length,
      extractedRules: rules,
    });
  } catch (error: any) {
    console.error("Erro ao fazer upload e extração de regras:", error);
    return res.status(500).json({
      error: error.message || "Erro ao processar o documento de regras/leis/pareceres.",
    });
  }
});

// Endpoint to analyze topic / search within opinions, laws, decrees and informal guidelines
app.post("/api/analyze-topic", async (req, res) => {
  try {
    const { topicQuery, legalRepository = [], precedents = [] } = req.body;

    if (!topicQuery || topicQuery.trim().length < 2) {
      return res.status(400).json({ error: "Informe o tema ou pergunta para pesquisa." });
    }

    const ai = getGenAIClient();

    // Prepare full repository text
    const repositoryText = Array.isArray(legalRepository) && legalRepository.length > 0
      ? legalRepository
          .map(
            (r: any, idx: number) =>
              `[DOC ${idx + 1}] ID: ${r.id} | Tipo: ${(r.category || "norma").toUpperCase()} | Tema: "${r.theme || "Geral"}" | Título: "${r.title}" | Citação: "${r.citationOrArticle || "S/C"}" | Pasta: "${r.subfolderPath || "Raiz"}"\nConteúdo: ${r.content}\n`
          )
          .join("\n")
      : "Nenhum documento cadastrado no acervo legal.";

    // Prepare precedents
    const precedentsText = Array.isArray(precedents) && precedents.length > 0
      ? precedents
          .map(
            (p: any, idx: number) =>
              `[PRECEDENTE GEMAP ${idx + 1}] Processo SEI nº ${p.processNumber} | Assunto: ${p.subject} | Tema: ${p.theme}\n- Decisão: ${p.finalDecision}\n- Tese: ${p.precedentSummary}\n`
          )
          .join("\n")
      : "Nenhum precedente cadastrado ainda.";

    const prompt = `Você é o Consultor Jurídico Especializado da GEMAP.
O usuário deseja uma análise temática profunda sobre: "${topicQuery}".

SUA TAREFA:
Varra minuciosamente todo o Acervo de Normas (leis, decretos, pareceres jurídicos e orientações informais) e o Banco de Processos Reais da GEMAP fornecidos abaixo para responder o que dizem os dispositivos e a prática da unidade sobre o tema "${topicQuery}".

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

    const responseSchema = {
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
            required: ["title", "category", "theme", "contentExcerpt"],
          },
        },
      },
      required: [
        "theme",
        "query",
        "executiveSummary",
        "whatLawsAndDecreesSay",
        "whatPareceresSay",
        "informalGuidelines",
        "gemapPrecedentsFound",
        "gemapRecommendedProcedure",
        "matchedDocuments",
      ],
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      result: parsed,
    });
  } catch (error: any) {
    console.error("Erro ao analisar assunto/tema:", error);
    return res.status(500).json({
      error: error.message || "Erro ao realizar busca e análise temática.",
    });
  }
});

// Endpoint to extract real process to add to Banco de Processos Reais (Jurisprudência GEMAP)
app.post("/api/extract-real-process", async (req, res) => {
  try {
    const { pdfBase64, rawText, fileName = "processo_real.pdf" } = req.body;

    if (!pdfBase64 && (!rawText || rawText.trim().length < 20)) {
      return res.status(400).json({
        error: "Forneça o arquivo PDF (em base64) ou o texto dos autos do processo real.",
      });
    }

    const ai = getGenAIClient();

    const promptText = `Você é um Analista Especialista em Catalogação de Precedentes e Jurisprudência Administrativa da GEMAP no SEI.
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

    const parts: any[] = [];
    if (pdfBase64) {
      const cleanedBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: cleanedBase64,
        },
      });
      parts.push({ text: promptText });
    } else {
      parts.push({
        text: `${promptText}\n\nCONTEÚDO DO PROCESSO REAL:\n"""\n${rawText}\n"""`,
      });
    }

    const responseSchema = {
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
        "processNumber",
        "subject",
        "theme",
        "factualSummary",
        "finalDecision",
        "deliberationsOrDespacho",
        "precedentSummary",
      ],
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: { parts },
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    const precedentItem = {
      id: `prec-${Date.now()}`,
      processNumber: parsed.processNumber || "SEI Sem Número",
      subject: parsed.subject || "Assunto não especificado",
      theme: parsed.theme || "Geral",
      factualSummary: parsed.factualSummary || "",
      finalDecision: parsed.finalDecision || "",
      outcomeType: parsed.outcomeType || "DEFERIMENTO_TOTAL",
      deliberationsOrDespacho: parsed.deliberationsOrDespacho || "",
      unit: parsed.unit || "GEMAP",
      date: parsed.date || new Date().toISOString().split("T")[0],
      tags: Array.isArray(parsed.tags) ? parsed.tags : ["jurisprudencia-gemap"],
      precedentSummary: parsed.precedentSummary || "",
      sourceFileName: fileName,
    };

    return res.json({
      success: true,
      precedent: precedentItem,
    });
  } catch (error: any) {
    console.error("Erro ao catalogar processo real:", error);
    return res.status(500).json({
      error: error.message || "Erro ao processar e catalogar processo real.",
    });
  }
});

// Endpoint to extract knowledge/rules from laws, opinions or text pasted by user
app.post("/api/extract-rules", async (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || rawText.trim().length < 10) {
      return res.status(400).json({ error: "Texto insuficiente para extração de regras." });
    }

    const ai = getGenAIClient();

    const prompt = `Analise o seguinte texto de Lei, Decreto, Portaria ou Parecer Jurídico fornecido pelo usuário e extraia 1 ou mais regras, diretrizes ou critérios para orientar análises de processos no SEI (Sistema Eletrônico de Informações):

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

    const responseSchema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          description: { type: Type.STRING },
          citationOrArticle: { type: Type.STRING },
          content: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["title", "category", "description", "content"],
      },
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema,
      },
    });

    const parsed = JSON.parse(response.text || "[]");
    return res.json({
      success: true,
      extractedRules: parsed,
    });
  } catch (error: any) {
    console.error("Erro ao extrair regras:", error);
    return res.status(500).json({
      error: error.message || "Erro ao processar extração de regras.",
    });
  }
});

// Vite middleware or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`JurisProcess Server running on http://localhost:${PORT}`);
  });
}

startServer();
