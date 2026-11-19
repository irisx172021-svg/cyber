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
  Lesson,
  LogEntryItem,
  PracticalLab,
  PublicCurriculumPayload,
  Question,
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
      "Run `lscpu`, `lsblk`, or `free -h` in your local machine's terminal to inspect your system hardware specifications.",
    hint: 'Ensure your pasted output contains CPU architecture fields (e.g., "Architecture:", "x86_64", "Model name:") or storage/memory indicators (e.g., "NAME", "MAJ:MIN", "Mem:", "total").',
    regex:
      'architecture|x86_64|model name|vendor id|cpu|lsblk|name\\s+maj|sda\\d*|mem:\\s+\\d+|total\\s+used',
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
    artifactHighlightLines: lab.artifactHighlightLines
      ? [...lab.artifactHighlightLines]
      : undefined,
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
    message: isTarget
      ? `Event ${matchedEntry.id} confirmed as the suspicious event. Proceed to the challenge question below.`
      : `Event ${matchedEntry.id} matches authorized baseline activity. Inspect the remaining records to spot the anomaly.`,
  };
}

export function getCanonicalLabForLesson(lessonId: string) {
  return getPracticalLabForLesson(resolveCanonicalLessonId(lessonId));
}
