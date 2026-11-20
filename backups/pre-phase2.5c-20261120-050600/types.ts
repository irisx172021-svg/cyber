export interface User {
  id: string;
  username: string;
  email: string;
  streak: number;
  lastActiveDate: string | null; // ISO string YYYY-MM-DD
  xp: number;
  rank: string;
  level: number;
  completion: number;
  verifiedTopics: string[];
  following: string[];
  followers?: string[];
  lastStreakUpdate?: string | null;
  lastActiveTimestamp?: string | null;
}

export interface PublicDirectoryUser {
  username: string;
  streak: number;
  xp: number;
  rank: string;
  level: number;
  completion: number;
  verifiedTopics: string[];
  followers?: string[];
}

export interface EngageSubmissionPayload {
  exerciseId?: string;
  selectedOption?: number;
  answers?: Record<string, number>;
  terminalOutput?: string;
}

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface CompletionRequirements {
  requireQuiz: boolean;
  requirePracticalLab?: boolean;
  requireHomework?: boolean;
  minQuizScorePercent?: number;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctOption?: number; // stripped from client bundles; present server-side only
  explanation?: string; // revealed server-side upon grading
  optionFeedback?: string[]; // server-only misconception/rationale feedback per option index
  partialCreditIndices?: number[]; // server-only option indices with partially sound reasoning
  reviewSection?: string; // safe section heading label inside the lesson to revisit
}

export interface QuizQuestionFeedback {
  correct: boolean;
  feedback: string;
  distractorSummary?: string;
}

export interface EngageApiResponse {
  user: User;
  progress: UserProgress;
  xpAwarded: number;
  newlyCompletedLesson: boolean;
  scorePercent?: number;
  requiredPercent?: number;
  correctCount?: number;
  totalQuestions?: number;
  passed?: boolean;
  questionFeedback?: Record<string, QuizQuestionFeedback>;
  misconceptionHints?: string[];
  recommendedSections?: string[];
  explanation?: string;
  misconceptionFeedback?: string;
  selectedReasoningStatus?: 'partially_correct' | 'incorrect';
  hint?: string;
  reviewSection?: string;
}

export interface LogVerifyApiResponse {
  isTarget: boolean;
  message: string;
  analysisNote?: string;
  correlationSummary?: string;
  explorationComplete?: boolean;
  verifiedLogEntryId?: string;
}

export interface LabExplorationProgress {
  exploredDiagramIds?: string[];
  executedTerminalCommands?: string[];
  logTargetVerified?: boolean;
  verifiedLogEntryId?: string | null;
  scenarioVerified?: boolean;
  verifiedHighlightLines?: number[];
  explorationComplete?: boolean;
}

export type LabExplorationMap = Record<string, LabExplorationProgress>;

export type ExploreLabAction =
  | 'explore_diagram_item'
  | 'execute_terminal_command'
  | 'verify_scenario_lines';

export interface ExploreLabApiResponse {
  labId: string;
  exploration: LabExplorationProgress;
  explorationComplete: boolean;
  commandResult?: {
    matched: boolean;
    command?: string;
    description?: string;
    flagsSummary?: string;
    output?: string;
    interpretation?: string;
    hint?: string;
    message?: string;
  };
  scenarioResult?: {
    verified: boolean;
    verifiedHighlightLines?: number[];
    lineRationales?: Record<number, string>;
    message: string;
  };
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  content: string; // Markdown formatted curriculum
  quiz: Question[];
  requiresTerminal?: boolean;
  homeworkCommand?: string;
  homeworkInstruction?: string;
  homeworkHint?: string;
  homeworkValidateRegex?: string;
  // Guided learning metadata (backward compatible)
  order?: number;
  tierId?: string;
  topicId?: string;
  difficulty?: DifficultyLevel;
  estimatedMinutes?: number;
  learningObjectives?: string[];
  prerequisites?: string[];
  recommendedPrerequisites?: string[];
  required?: boolean;
  completionRequirements?: CompletionRequirements;
}

export interface Topic {
  id: string;
  title: string;
  category: 'foundations' | 'defense' | 'offense' | 'grc';
  lessons: Lesson[];
  order?: number;
  tierId?: string;
}

export interface Tier {
  id: string;
  number: number;
  title: string;
  description: string;
  topics: Topic[];
  order?: number;
  defaultRequired?: boolean;
}

export interface LabNote {
  id: string;
  moduleId: string; // Refers to a Topic ID or Lesson ID
  moduleTitle: string;
  title: string; // Custom title for scratchpad note
  content: string; // Markdown notes
  lastSaved: string; // Timestamp
}

export interface CommunityPost {
  id: string;
  title: string;
  author: string;
  authorRole: 'Cadet' | 'Operator' | 'Infiltrator' | 'Instructor';
  content: string;
  category: 'General' | 'Help' | 'Defensive' | 'Offensive' | 'Certifications';
  upvotes: number;
  userVote: 'up' | 'down' | null;
  createdAt: string;
  commentsCount: number;
}

