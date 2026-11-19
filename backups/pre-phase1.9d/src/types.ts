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
}

export interface QuizQuestionFeedback {
  correct: boolean;
  feedback: string;
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
  explanation?: string;
}

export interface LogVerifyApiResponse {
  isTarget: boolean;
  message: string;
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
}

export interface DiagramExploreItem {
  id: string;
  label: string;
  role: string;
  summary: string;
  details: string[];
  securityRelevance: string;
  sampleMetric?: string;
}

export interface TerminalCommandSimulation {
  command: string;
  aliases?: string[];
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
  // Kind 4: Security Scenario / Config Audit Lab
  artifactTitle?: string;
  artifactLanguage?: string;
  artifactContent?: string;
  artifactHighlightLines?: number[];
  // Apply stage: Practical verification challenge included on every lab
  challenge: PracticalChallengeQuestion;
}

export interface PublicCurriculumPayload {
  curriculum: Tier[];
  labs: PracticalLab[];
}
