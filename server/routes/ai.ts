import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';
import { generateChat, generateStructured } from '../lib/gemini.js';
import { getActiveRules, getAllPrecedents, getAllRules, getProfile } from '../lib/repos.js';
import {
  analyzeProcessResponseSchema,
  buildAnalyzeProcessSystemInstruction,
} from '../prompts/analyzeProcess.js';
import {
  analyzeTopicResponseSchema,
  buildAnalyzeTopicPrompt,
} from '../prompts/analyzeTopic.js';
import { buildChatMessage, buildChatSystemInstruction } from '../prompts/chatProcess.js';
import {
  buildExtractRealProcessPrompt,
  extractRealProcessResponseSchema,
} from '../prompts/extractRealProcess.js';
import {
  buildExtractRulesPrompt,
  buildUploadRulesPrompt,
  uploadRulesResponseSchema,
} from '../prompts/uploadRules.js';

export const aiRouter = Router();
aiRouter.use(requireAuth);

const cleanPdf = (b64: string) => b64.replace(/^data:application\/pdf;base64,/, '');

/* ---------------------------- /analyze-process ----------------------------- */

const analyzeInput = z.object({
  pdfBase64: z.string().optional(),
  fileName: z.string().optional(),
  manualText: z.string().optional(),
  customPromptNotes: z.string().optional(),
});

aiRouter.post('/analyze-process', async (req, res) => {
  const parsed = analyzeInput.safeParse(req.body);
  if (!parsed.success || (!parsed.data.pdfBase64 && !parsed.data.manualText)) {
    return res.status(400).json({ error: 'Forneça o PDF dos autos (base64) ou o texto do processo.' });
  }
  const { pdfBase64, fileName, manualText, customPromptNotes } = parsed.data;
  const email = req.user!.email;

  try {
    const [rules, precedents, profile] = await Promise.all([
      getActiveRules(),
      getAllPrecedents(),
      getProfile(email),
    ]);

    const systemInstruction = buildAnalyzeProcessSystemInstruction({
      rules,
      precedents,
      profile,
      customPromptNotes,
    });

    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
    if (pdfBase64) {
      parts.push({ inlineData: { mimeType: 'application/pdf', data: cleanPdf(pdfBase64) } });
      parts.push({
        text: `Arquivo processual analisado: "${fileName || 'processo.pdf'}".\nLeia todas as páginas deste documento processual, analise as peças, manifestações, datas, certidões e pedidos, e gere a análise completa conforme a estrutura solicitada.`,
      });
    } else {
      parts.push({
        text: `TEXTO DOS AUTOS DO PROCESSO:\n\n${manualText}\n\nFaça a leitura detalhada deste processo e produza a análise estruturada completa.`,
      });
    }

    const analysis = await generateStructured<Record<string, unknown>>({
      action: 'analyze-process',
      userEmail: email,
      systemInstruction,
      parts,
      responseSchema: analyzeProcessResponseSchema,
      temperature: 0.2,
    });

    res.json({ success: true, analysis });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || 'Erro ao analisar o processo.' });
  }
});

/* ------------------------------ /chat-process ----------------------------- */

const chatInput = z.object({
  message: z.string().min(1),
  processContext: z.record(z.any()).optional(),
  history: z.array(z.object({ sender: z.string(), text: z.string() })).default([]),
});

aiRouter.post('/chat-process', async (req, res) => {
  const parsed = chatInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Mensagem não pode estar vazia.' });
  const email = req.user!.email;

  try {
    const rules = await getActiveRules();
    const systemInstruction = buildChatSystemInstruction({
      processContext: parsed.data.processContext,
      rules,
    });
    const reply = await generateChat({
      action: 'chat-process',
      userEmail: email,
      processNumber: parsed.data.processContext?.processNumber as string | undefined,
      systemInstruction,
      message: buildChatMessage(parsed.data.message, parsed.data.history),
    });
    res.json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || 'Erro ao responder.' });
  }
});

/* -------------------------- /upload-rules-document ------------------------ */

const uploadRulesInput = z.object({
  pdfBase64: z.string().optional(),
  rawText: z.string().optional(),
  fileName: z.string().default('documento-regras.pdf'),
  category: z.string().default('parecer'),
  theme: z.string().default('Geral'),
  subfolderPath: z.string().optional(),
});

