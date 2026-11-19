import { ACADEMY_CURRICULUM } from '../data/curriculum.ts';
import {
  resolveCanonicalExerciseId,
  resolveCanonicalLessonId,
} from '../data/curriculumMetadata.ts';
import {
  ALL_PRACTICAL_LABS,
  getPracticalLabById,
  getPracticalLabForLesson,
} from '../data/practicalLabs/index.ts';
import {
  getMissingPrerequisites,
  indexCurriculumLessons,
  isLessonUnlocked,
  PrerequisiteInfo,
} from '../lib/curriculumProgress.ts';
import {
  ExploreLabAction,
  ExploreLabApiResponse,
  LabExplorationMap,
  LabExplorationProgress,
  Lesson,
  LogEntryItem,
  PracticalLab,
  PublicCurriculumPayload,
  Question,
  TerminalCommandSimulation,
  Tier,
  UserProgress,
} from '../types';

const FALLBACK_HOMEWORK_BY_LESSON: Record<
  string,
  { command: string; instruction: string; hint: string; regex: string }
> = {
  'comp-hardware': {
    command: 'lscpu',
    instruction:
      "Run `lscpu` or `lsblk` or `free -h` in your local machine's terminal to inspect your system hardware specifications.",
    hint: 'Ensure your pasted output contains CPU architecture fields (e.g., "Architecture:", "x86_64", "Model name:") or storage/memory indicators (e.g., "NAME  MAJ:MIN", "Mem:").',
    regex:
      'architecture:|x86_64|model name:|vendor id:|cpu\\(s\\)|lsblk|name\\s+maj:min|sda\\d*|mem:\\s+\\d+|total\\s+used',
  },
};

export function getServerHomeworkValidationConfig(lesson: Lesson): {
  command: string;
  instruction: string;
  hint: string;
  validate: (text: string) => boolean;
} {
  if (lesson.homeworkCommand) {
    return {
      command: lesson.homeworkCommand,
      instruction:
        lesson.homeworkInstruction ||
        `Run \`${lesson.homeworkCommand}\` in your local terminal or command prompt.`,
      hint:
        lesson.homeworkHint ||
        'Ensure the command runs cleanly and paste its full console output below.',
      validate: (text: string) => {
        if (lesson.homeworkValidateRegex) {
          try {
            const re = new RegExp(lesson.homeworkValidateRegex, 'i');
            return re.test(text);
          } catch {
            // Fall through to command-prefix check
          }
        }
        return text
          .toLowerCase()
          .includes(lesson.homeworkCommand!.toLowerCase().split(' ')[0]);
      },
    };
  }

  const mapped = FALLBACK_HOMEWORK_BY_LESSON[lesson.id];
  if (mapped) {
    return {
      command: mapped.command,
      instruction: mapped.instruction,
      hint: mapped.hint,
      validate: (text: string) => new RegExp(mapped.regex, 'i').test(text),
    };
  }

  const cleanTitle = lesson.title.toLowerCase();
  if (cleanTitle.includes('password') || cleanTitle.includes('cryptography')) {
    return {
      command: 'openssl rand -base64 12',
      instruction: 'Run `openssl rand -base64 12` to generate a random base64 token.',
      hint: 'Output must be a base64 string of at least 12 characters with no spaces.',
      validate: (text: string) => /^[a-zA-Z0-9+/=]{12,24}$/.test(text.trim()),
    };
  }
  if (cleanTitle.includes('process') || cleanTitle.includes('service')) {
    return {
      command: 'tasklist',
      instruction: 'Run `ps aux` or `tasklist` to inspect active processes.',
      hint: 'Output must contain process column headers (PID, USER, COMMAND, or Image Name).',
      validate: (text: string) => /pid|user|command|image name|session name|mem usage/i.test(text),
    };
  }
  if (
    cleanTitle.includes('file') ||
    cleanTitle.includes('find') ||
    cleanTitle.includes('directory')
  ) {
    return {
      command: 'pwd',
      instruction: 'Run `pwd` (or `cd` on Windows) to display your current working directory.',
      hint: 'Output should be an absolute directory path starting with `/` or `C:\\`.',
      validate: (text: string) =>
        /^\/[a-zA-Z0-9_-]+/i.test(text.trim()) || /^[a-zA-Z]:\\/i.test(text.trim()),
    };
  }
  if (cleanTitle.includes('firewall') || cleanTitle.includes('iptables')) {
    return {
      command: 'iptables -L -n',
      instruction:
        'Run `iptables -L -n` or `netsh advfirewall show allprofiles` to inspect host firewall rules.',
      hint: 'Output must list filtering chains or firewall profile states.',
      validate: (text: string) =>
        /chain input|chain forward|chain output|profiles|firewall state/i.test(text),
    };
  }

  return {
    command: 'whoami',
    instruction: 'Run `whoami` in your local terminal to retrieve your current user session.',
    hint: 'Output should print your active username as a short single line.',
    validate: (text: string) => text.trim().length > 1 && !text.includes('\n'),
  };
}

