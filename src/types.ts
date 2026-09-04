export type RuleCategory = 
  | 'parecer' 
  | 'lei' 
  | 'decreto' 
  | 'orientacao_informal' 
  | 'norma' 
  | 'regra' 
  | 'estilo';

export interface ProcessRule {
  id: string;
  title: string;
  category: RuleCategory;
  theme?: string; // Ex: Contratações, Pessoal, Diárias, Reajuste, etc.
  description: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  tags: string[];
  citationOrArticle?: string;
  documentSource?: string;
  subfolderPath?: string; // Caminho da subpasta originária do ZIP
}

export interface PrecedentProcessItem {
  id: string;
  processNumber: string;
  subject: string;
  theme: string;
  factualSummary: string;
  finalDecision: string;
  deliberationsOrDespacho: string;
  unit: string;
  date: string;
  tags: string[];
  precedentSummary: string; // Tese ou orientação fixada no caso
  sourceFileName?: string;
  outcomeType?: SuggestedOutcomeType;
}

export interface UserLearning {
  id: string;
  date: string;
  summary: string;
  contextProcess?: string;
  appliedCount: number;
}

export interface UserWorkProfile {
  role: string;
  jurisdictionOrOrgan: string;
  decisionTone: 'formal_tradicional' | 'objetivo_direto' | 'pedagogico_didatico';
  customInstructions: string;
  accumulatedLearnings: UserLearning[];
}

export type SuggestedOutcomeType = 
  | 'DEFERIMENTO_TOTAL' 
  | 'DEFERIMENTO_PARCIAL' 
  | 'INDEFERIMENTO' 
  | 'DILIGENCIA_PREVIA' 
  | 'ENCAMINHAMENTO' 
  | 'EXTINCAO' 
  | 'OUTRO';

export interface LegalBasisItem {
  normOrLaw: string;
  applicationToCase: string;
  sourceRuleTitle?: string;
  category?: RuleCategory;
}

export interface AppliedRuleItem {
  title: string;
  category: RuleCategory;
  citation?: string;
  applicationJustification: string;
  ruleTitle?: string;
  explanation?: string;
}

export interface PrecedentMatchItem {
  processNumber: string;
  subject?: string;
  theme?: string;
  precedentSummary: string;
  relevance?: string;
  precedentOutcome?: string;
}

export interface ProcessAnalysisResult {
  id: string;
  createdAt: string;
  fileName: string;
  fileSize?: string;
  processNumber: string;
  subject: string;
  theme?: string; // Tema central identificado
  parties: {
    requesterOrPlaintiff: string;
    respondentOrDefendant: string;
    others?: string[];
  };
  factualSummary: string;
  proceduralStage: string;
  urgentMatters: string[];
  considerations: {
    factualPoints: string[];
    legalBasis: LegalBasisItem[];
    proceduralAspects: string[];
    risksAndCaveats: string[];
  };
  decision: {
    suggestedOutcome: SuggestedOutcomeType;
    outcomeTitle: string;
    legalReasoning: string;
    draftDocument: string;
    substantiveReasoning?: string;
    criticalAlerts?: string[];
    proceduralOrders?: {
      orderType: string;
      description: string;
      targetDeadline?: string;
      assignee?: string;
    }[];
  };
  deliberations: {
    immediateActions: string[];
    subsequentSteps: string[];
    notificationsRequired: string[];
  };
  rulesApplied: AppliedRuleItem[];
  precedentsMatched?: PrecedentMatchItem[];
  learnedInsights: string[];
  userFeedbackDecision?: 'accepted' | 'adjusted' | 'rejected';
  userNotes?: string;
  isSavedToPrecedents?: boolean;
}

export interface TopicSearchResult {
  theme: string;
  query: string;
  executiveSummary: string;
  whatLawsAndDecreesSay: string[];
  whatPareceresSay: string[];
  informalGuidelines: string[];
  gemapPrecedentsFound: string[];
  gemapRecommendedProcedure: string;
  matchedDocuments: {
    id: string;
    title: string;
    category: RuleCategory;
    theme: string;
    citation?: string;
    contentExcerpt: string;
    subfolderPath?: string;
  }[];
}

export type TopicAnalysisResult = TopicSearchResult;

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface ZipExtractedItem {
  fileName: string;
  filePath: string;
  folderCategory?: string;
  fileType: 'pdf' | 'text' | 'other';
  detectedTheme: string;
  suggestedCategory: RuleCategory;
  rawText?: string;
  base64?: string;
  status: 'pending' | 'processing' | 'imported' | 'error';
  extractedCount?: number;
}