aiRouter.post('/upload-rules-document', async (req, res) => {
  const parsed = uploadRulesInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { pdfBase64, rawText, fileName, category, theme, subfolderPath } = parsed.data;
  if (!pdfBase64 && (!rawText || rawText.trim().length < 20)) {
    return res.status(400).json({ error: 'Forneça o PDF (base64) ou o texto completo do documento.' });
  }
  const email = req.user!.email;

  try {
    const promptText = buildUploadRulesPrompt({ fileName, category, theme, subfolderPath, rawText: pdfBase64 ? undefined : rawText });
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
    if (pdfBase64) {
      parts.push({ inlineData: { mimeType: 'application/pdf', data: cleanPdf(pdfBase64) } });
      parts.push({ text: promptText });
    } else {
      parts.push({ text: promptText });
    }

    const parsedRules = await generateStructured<any[]>({
      action: 'upload-rules',
      userEmail: email,
      parts,
      responseSchema: uploadRulesResponseSchema,
      temperature: 0.1,
    });

    const rules = (Array.isArray(parsedRules) ? parsedRules : []).map((item, idx) => ({
      id: `rule-up-${Date.now()}-${idx}`,
      title: item.title || `Diretriz de ${fileName}`,
      category: item.category || category,
      theme: item.theme || theme,
      description: item.description || '',
      citationOrArticle: item.citationOrArticle || undefined,
      content: item.content || '',
      tags: Array.isArray(item.tags) ? item.tags : [fileName.replace(/\.[^/.]+$/, '')],
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0],
      documentSource: fileName,
      subfolderPath: subfolderPath || undefined,
    }));

    res.json({ success: true, fileName, extractedCount: rules.length, extractedRules: rules });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || 'Erro ao processar o documento.' });
  }
});

/* ----------------------------- /extract-rules ---------------------------- */

aiRouter.post('/extract-rules', async (req, res) => {
  const parsed = z.object({ rawText: z.string().min(10) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Texto insuficiente para extração.' });
  try {
    const extractedRules = await generateStructured<any[]>({
      action: 'extract-rules',
      userEmail: req.user!.email,
      parts: buildExtractRulesPrompt(parsed.data.rawText),
      responseSchema: uploadRulesResponseSchema,
      temperature: 0.1,
    });
    res.json({ success: true, extractedRules });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || 'Erro ao extrair regras.' });
  }
});

/* -------------------------- /extract-real-process ----------------------- */

const extractRealInput = z.object({
  pdfBase64: z.string().optional(),
  rawText: z.string().optional(),
  fileName: z.string().default('processo_real.pdf'),
});

aiRouter.post('/extract-real-process', async (req, res) => {
  const parsed = extractRealInput.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Dados inválidos.' });
  const { pdfBase64, rawText, fileName } = parsed.data;
  if (!pdfBase64 && (!rawText || rawText.trim().length < 20)) {
    return res.status(400).json({ error: 'Forneça o PDF ou o texto dos autos.' });
  }
  const email = req.user!.email;

  try {
    const promptText = buildExtractRealProcessPrompt(fileName, pdfBase64 ? undefined : rawText);
    const parts: ({ text: string } | { inlineData: { mimeType: string; data: string } })[] = [];
    if (pdfBase64) {
      parts.push({ inlineData: { mimeType: 'application/pdf', data: cleanPdf(pdfBase64) } });
      parts.push({ text: promptText });
    } else {
      parts.push({ text: promptText });
    }

    const parsedData = await generateStructured<any>({
      action: 'extract-real-process',
      userEmail: email,
      parts,
      responseSchema: extractRealProcessResponseSchema,
      temperature: 0.1,
    });

    const precedent = {
      id: `prec-${Date.now()}`,
      processNumber: parsedData.processNumber || 'SEI Sem Número',
      subject: parsedData.subject || 'Assunto não especificado',
      theme: parsedData.theme || 'Geral',
      factualSummary: parsedData.factualSummary || '',
      finalDecision: parsedData.finalDecision || '',
      outcomeType: parsedData.outcomeType || 'DEFERIMENTO_TOTAL',
      deliberationsOrDespacho: parsedData.deliberationsOrDespacho || '',
      unit: parsedData.unit || 'GEMAP',
      date: parsedData.date || new Date().toISOString().split('T')[0],
      tags: Array.isArray(parsedData.tags) ? parsedData.tags : ['jurisprudencia-gemap'],
      precedentSummary: parsedData.precedentSummary || '',
      sourceFileName: fileName,
    };

    res.json({ success: true, precedent });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || 'Erro ao catalogar processo real.' });
  }
});

/* ----------------------------- /analyze-topic --------------------------- */

aiRouter.post('/analyze-topic', async (req, res) => {
  const parsed = z.object({ topicQuery: z.string().min(2) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Informe o tema ou pergunta.' });
  const email = req.user!.email;

  try {
    const [rules, precedents] = await Promise.all([getAllRules(), getAllPrecedents()]);
    const result = await generateStructured<Record<string, unknown>>({
      action: 'analyze-topic',
      userEmail: email,
      parts: buildAnalyzeTopicPrompt({ topicQuery: parsed.data.topicQuery, rules, precedents }),
      responseSchema: analyzeTopicResponseSchema,
      temperature: 0.1,
    });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message || 'Erro na busca temática.' });
  }
});