export function validateServerHomeworkOutput(lesson: Lesson, text: string): boolean {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return false;
  }
  return getServerHomeworkValidationConfig(lesson).validate(text);
}

function sanitizeQuestionForClient(question: Question): Question {
  return {
    id: question.id,
    question: question.question,
    options: [...question.options],
  };
}

function sanitizeLessonForClient(lesson: Lesson): Lesson {
  const hwConfig = lesson.requiresTerminal ? getServerHomeworkValidationConfig(lesson) : null;
  const sanitized: Lesson = {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    duration: lesson.duration,
    content: lesson.content,
    quiz: (lesson.quiz || []).map(sanitizeQuestionForClient),
    requiresTerminal: lesson.requiresTerminal,
    ...(hwConfig
      ? {
          homeworkCommand: hwConfig.command,
          homeworkInstruction: hwConfig.instruction,
          homeworkHint: hwConfig.hint,
        }
      : {}),
    order: lesson.order,
    tierId: lesson.tierId,
    topicId: lesson.topicId,
    difficulty: lesson.difficulty,
    estimatedMinutes: lesson.estimatedMinutes,
    learningObjectives: lesson.learningObjectives ? [...lesson.learningObjectives] : undefined,
    prerequisites: lesson.prerequisites ? [...lesson.prerequisites] : undefined,
    recommendedPrerequisites: lesson.recommendedPrerequisites
      ? [...lesson.recommendedPrerequisites]
      : undefined,
    required: lesson.required,
    completionRequirements: lesson.completionRequirements
      ? { ...lesson.completionRequirements }
      : undefined,
  };
  return sanitized;
}

function sanitizeLogEntryForClient(entry: LogEntryItem): LogEntryItem {
  return {
    id: entry.id,
    timestamp: entry.timestamp,
    source: entry.source,
    severity: entry.severity,
    message: entry.message,
    details: entry.details,
  };
}

function sanitizeLabForClient(lab: PracticalLab): PracticalLab {
  return {
    id: lab.id,
    lessonId: lab.lessonId,
    kind: lab.kind,
    title: lab.title,
    objective: lab.objective,
    shortExplanation: lab.shortExplanation,
    expectedOutcome: lab.expectedOutcome,
    xpReward: lab.xpReward,
    diagramMode: lab.diagramMode,
    diagramItems: lab.diagramItems
      ? lab.diagramItems.map((item) => ({
          ...item,
          details: [...item.details],
        }))
      : undefined,
    terminalPromptPrefix: lab.terminalPromptPrefix,
    terminalCommands: lab.terminalCommands
      ? lab.terminalCommands.map((cmd) => ({
          ...cmd,
          aliases: cmd.aliases ? [...cmd.aliases] : undefined,
        }))
      : undefined,
    requiredCommands: lab.requiredCommands ? [...lab.requiredCommands] : undefined,
    logContextTitle: lab.logContextTitle,
    logEntries: lab.logEntries ? lab.logEntries.map(sanitizeLogEntryForClient) : undefined,
    artifactTitle: lab.artifactTitle,
    artifactLanguage: lab.artifactLanguage,
    artifactContent: lab.artifactContent,
    ...(lab.kind === 'scenario'
      ? { highlightTargetCount: lab.artifactHighlightLines ? lab.artifactHighlightLines.length : 0 }
      : {}),
    challenge: {
      prompt: lab.challenge.prompt,
      options: [...lab.challenge.options],
      hint: lab.challenge.hint,
    },
  };
}

