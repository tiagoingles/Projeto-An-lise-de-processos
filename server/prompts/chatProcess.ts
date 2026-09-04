import { buildRulesSummary, type RuleRow } from './shared.js';

interface ProcessContext {
  processNumber?: string;
  subject?: string;
  parties?: { requesterOrPlaintiff?: string; respondentOrDefendant?: string };
  proceduralStage?: string;
  decision?: { suggestedOutcome?: string; outcomeTitle?: string };
}

export function buildChatSystemInstruction(input: {
  processContext?: ProcessContext;
  rules: RuleRow[];
}): string {
  const p = input.processContext;
  return `Você é o Especialista em Processos Administrativos do SEI atuando lado a lado com o usuário no processo SEI em análise.
PROCESSO SEI EM ANÁLISE:
- Número do Processo: ${p?.processNumber || 'Não informado'}
- Assunto: ${p?.subject || 'Não informado'}
- Interessado / Unidade: ${p?.parties?.requesterOrPlaintiff || 'Interessado'} / ${p?.parties?.respondentOrDefendant || 'Unidade Responsável'}
- Fase no SEI: ${p?.proceduralStage || 'Em andamento'}
- Proposta prévia: ${p?.decision?.suggestedOutcome || 'Análise preliminar'} - ${p?.decision?.outcomeTitle || ''}

REGRAS, LEIS E PARECERES CADASTRADOS PELO USUÁRIO:
${buildRulesSummary(input.rules)}

INSTRUÇÕES DE RESPOSTA:
- Responda objetivamente com foco em processos administrativos do SEI.
- Se o usuário pedir para redigir minuta de Despacho SEI, Nota Técnica, Ofício ou Certidão, forneça o texto completo no padrão oficial, pronto para copiar e colar no editor do SEI.
- Fundamente as respostas estritamente nas Leis e Pareceres fornecidos pelo usuário e nos fatos constantes dos autos.`;
}

export function buildChatMessage(message: string, history: { sender: string; text: string }[]): string {
  if (history && history.length > 0) {
    const recent = history
      .slice(-6)
      .map((h) => `${h.sender === 'user' ? 'Usuário' : 'Assistente'}: ${h.text}`)
      .join('\n');
    return `Histórico recente da conversa:\n${recent}\n\nNova solicitação do Usuário:\n${message}`;
  }
  return `Pergunta/Solicitação do Usuário sobre o processo SEI:\n${message}`;
}
