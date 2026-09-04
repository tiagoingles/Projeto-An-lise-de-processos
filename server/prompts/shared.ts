import type { InferSelectModel } from 'drizzle-orm';
import type { rules, precedents, workProfiles } from '../db/schema.js';

export type RuleRow = InferSelectModel<typeof rules>;
export type PrecedentRow = InferSelectModel<typeof precedents>;
export type WorkProfileRow = InferSelectModel<typeof workProfiles>;

/** Bloco textual do acervo de normas e pareceres para injeção no prompt. */
export function buildRulesText(list: RuleRow[]): string {
  const active = list.filter((r) => r.isActive !== false);
  if (active.length === 0) {
    return 'Nenhuma regra específica cadastrada no acervo. Aplique a Lei Federal nº 9.784/1999 e as normas gerais de processo administrativo.';
  }
  return active
    .map(
      (r, idx) =>
        `${idx + 1}. [${(r.category || 'norma').toUpperCase()}] Tema: "${r.theme || 'Geral'}" | Título: "${r.title}" (${r.citationOrArticle || 'Sem citação'}):\n${r.content}\n`,
    )
    .join('\n');
}

/** Versão compacta do acervo (usada no chat). */
export function buildRulesSummary(list: RuleRow[]): string {
  const active = list.filter((r) => r.isActive !== false);
  if (active.length === 0) return 'Diretrizes gerais de legalidade e motivação.';
  return active.map((r) => `- [${r.category.toUpperCase()}] ${r.title}: ${r.content}`).join('\n');
}

/** Bloco textual do banco de precedentes da GEMAP. */
export function buildPrecedentsText(list: PrecedentRow[]): string {
  if (list.length === 0) {
    return 'Nenhum processo real anterior cadastrado ainda no banco de jurisprudência GEMAP.';
  }
  return list
    .map(
      (p, idx) =>
        `Precedente GEMAP ${idx + 1}: Processo SEI nº ${p.processNumber || 'S/N'} | Assunto/Tema: "${p.subject}" (${p.theme || 'Geral'})\n- Resumo: ${p.factualSummary}\n- Decisão Adotada: ${p.finalDecision}\n- Tese/Balizador: ${p.precedentSummary || 'Sem tese explícita'}\n`,
    )
    .join('\n');
}

/** Bloco textual das diretrizes da unidade / perfil de trabalho do usuário. */
export function buildProfileText(profile: WorkProfileRow | undefined | null): string {
  if (!profile) return 'Perfil de trabalho GEMAP padrão.';
  const learnings =
    profile.accumulatedLearnings && profile.accumulatedLearnings.length > 0
      ? profile.accumulatedLearnings.map((l, i) => `- [Aprendizado ${i + 1}]: ${l.summary}`).join('\n')
      : 'Iniciando histórico de aprendizado.';
  return `Função do Usuário: ${profile.role || 'Analista/Assessor GEMAP'}
Órgão/Unidade: ${profile.jurisdictionOrOrgan || 'GEMAP'}
Tom Decisório Desejado: ${profile.decisionTone || 'objetivo_direto'}
Instruções Gerais: ${profile.customInstructions || 'Nenhuma'}
Aprendizados Acumulados:
${learnings}`;
}