let cachedPublicPayload: PublicCurriculumPayload | null = null;

/**
 * Returns sanitized curriculum and practical labs safe for browser delivery:
 * strips quiz `correctOption` & pre-submission `explanation`, lab `correctIndex` & `explanation`,
 * log `suspiciousEntryId` / `isSuspicious`, and terminal `homeworkValidateRegex`.
 */
export function getPublicCurriculumPayload(): PublicCurriculumPayload {
  if (cachedPublicPayload) {
    return cachedPublicPayload;
  }

  const curriculum: Tier[] = ACADEMY_CURRICULUM.map((tier) => ({
    id: tier.id,
    number: tier.number,
    title: tier.title,
    description: tier.description,
    order: tier.order,
    defaultRequired: tier.defaultRequired,
    topics: tier.topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      category: topic.category,
      order: topic.order,
      tierId: topic.tierId,
      lessons: topic.lessons.map(sanitizeLessonForClient),
    })),
  }));

  const labs: PracticalLab[] = ALL_PRACTICAL_LABS.map(sanitizeLabForClient);
  cachedPublicPayload = { curriculum, labs };
  return cachedPublicPayload;
}

export type QuizGradingResult =
  | {
      ok: true;
      passed: boolean;
      scorePercent: number;
      requiredPercent: number;
      correctCount: number;
      totalQuestions: number;
      questionFeedback?: Record<string, { correct: boolean; feedback: string }>;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export function gradeQuizSubmission(
  lesson: Lesson,
  answers: unknown
): QuizGradingResult {
  if (!lesson.quiz || lesson.quiz.length === 0) {
    return {
      ok: false,
      status: 400,
      error: `Lesson "${lesson.id}" does not have an assessable quiz.`,
    };
  }

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return {
      ok: false,
      status: 400,
      error: 'Quiz answers map is required for server verification.',
    };
  }

  const answerMap = answers as Record<string, unknown>;
  if (Object.keys(answerMap).length > lesson.quiz.length + 5) {
    return {
      ok: false,
      status: 400,
      error: 'Quiz submission contains unexpected answer entries.',
    };
  }

  const questionFeedback: Record<string, { correct: boolean; feedback: string }> = {};
  let correctCount = 0;

  for (const q of lesson.quiz) {
    const provided = answerMap[q.id];
    if (
      typeof provided !== 'number' ||
      !Number.isInteger(provided) ||
      provided < 0 ||
      provided >= q.options.length
    ) {
      return {
        ok: false,
        status: 400,
        error: `Missing or invalid answer for quiz question "${q.id}".`,
      };
    }

    const isCorrect = provided === q.correctOption;
    if (isCorrect) {
      correctCount++;
    }
    questionFeedback[q.id] = {
      correct: isCorrect,
      feedback: isCorrect
        ? q.explanation || 'Correct.'
        : 'Incorrect. Review the lesson material and try another option.',
    };
  }

  const totalQuestions = lesson.quiz.length;
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);
  const requiredPercent = lesson.completionRequirements?.minQuizScorePercent ?? 100;
  const passed = scorePercent >= requiredPercent;

  return {
    ok: true,
    passed,
    scorePercent,
    requiredPercent,
    correctCount,
    totalQuestions,
    // Prevent answer-enumeration oracle: only reveal per-question breakdown once threshold is passed.
    ...(passed ? { questionFeedback } : {}),
  };
}

export type LabChallengeGradingResult =
  | {
      ok: true;
      correct: boolean;
      lab: PracticalLab;
      explanation?: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
    };