export interface PersistedCommunityPost extends CommunityPost {
  votesByUserId?: Record<string, 'up' | 'down'>;
}

export interface UserProgress {
  completedLessonIds: string[];
  completedExerciseIds?: string[];
  completedQuizLessonIds?: string[];
  completedHomeworkLessonIds?: string[];
  xp: number;
  streak: number;
  lastActiveDate: string | null;
  lastStreakUpdate?: string | null;
  lastActiveTimestamp?: string | null;
  // Schema & migration safety fields (v2+)
  schemaVersion?: number;
  legacyCompletedLessonIds?: string[];
  awardedXpEventIds?: string[];
  postXpDailyLog?: Record<string, number>;
  lastSyncedAt?: string | null;
  updatedAt?: string | null;
}

export interface TimelineEvent {
  id: string;
  username: string;
  action: string; // e.g. "completed OSI Layer Reference"
  xpReward: number;
  timestamp: string;
}

export type GroupVisibility = 'public' | 'private';

export interface GroupMessage {
  id: string;
  senderId?: string; // server-only internal reference; stripped from all client API responses
  senderUsername: string;
  senderRole: string;
  content: string;
  createdAt: string;
}

export interface GroupInvitation {
  id: string;
  username: string;
  invitedBy: string;
  createdAt: string;
  expiresAt: string;
}

export interface GroupJoinRequest {
  id: string;
  username: string;
  requestedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  visibility: GroupVisibility;
  ownerId?: string; // server-only internal reference; stripped from all client API responses
  ownerHandle: string;
  members: string[];
  memberCount?: number;
  messages: GroupMessage[];
  isMember?: boolean;
  isOwner?: boolean;
  hasPendingInvite?: boolean;
  hasPendingRequest?: boolean;
  invitations?: GroupInvitation[];
  joinRequests?: GroupJoinRequest[];
  createdAt: string;
}

export type TutorAction =
  | 'explain_simply'
  | 'step_by_step'
  | 'real_world_example'
  | 'analogy'
  | 'explain_code'
  | 'compare_concepts'
  | 'hint'
  | 'test_understanding'
  | 'summarize'
  | 'ask_question'
  | 'continue';

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  action?: TutorAction;
  timestamp: string;
  model?: string;
  error?: boolean;
  truncated?: boolean;
  finishReason?: string;
}