export function gradeLabChallengeSubmission(
  canonicalLessonId: string,
  exerciseId: unknown,
  selectedOption: unknown
): LabChallengeGradingResult {
  if (typeof exerciseId !== 'string' || !exerciseId.trim()) {
    return {
      ok: false,
      status: 400,
      error: 'Valid exerciseId is required to complete a practical lab.',
    };
  }

  const canonicalExerciseId = resolveCanonicalExerciseId(exerciseId.trim());
  const lab = getPracticalLabById(canonicalExerciseId);
  if (!lab) {
    return {
      ok: false,
      status: 404,
      error: `Practical lab "${exerciseId}" does not exist.`,
    };
  }

  if (lab.lessonId !== canonicalLessonId) {
    return {
      ok: false,
      status: 400,
      error: `Practical lab "${lab.id}" does not belong to lesson "${canonicalLessonId}".`,
    };
  }

  if (
    typeof selectedOption !== 'number' ||
    !Number.isInteger(selectedOption) ||
    selectedOption < 0 ||
    selectedOption >= lab.challenge.options.length
  ) {
    return {
      ok: false,
      status: 400,
      error: 'A valid challenge answer option is required for practical lab verification.',
    };
  }

  const correct = selectedOption === lab.challenge.correctIndex;
  return {
    ok: true,
    correct,
    lab,
    ...(correct && lab.challenge.explanation ? { explanation: lab.challenge.explanation } : {}),
  };
}

export type LogInvestigationVerifyResult =
  | {
      ok: true;
      isTarget: boolean;
      message: string;
      lab: PracticalLab;
      entryId: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      missingPrerequisites?: PrerequisiteInfo[];
    };

export function verifyLogInvestigationTarget(
  lessonId: unknown,
  labId: unknown,
  entryId: unknown,
  progress: UserProgress,
  curriculum: Tier[] = ACADEMY_CURRICULUM
): LogInvestigationVerifyResult {
  if (typeof lessonId !== 'string' || !lessonId.trim()) {
    return { ok: false, status: 400, error: 'Valid lessonId is required.' };
  }
  if (typeof labId !== 'string' || !labId.trim()) {
    return { ok: false, status: 400, error: 'Valid labId is required.' };
  }
  if (typeof entryId !== 'string' || !entryId.trim()) {
    return { ok: false, status: 400, error: 'Valid entryId is required.' };
  }

  const canonicalLessonId = resolveCanonicalLessonId(lessonId.trim());
  const lessonEntry = indexCurriculumLessons(curriculum).get(canonicalLessonId);
  if (!lessonEntry) {
    return {
      ok: false,
      status: 404,
      error: `Lesson "${lessonId}" was not found in the academy curriculum.`,
    };
  }

  if (!isLessonUnlocked(lessonEntry.lesson, progress, curriculum)) {
    const missing = getMissingPrerequisites(lessonEntry.lesson, progress, curriculum);
    return {
      ok: false,
      status: 403,
      error: `Lesson "${lessonEntry.lesson.title}" is locked until required prerequisites are completed.`,
      missingPrerequisites: missing,
    };
  }

  const canonicalLabId = resolveCanonicalExerciseId(labId.trim());
  const lab = getPracticalLabById(canonicalLabId);
  if (!lab || lab.lessonId !== canonicalLessonId) {
    return {
      ok: false,
      status: 400,
      error: `Practical lab "${labId}" does not match lesson "${canonicalLessonId}".`,
    };
  }

  if (lab.kind !== 'log_investigation' || !Array.isArray(lab.logEntries)) {
    return {
      ok: false,
      status: 400,
      error: `Practical lab "${lab.id}" is not a log investigation exercise.`,
    };
  }

  const matchedEntry = lab.logEntries.find((e) => e.id === entryId.trim());
  if (!matchedEntry) {
    return {
      ok: false,
      status: 400,
      error: `Log entry "${entryId}" was not found in this investigation.`,
    };
  }

  const isTarget = matchedEntry.id === lab.suspiciousEntryId;
  return {
    ok: true,
    isTarget,
    lab,
    entryId: matchedEntry.id,
    message: isTarget
      ? `Event ${matchedEntry.id} confirmed as the suspicious event. Proceed to the challenge question below.`
      : `Event ${matchedEntry.id} matches authorized baseline activity. Inspect the remaining records to spot the anomaly.`,
  };
}

export function getCanonicalLabForLesson(lessonId: string) {
  return getPracticalLabForLesson(resolveCanonicalLessonId(lessonId));
}

export function normalizeTerminalInput(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function matchTerminalCommand(
  lab: PracticalLab,
  rawCommand: string
): TerminalCommandSimulation | null {
  const normalized = normalizeTerminalInput(rawCommand);
  if (!normalized) return null;
  const commands = lab.terminalCommands || [];
  return (
    commands.find((cmd) => {
      if (normalizeTerminalInput(cmd.command) === normalized) return true;
      return (cmd.aliases || []).some((alias) => {
        const normAlias = normalizeTerminalInput(alias);
        return normalized === normAlias || normalized.startsWith(`${normAlias} `);
      });
    }) || null
  );
}

export function getRequiredDiagramItemCount(lab: PracticalLab): number {
  const itemsCount = lab.diagramItems?.length || 0;
  if (itemsCount === 0) return 0;
  const match = /at least (\d+)/i.exec(lab.expectedOutcome || '');
  if (match) {
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(parsed, itemsCount);
    }
  }
  return itemsCount;
}

export function getRequiredTerminalCommands(lab: PracticalLab): string[] {
  if (lab.requiredCommands && lab.requiredCommands.length > 0) {
    return [...lab.requiredCommands];
  }
  return (lab.terminalCommands || []).map((c) => c.command);
}

export interface ExplorationAccountShape {
  progress?: UserProgress;
  labExploration?: LabExplorationMap;
}

export function isLabExplorationComplete(
  account: ExplorationAccountShape,
  lab: PracticalLab
): boolean {
  if ((account.progress?.completedExerciseIds || []).includes(lab.id)) {
    return true;
  }

  const state = account.labExploration?.[lab.id];
  if (lab.kind === 'diagram') {
    const requiredCount = getRequiredDiagramItemCount(lab);
    if (requiredCount === 0) return true;
    const validIds = new Set((lab.diagramItems || []).map((item) => item.id));
    const uniqueExplored = new Set(
      (state?.exploredDiagramIds || []).filter((id) => validIds.has(id))
    );
    return uniqueExplored.size >= requiredCount;
  }

  if (lab.kind === 'terminal') {
    const targetCmds = getRequiredTerminalCommands(lab);
    if (targetCmds.length === 0) return true;
    const executed = new Set(state?.executedTerminalCommands || []);
    return targetCmds.every((cmd) => executed.has(cmd));
  }

  if (lab.kind === 'log_investigation') {
    return Boolean(state?.logTargetVerified);
  }

  if (lab.kind === 'scenario') {
    const expected = lab.artifactHighlightLines || [];
    if (expected.length === 0) return true;
    return Boolean(state?.scenarioVerified);
  }

  return true;
}

export function getMissingExplorationMessage(
  account: ExplorationAccountShape,
  lab: PracticalLab
): string {
  const state = account.labExploration?.[lab.id];
  if (lab.kind === 'diagram') {
    const req = getRequiredDiagramItemCount(lab);
    const cur = (state?.exploredDiagramIds || []).length;
    return `Complete Step 1 (Explore) first: inspect at least ${req} component/stage card(s) (${cur}/${req} explored) before verifying your answer.`;
  }
  if (lab.kind === 'terminal') {
    const req = getRequiredTerminalCommands(lab);
    const done = new Set(state?.executedTerminalCommands || []);
    const remaining = req.filter((c) => !done.has(c)).length;
    return `Complete Step 1 (Explore) first: run all required terminal commands (${req.length - remaining}/${req.length} executed) before checking your answer.`;
  }
  if (lab.kind === 'log_investigation') {
    return 'Complete Step 1 (Explore) first: inspect the logs and flag the suspicious entry before checking your answer.';
  }
  if (lab.kind === 'scenario') {
    const targetCount = lab.artifactHighlightLines?.length || 1;
    return `Complete Step 1 (Explore) first: select and verify the ${targetCount} suspicious artifact line${targetCount === 1 ? '' : 's'} before checking your answer.`;
  }
  return 'Complete Step 1 exploration before checking your answer.';
}