export interface TutorRequest {
  lessonId: string;
  exerciseId?: string;
  action: TutorAction;
  message?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface TutorResponse {
  reply: string;
  action: TutorAction;
  lessonId: string;
  lessonTitle: string;
  model: string;
  truncated?: boolean;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

// ==========================================
// REUSABLE PRACTICAL LAB SYSTEM TYPES
// ==========================================

export type PracticalLabKind = 'diagram' | 'terminal' | 'log_investigation' | 'scenario';

export interface PracticalChallengeQuestion {
  prompt: string;
  options: string[];
  correctIndex?: number; // stripped from client bundles; present server-side only
  hint: string;
  explanation?: string; // revealed server-side upon verification
  optionFeedback?: string[]; // server-only misconception rationale for each choice
  partialCreditIndices?: number[]; // server-only options representing partially sound reasoning
  reviewSection?: string; // safe lesson section heading to link learners back for review
}

export interface DiagramConnection {
  targetId: string;
  relationship: string;
  whyItMatters: string;
}

export interface DiagramExploreItem {
  id: string;
  label: string;
  role: string;
  summary: string;
  details: string[];
  securityRelevance: string;
  sampleMetric?: string;
  connections?: DiagramConnection[];
}

export interface TerminalCommandSimulation {
  command: string;
  aliases?: string[];
  commandFamily?: string;
  matchTokens?: string[];
  description: string;
  flagsSummary: string;
  output: string;
  interpretation: string;
}

export interface LogEntryItem {
  id: string;
  timestamp: string;
  source: string;
  severity: 'INFO' | 'WARN' | 'ALERT';
  message: string;
  details: string;
  isSuspicious?: boolean;
  analysisNote?: string; // server-only until that entry is inspected
}

export interface PracticalLab {
  id: string;
  lessonId: string;
  kind: PracticalLabKind;
  title: string;
  objective: string;
  shortExplanation: string;
  expectedOutcome: string;
  xpReward: number;
  // Kind 1: Interactive Diagram / Flow Explorer
  diagramMode?: 'components' | 'sequence';
  diagramItems?: DiagramExploreItem[];
  // Kind 2: Simulated Terminal Lab
  terminalPromptPrefix?: string;
  terminalCommands?: TerminalCommandSimulation[];
  requiredCommands?: string[];
  // Kind 3: Log & Alert Investigation Lab
  logContextTitle?: string;
  logEntries?: LogEntryItem[];
  suspiciousEntryId?: string;
  correlationSummary?: string; // server-only until target entry is confirmed
  // Kind 4: Security Scenario / Config Audit Lab
  artifactTitle?: string;
  artifactLanguage?: string;
  artifactContent?: string;
  artifactHighlightLines?: number[]; // server-only until learner completes scenario line check
  artifactLineRationales?: Record<number, string>; // server-only until scenario line check succeeds
  highlightTargetCount?: number; // client-safe count of lines learner must spot
  decisionTradeoffs?: string[]; // safe operational/design tradeoffs shown in scenario context
  // Apply stage: Practical verification challenge included on every lab
  challenge: PracticalChallengeQuestion;
}

export interface PublicCurriculumPayload {
  curriculum: Tier[];
  labs: PracticalLab[];
}

// ==========================================
// GUIDED CAPSTONES (PHASE 2.4)
// ==========================================

export type CapstoneEvidenceKind = 'log' | 'config' | 'memory' | 'http_trace' | 'cloudtrail';

export interface CapstoneEvidenceArtifact {
  id: string;
  title: string;
  kind: CapstoneEvidenceKind;
  summary: string;
  content: string;
  targetLineNumbers?: number[]; // server-only until stage evidence verified
  targetLineCount?: number; // client-safe count of lines to flag
  evidenceHints?: string[];
}

export interface CapstoneKnowledgeCheck {
  id: string;
  prompt: string;
  options: string[];
  correctIndex?: number; // server-only
  optionFeedback?: string[]; // server-only
  partialCreditIndices?: number[]; // server-only
  explanation?: string; // server-only until stage check passed
  reviewLessonId?: string;
}

export interface CapstoneStage {
  id: string;
  order: number;
  title: string;
  objective: string;
  guidance: string;
  practicalTaskPrompt: string;
  evidenceArtifactIds: string[];
  knowledgeCheck: CapstoneKnowledgeCheck;
  xpReward: number;
}

export interface CapstoneRubricCriterion {
  id: string;
  label: string;
  maxPoints: number;
  description: string;
  expectedKeywords?: string[]; // server-only
}

export interface CapstoneDeliverableTemplate {
  title: string;
  instructions: string;
  minimumCharacters: number;
  sections: Array<{
    key: string;
    label: string;
    prompt: string;
    placeholder: string;
  }>;
}

export interface CapstoneProject {
  id: string;
  code: 'A' | 'B' | 'C' | 'D';
  title: string;
  roleTitle: string;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  xpReward: number;
  scenarioOverview: string;
  objectives: string[];
  prerequisiteLessonIds: string[];
  recommendedLessonIds: string[];
  backgroundBriefing: string;
  evidenceArtifacts: CapstoneEvidenceArtifact[];
  stages: CapstoneStage[];
  submissionRequirements: string[];
  deliverableTemplate: CapstoneDeliverableTemplate;
  rubricCriteria: CapstoneRubricCriterion[];
  detailedSolutionExplanation?: string; // server-only until capstone is submitted & passed
  reflectionPrompts: string[];
  recommendedNextLessonIds: string[];
}

export interface CapstoneStageAccountProgress {
  evidenceVerified: boolean;
  verifiedEvidenceIds: string[];
  knowledgeCheckPassed: boolean;
  completedAt?: string;
}

export interface CapstoneAccountProgress {
  capstoneId: string;
  currentStageId: string;
  stages: Record<string, CapstoneStageAccountProgress>;
  reportSubmitted: boolean;
  reportScore?: number;
  maxReportScore?: number;
  rubricBreakdown?: Array<{
    criterionId: string;
    label: string;
    pointsEarned: number;
    maxPoints: number;
    feedback: string;
  }>;
  lastSubmissionSections?: Record<string, string>;
  detailedSolutionExplanation?: string;
  completedAt?: string;
}

export type CapstoneProgressMap = Record<string, CapstoneAccountProgress>;

export interface PublicCapstonesPayload {
  capstones: CapstoneProject[];
}

export interface CapstoneEvidenceVerifyResponse {
  capstoneId: string;
  stageId: string;
  artifactId: string;
  verified: boolean;
  message: string;
  xpAwarded: number;
  stageProgress: CapstoneStageAccountProgress;
  capstoneProgress: CapstoneAccountProgress;
  user?: User;
  progress?: UserProgress;
}

export interface CapstoneStageCheckResponse {
  capstoneId: string;
  stageId: string;
  correct: boolean;
  xpAwarded: number;
  explanation?: string;
  misconceptionFeedback?: string;
  selectedReasoningStatus?: 'partially_correct' | 'incorrect';
  stageProgress: CapstoneStageAccountProgress;
  capstoneProgress: CapstoneAccountProgress;
  user?: User;
  progress?: UserProgress;
}

export interface CapstoneSubmitResponse {
  capstoneId: string;
  passed: boolean;
  score: number;
  maxScore: number;
  xpAwarded: number;
  rubricBreakdown: Array<{
    criterionId: string;
    label: string;
    pointsEarned: number;
    maxPoints: number;
    feedback: string;
  }>;
  detailedSolutionExplanation?: string;
  capstoneProgress: CapstoneAccountProgress;
  user?: User;
  progress?: UserProgress;
}