export function getSanitizedLabExplorationForUser(
  account: ExplorationAccountShape
): LabExplorationMap {
  const rawMap = account.labExploration || {};
  const result: LabExplorationMap = {};
  for (const [labId, entry] of Object.entries(rawMap)) {
    const lab = getPracticalLabById(labId);
    if (!lab || !entry) continue;
    const isCompleted = (account.progress?.completedExerciseIds || []).includes(labId);
    result[labId] = {
      ...(Array.isArray(entry.exploredDiagramIds)
        ? { exploredDiagramIds: [...entry.exploredDiagramIds] }
        : {}),
      ...(Array.isArray(entry.executedTerminalCommands)
        ? { executedTerminalCommands: [...entry.executedTerminalCommands] }
        : {}),
      ...(typeof entry.logTargetVerified === 'boolean'
        ? { logTargetVerified: entry.logTargetVerified }
        : {}),
      ...(entry.logTargetVerified && entry.verifiedLogEntryId
        ? { verifiedLogEntryId: entry.verifiedLogEntryId }
        : {}),
      ...(typeof entry.scenarioVerified === 'boolean'
        ? { scenarioVerified: entry.scenarioVerified }
        : {}),
      ...(entry.scenarioVerified && Array.isArray(entry.verifiedHighlightLines)
        ? { verifiedHighlightLines: [...entry.verifiedHighlightLines] }
        : {}),
      explorationComplete: isCompleted || isLabExplorationComplete(account, lab),
    };
  }
  return result;
}

export function sanitizeSingleLabExploration(
  account: ExplorationAccountShape,
  lab: PracticalLab
): LabExplorationProgress {
  const map = getSanitizedLabExplorationForUser(account);
  return (
    map[lab.id] || {
      explorationComplete: isLabExplorationComplete(account, lab),
    }
  );
}

export function recordVerifiedLogInvestigation(
  account: ExplorationAccountShape,
  lab: PracticalLab,
  entryId: string
): { exploration: LabExplorationProgress; explorationComplete: boolean } {
  if (!account.labExploration) {
    account.labExploration = {};
  }
  const existing = account.labExploration[lab.id] || {};
  account.labExploration[lab.id] = {
    ...existing,
    logTargetVerified: true,
    verifiedLogEntryId: entryId,
  };
  const complete = isLabExplorationComplete(account, lab);
  return {
    exploration: sanitizeSingleLabExploration(account, lab),
    explorationComplete: complete,
  };
}

export type ExploreLabStepResult =
  | {
      ok: true;
      data: ExploreLabApiResponse;
      dbChanged: boolean;
    }
  | {
      ok: false;
      status: number;
      error: string;
      missingPrerequisites?: PrerequisiteInfo[];
    };

export function processLabExplorationStep(
  account: ExplorationAccountShape,
  input: {
    lessonId: unknown;
    labId: unknown;
    action: unknown;
    itemId?: unknown;
    command?: unknown;
    selectedLines?: unknown;
  },
  curriculum: Tier[] = ACADEMY_CURRICULUM
): ExploreLabStepResult {
  if (typeof input.lessonId !== 'string' || !input.lessonId.trim() || input.lessonId.length > 128) {
    return { ok: false, status: 400, error: 'Valid lessonId (1-128 chars) is required.' };
  }
  if (typeof input.labId !== 'string' || !input.labId.trim() || input.labId.length > 128) {
    return { ok: false, status: 400, error: 'Valid labId (1-128 chars) is required.' };
  }
  if (
    input.action !== 'explore_diagram_item' &&
    input.action !== 'execute_terminal_command' &&
    input.action !== 'verify_scenario_lines'
  ) {
    return { ok: false, status: 400, error: 'Invalid exploration action.' };
  }

  const action: ExploreLabAction = input.action;
  const canonicalLessonId = resolveCanonicalLessonId(input.lessonId.trim());
  const lessonEntry = indexCurriculumLessons(curriculum).get(canonicalLessonId);
  if (!lessonEntry) {
    return {
      ok: false,
      status: 404,
      error: `Lesson "${input.lessonId}" was not found in the academy curriculum.`,
    };
  }

  const progressForUnlock: UserProgress = account.progress || {
    completedLessonIds: [],
    completedExerciseIds: [],
    completedQuizLessonIds: [],
    completedHomeworkLessonIds: [],
    xp: 0,
    streak: 0,
    lastActiveDate: null,
  };

  if (!isLessonUnlocked(lessonEntry.lesson, progressForUnlock, curriculum)) {
    const missing = getMissingPrerequisites(lessonEntry.lesson, progressForUnlock, curriculum);
    return {
      ok: false,
      status: 403,
      error: `Lesson "${lessonEntry.lesson.title}" is locked until required prerequisites are completed.`,
      missingPrerequisites: missing,
    };
  }

  const canonicalLabId = resolveCanonicalExerciseId(input.labId.trim());
  const lab = getPracticalLabById(canonicalLabId);
  if (!lab || lab.lessonId !== canonicalLessonId) {
    return {
      ok: false,
      status: 400,
      error: `Practical lab "${input.labId}" does not match lesson "${canonicalLessonId}".`,
    };
  }

  if (!account.labExploration) {
    account.labExploration = {};
  }
  const currentState: LabExplorationProgress = { ...(account.labExploration[lab.id] || {}) };
  let dbChanged = false;

  if (action === 'explore_diagram_item') {
    if (lab.kind !== 'diagram' || !Array.isArray(lab.diagramItems)) {
      return { ok: false, status: 400, error: `Lab "${lab.id}" is not an interactive diagram lab.` };
    }
    if (typeof input.itemId !== 'string' || !input.itemId.trim() || input.itemId.length > 128) {
      return { ok: false, status: 400, error: 'Valid diagram itemId is required.' };
    }
    const cleanItemId = input.itemId.trim();
    const validItem = lab.diagramItems.some((item) => item.id === cleanItemId);
    if (!validItem) {
      return { ok: false, status: 400, error: `Diagram item "${cleanItemId}" was not found in lab "${lab.id}".` };
    }
    const existingIds = Array.isArray(currentState.exploredDiagramIds)
      ? [...currentState.exploredDiagramIds]
      : [];
    if (!existingIds.includes(cleanItemId)) {
      existingIds.push(cleanItemId);
      currentState.exploredDiagramIds = existingIds;
      account.labExploration[lab.id] = currentState;
      dbChanged = true;
    }

    const complete = isLabExplorationComplete(account, lab);
    return {
      ok: true,
      dbChanged,
      data: {
        labId: lab.id,
        exploration: sanitizeSingleLabExploration(account, lab),
        explorationComplete: complete,
      },
    };
  }

  if (action === 'execute_terminal_command') {
    if (lab.kind !== 'terminal' || !Array.isArray(lab.terminalCommands)) {
      return { ok: false, status: 400, error: `Lab "${lab.id}" is not a simulated terminal lab.` };
    }
    if (typeof input.command !== 'string' || !input.command.trim() || input.command.length > 500) {
      return { ok: false, status: 400, error: 'Valid command string (1-500 chars) is required.' };
    }

    const matched = matchTerminalCommand(lab, input.command);
    if (!matched) {
      const complete = isLabExplorationComplete(account, lab);
      return {
        ok: true,
        dbChanged: false,
        data: {
          labId: lab.id,
          exploration: sanitizeSingleLabExploration(account, lab),
          explorationComplete: complete,
          commandResult: {
            matched: false,
            message:
              'Unrecognized command in this simulated sandbox. Try one of the lab commands above (or type "help").',
          },
        },
      };
    }

    const existingCmds = Array.isArray(currentState.executedTerminalCommands)
      ? [...currentState.executedTerminalCommands]
      : [];
    if (!existingCmds.includes(matched.command)) {
      existingCmds.push(matched.command);
      currentState.executedTerminalCommands = existingCmds;
      account.labExploration[lab.id] = currentState;
      dbChanged = true;
    }

    const complete = isLabExplorationComplete(account, lab);
    return {
      ok: true,
      dbChanged,
      data: {
        labId: lab.id,
        exploration: sanitizeSingleLabExploration(account, lab),
        explorationComplete: complete,
        commandResult: {
          matched: true,
          command: matched.command,
          description: matched.description,
          flagsSummary: matched.flagsSummary,
          output: matched.output,
          interpretation: matched.interpretation,
        },
      },
    };
  }

  // action === 'verify_scenario_lines'
  if (lab.kind !== 'scenario') {
    return { ok: false, status: 400, error: `Lab "${lab.id}" is not a security audit scenario lab.` };
  }
  if (!Array.isArray(input.selectedLines)) {
    return { ok: false, status: 400, error: 'selectedLines array of line numbers is required.' };
  }

  const artifactLines = (lab.artifactContent || '').split('\n');
  const maxLineNumber = Math.max(1, artifactLines.length);
  const uniqueSelectedSet = new Set<number>();
  for (const val of input.selectedLines) {
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > maxLineNumber) {
      return {
        ok: false,
        status: 400,
        error: `Line selections must be valid integers between 1 and ${maxLineNumber}.`,
      };
    }
    uniqueSelectedSet.add(val);
  }

  if (uniqueSelectedSet.size === 0) {
    return {
      ok: false,
      status: 400,
      error: 'Select the suspicious line(s) in the artifact before verifying.',
    };
  }

  const expectedLines = Array.from(
    new Set((lab.artifactHighlightLines || []).filter((n) => Number.isInteger(n) && n >= 1))
  ).sort((a, b) => a - b);

  if (expectedLines.length === 0) {
    currentState.scenarioVerified = true;
    currentState.verifiedHighlightLines = [];
    account.labExploration[lab.id] = currentState;
    dbChanged = true;
    return {
      ok: true,
      dbChanged,
      data: {
        labId: lab.id,
        exploration: sanitizeSingleLabExploration(account, lab),
        explorationComplete: true,
        scenarioResult: {
          verified: true,
          verifiedHighlightLines: [],
          message: 'Artifact inspection verified. Proceed to Step 2 below.',
        },
      },
    };
  }

  if (uniqueSelectedSet.size > expectedLines.length) {
    return {
      ok: false,
      status: 400,
      error: `Select exact ${expectedLines.length} suspicious line${expectedLines.length === 1 ? '' : 's'} to verify.`,
    };
  }

  const sortedSelected = Array.from(uniqueSelectedSet).sort((a, b) => a - b);
  const isExactMatch =
    sortedSelected.length === expectedLines.length &&
    sortedSelected.every((val, idx) => val === expectedLines[idx]);

  if (!isExactMatch) {
    const complete = isLabExplorationComplete(account, lab);
    return {
      ok: true,
      dbChanged: false,
      data: {
        labId: lab.id,
        exploration: sanitizeSingleLabExploration(account, lab),
        explorationComplete: complete,
        scenarioResult: {
          verified: false,
          message:
            sortedSelected.length !== expectedLines.length
              ? `Select ${expectedLines.length} suspicious line${expectedLines.length === 1 ? '' : 's'} matching the security issue in the artifact.`
              : 'Selected line(s) do not pinpoint the suspicious configuration/finding. Review the artifact and try again.',
        },
      },
    };
  }

  if (!currentState.scenarioVerified) {
    currentState.scenarioVerified = true;
    currentState.verifiedHighlightLines = [...expectedLines];
    account.labExploration[lab.id] = currentState;
    dbChanged = true;
  }

  return {
    ok: true,
    dbChanged,
    data: {
      labId: lab.id,
      exploration: sanitizeSingleLabExploration(account, lab),
      explorationComplete: true,
      scenarioResult: {
        verified: true,
        verifiedHighlightLines: [...expectedLines],
        message: 'Suspicious artifact line(s) confirmed! Proceed to Step 2 below.',
      },
    },
  };
}

