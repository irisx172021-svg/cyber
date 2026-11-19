import { Lesson, PracticalLab, Tier, UserProgress } from '../types';
import {
  resolveCanonicalExerciseId,
  resolveCanonicalLessonId,
} from '../data/curriculumMetadata';

export interface IndexedLessonEntry {
  lesson: Lesson;
  topicId: string;
  topicTitle: string;
  tierId: string;
  tierNumber: number;
  tierTitle: string;
}

export interface PrerequisiteInfo {
  id: string;
  title: string;
  tierNumber: number;
  topicTitle: string;
}

export interface CurriculumIntegrityReport {
  valid: boolean;
  tierCount: number;
  topicCount: number;
  lessonCount: number;
  duplicateTierIds: string[];
  duplicateTopicIds: string[];
  duplicateLessonIds: string[];
  malformedLessonIds: string[];
  missingPrerequisites: Array<{ lessonId: string; missingPrereqId: string }>;
  missingRecommendedPrerequisites: Array<{ lessonId: string; missingPrereqId: string }>;
  cycles: string[][];
  lessonsWithoutQuiz: string[];
  lessonsWithoutMetadata: string[];
  missingLabsForLessons: string[];
  orphanLabs: string[];
}

export function indexCurriculumLessons(curriculum: Tier[]): Map<string, IndexedLessonEntry> {
  const index = new Map<string, IndexedLessonEntry>();
  for (const tier of curriculum) {
    for (const topic of tier.topics) {
      for (const lesson of topic.lessons) {
        index.set(lesson.id, {
          lesson,
          topicId: topic.id,
          topicTitle: topic.title,
          tierId: tier.id,
          tierNumber: tier.number,
          tierTitle: tier.title,
        });
      }
    }
  }
  return index;
}

/**
 * Normalizes and deduplicates an array of completed/quiz/homework lesson IDs
 * using explicit legacy mappings, preserving only canonical live lesson IDs
 * for progress percentages and separating unknown legacy IDs safely.
 */
export function filterValidCompletedLessonIds(
  ids: string[] | undefined,
  curriculum: Tier[]
): { validIds: string[]; unknownLegacyIds: string[] } {
  const validSet = indexCurriculumLessons(curriculum);
  const seen = new Set<string>();
  const validIds: string[] = [];
  const unknownSet = new Set<string>();

  for (const rawId of ids || []) {
    if (!rawId || typeof rawId !== 'string') continue;
    const canonical = resolveCanonicalLessonId(rawId);
    if (validSet.has(canonical)) {
      if (!seen.has(canonical)) {
        seen.add(canonical);
        validIds.push(canonical);
      }
    } else {
      unknownSet.add(rawId);
    }
  }

  return {
    validIds,
    unknownLegacyIds: Array.from(unknownSet),
  };
}

export function normalizeCompletedExerciseIds(ids: string[] | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const rawId of ids || []) {
    if (!rawId || typeof rawId !== 'string') continue;
    const canonical = resolveCanonicalExerciseId(rawId);
    if (!seen.has(canonical)) {
      seen.add(canonical);
      result.push(canonical);
    }
  }
  return result;
}

export function getCanonicalCompletedSet(
  progress: UserProgress | undefined,
  curriculum: Tier[]
): Set<string> {
  const { validIds } = filterValidCompletedLessonIds(progress?.completedLessonIds, curriculum);
  return new Set(validIds);
}

/**
 * Guided Learning Rules:
 * 1. Learners begin with the first available lesson (`prerequisites` empty).
 * 2. Mandatory prerequisites must be completed before dependent lessons unlock.
 * 3. Optional `recommendedPrerequisites` never block progress.
 * 4. Already-completed lessons remain unlocked/accessible even after curriculum reorganization.
 */
export function getMissingPrerequisites(
  lesson: Lesson,
  progress: UserProgress | undefined,
  curriculum: Tier[]
): PrerequisiteInfo[] {
  const completedSet = getCanonicalCompletedSet(progress, curriculum);
  if (completedSet.has(lesson.id)) {
    return [];
  }

  const requiredPrereqs = lesson.prerequisites || [];
  if (requiredPrereqs.length === 0) {
    return [];
  }

  const index = indexCurriculumLessons(curriculum);
  const missing: PrerequisiteInfo[] = [];

  for (const rawPrereqId of requiredPrereqs) {
    const prereqId = resolveCanonicalLessonId(rawPrereqId);
    if (!completedSet.has(prereqId)) {
      const target = index.get(prereqId);
      missing.push({
        id: prereqId,
        title: target ? target.lesson.title : prereqId,
        tierNumber: target ? target.tierNumber : 1,
        topicTitle: target ? target.topicTitle : 'Foundations',
      });
    }
  }

  return missing;
}

export function isLessonUnlocked(
  lesson: Lesson,
  progress: UserProgress | undefined,
  curriculum: Tier[]
): boolean {
  return getMissingPrerequisites(lesson, progress, curriculum).length === 0;
}

export function getRecommendedPrerequisiteInfos(
  lesson: Lesson,
  progress: UserProgress | undefined,
  curriculum: Tier[]
): Array<PrerequisiteInfo & { completed: boolean }> {
  const completedSet = getCanonicalCompletedSet(progress, curriculum);
  const index = indexCurriculumLessons(curriculum);
  return (lesson.recommendedPrerequisites || []).map((rawId) => {
    const id = resolveCanonicalLessonId(rawId);
    const target = index.get(id);
    return {
      id,
      title: target ? target.lesson.title : id,
      tierNumber: target ? target.tierNumber : 1,
      topicTitle: target ? target.topicTitle : 'Foundations',
      completed: completedSet.has(id),
    };
  });
}

/**
 * Computes whether a lesson satisfies its completion requirements given active progress.
 * Preserves backward compatibility: if lessonId is already in completedLessonIds (e.g., from legacy data),
 * it remains completed unless explicitly reset.
 */
export function isLessonRequirementsMet(
  lesson: Lesson,
  progress: UserProgress,
  practicalLabId?: string,
  quizScorePercent?: number
): boolean {
  const quizIds = new Set((progress.completedQuizLessonIds || []).map(resolveCanonicalLessonId));
  const homeworkIds = new Set(
    (progress.completedHomeworkLessonIds || []).map(resolveCanonicalLessonId)
  );
  const exerciseIds = new Set(
    (progress.completedExerciseIds || []).map(resolveCanonicalExerciseId)
  );

  const reqs = lesson.completionRequirements || { requireQuiz: true };
  if (reqs.requireQuiz) {
    if (!quizIds.has(lesson.id)) {
      return false;
    }
    const minScore = reqs.minQuizScorePercent ?? 100;
    if (typeof quizScorePercent === 'number' && quizScorePercent < minScore) {
      return false;
    }
  }
  if (reqs.requireHomework && lesson.requiresTerminal && !homeworkIds.has(lesson.id)) {
    return false;
  }
  if (reqs.requirePracticalLab && practicalLabId && !exerciseIds.has(practicalLabId)) {
    return false;
  }
  return true;
}

const FALLBACK_HOMEWORK_BY_LESSON: Record<
  string,
  { command: string; instruction: string; hint: string; regex: string }
> = {
  'comp-hardware': {
    command: 'lscpu',
    instruction:
      "Run `lscpu`, `lsblk`, or `free -h` in your local machine's terminal to inspect your system hardware specifications.",
    hint: 'Ensure your pasted output contains CPU architecture fields (e.g., "Architecture:", "x86_64", "Model name:") or storage/memory indicators (e.g., "NAME", "MAJ:MIN", "Mem:", "total").',
    regex: 'architecture|x86_64|model name|vendor id|cpu|lsblk|name\\s+maj|sda\\d*|mem:\\s+\\d+|total\\s+used',
  },
};

export function getHomeworkValidationConfig(lesson: Lesson): {
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

export function validateHomeworkOutput(lesson: Lesson, text: string): boolean {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return false;
  }
  return getHomeworkValidationConfig(lesson).validate(text);
}

/**
 * Picks the next guided lesson for the learner:
 * prefers the first uncompleted unlocked lesson, falling back to the first uncompleted lesson
 * or the very first lesson in the curriculum.
 */
export function getNextRecommendedLesson(
  curriculum: Tier[],
  progress: UserProgress
): IndexedLessonEntry | null {
  const completedSet = getCanonicalCompletedSet(progress, curriculum);
  let firstUncompleted: IndexedLessonEntry | null = null;
  let firstEntry: IndexedLessonEntry | null = null;

  for (const tier of curriculum) {
    for (const topic of tier.topics) {
      for (const lesson of topic.lessons) {
        const entry: IndexedLessonEntry = {
          lesson,
          topicId: topic.id,
          topicTitle: topic.title,
          tierId: tier.id,
          tierNumber: tier.number,
          tierTitle: tier.title,
        };
        if (!firstEntry) firstEntry = entry;
        if (!completedSet.has(lesson.id)) {
          if (!firstUncompleted) firstUncompleted = entry;
          if (isLessonUnlocked(lesson, progress, curriculum)) {
            return entry;
          }
        }
      }
    }
  }

  return firstUncompleted || firstEntry;
}

export function computeCurriculumStats(curriculum: Tier[], progress: UserProgress) {
  const completedSet = getCanonicalCompletedSet(progress, curriculum);
  let totalLessons = 0;
  let completedLessons = 0;
  let requiredTotal = 0;
  let requiredCompleted = 0;

  for (const tier of curriculum) {
    for (const topic of tier.topics) {
      for (const lesson of topic.lessons) {
        totalLessons++;
        const isDone = completedSet.has(lesson.id);
        if (isDone) completedLessons++;
        const isRequired = lesson.required !== false;
        if (isRequired) {
          requiredTotal++;
          if (isDone) requiredCompleted++;
        }
      }
    }
  }

  const completionPercent =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    totalLessons,
    completedLessons,
    requiredTotal,
    requiredCompleted,
    completionPercent,
  };
}

/**
 * Validates the entire curriculum structure and prerequisite graph for:
 * - Duplicate tier/topic/lesson IDs
 * - Malformed lesson IDs (spaces, uppercase, non-kebab characters)
 * - Missing prerequisite references
 * - Circular prerequisite dependencies (cycle detection via DFS 3-color graph traversal)
 * - Quiz presence, metadata completeness, and practical lab alignment
 */
export function validateCurriculumGraph(
  curriculum: Tier[],
  labs: PracticalLab[] = []
): CurriculumIntegrityReport {
  const tierSeen = new Set<string>();
  const topicSeen = new Set<string>();
  const lessonSeen = new Set<string>();

  const duplicateTierIds: string[] = [];
  const duplicateTopicIds: string[] = [];
  const duplicateLessonIds: string[] = [];
  const malformedLessonIds: string[] = [];
  const lessonsWithoutQuiz: string[] = [];
  const lessonsWithoutMetadata: string[] = [];

  const allLessons: Lesson[] = [];
  let topicCount = 0;

  for (const tier of curriculum) {
    if (tierSeen.has(tier.id)) duplicateTierIds.push(tier.id);
    tierSeen.add(tier.id);

    for (const topic of tier.topics) {
      topicCount++;
      if (topicSeen.has(topic.id)) duplicateTopicIds.push(topic.id);
      topicSeen.add(topic.id);

      for (const lesson of topic.lessons) {
        allLessons.push(lesson);
        if (lessonSeen.has(lesson.id)) duplicateLessonIds.push(lesson.id);
        lessonSeen.add(lesson.id);

        if (!/^[a-z0-9-]+$/.test(lesson.id)) {
          malformedLessonIds.push(lesson.id);
        }
        if (!lesson.quiz || lesson.quiz.length === 0) {
          lessonsWithoutQuiz.push(lesson.id);
        }
        if (
          typeof lesson.order !== 'number' ||
          !lesson.tierId ||
          !lesson.topicId ||
          !lesson.difficulty ||
          typeof lesson.estimatedMinutes !== 'number' ||
          !Array.isArray(lesson.prerequisites) ||
          !lesson.completionRequirements
        ) {
          lessonsWithoutMetadata.push(lesson.id);
        }
      }
    }
  }

  const missingPrerequisites: Array<{ lessonId: string; missingPrereqId: string }> = [];
  const missingRecommendedPrerequisites: Array<{ lessonId: string; missingPrereqId: string }> = [];

  for (const lesson of allLessons) {
    for (const prereqId of lesson.prerequisites || []) {
      if (!lessonSeen.has(prereqId)) {
        missingPrerequisites.push({ lessonId: lesson.id, missingPrereqId: prereqId });
      }
    }
    for (const recId of lesson.recommendedPrerequisites || []) {
      if (!lessonSeen.has(recId)) {
        missingRecommendedPrerequisites.push({ lessonId: lesson.id, missingPrereqId: recId });
      }
    }
  }

  // DFS cycle detection on prerequisite edges (lesson -> prerequisite)
  const color = new Map<string, 0 | 1 | 2>(); // 0=unvisited, 1=visiting, 2=done
  const prereqMap = new Map<string, string[]>();
  for (const lesson of allLessons) {
    color.set(lesson.id, 0);
    prereqMap.set(lesson.id, lesson.prerequisites || []);
  }

  const cycles: string[][] = [];
  const stack: string[] = [];

  const dfs = (nodeId: string) => {
    color.set(nodeId, 1);
    stack.push(nodeId);

    for (const depId of prereqMap.get(nodeId) || []) {
      if (!color.has(depId)) continue;
      const depColor = color.get(depId);
      if (depColor === 1) {
        const cycleStart = stack.indexOf(depId);
        cycles.push([...stack.slice(cycleStart), depId]);
      } else if (depColor === 0) {
        dfs(depId);
      }
    }

    stack.pop();
    color.set(nodeId, 2);
  };

  for (const lesson of allLessons) {
    if (color.get(lesson.id) === 0) {
      dfs(lesson.id);
    }
  }

  // Optional lab alignment check when labs list is provided
  const labLessonIds = new Set(labs.map((l) => l.lessonId));
  const missingLabsForLessons =
    labs.length > 0 ? allLessons.map((l) => l.id).filter((id) => !labLessonIds.has(id)) : [];
  const orphanLabs =
    labs.length > 0 ? labs.filter((l) => !lessonSeen.has(l.lessonId)).map((l) => l.id) : [];

  const valid =
    duplicateTierIds.length === 0 &&
    duplicateTopicIds.length === 0 &&
    duplicateLessonIds.length === 0 &&
    malformedLessonIds.length === 0 &&
    missingPrerequisites.length === 0 &&
    missingRecommendedPrerequisites.length === 0 &&
    cycles.length === 0 &&
    lessonsWithoutQuiz.length === 0 &&
    lessonsWithoutMetadata.length === 0 &&
    missingLabsForLessons.length === 0 &&
    orphanLabs.length === 0;

  return {
    valid,
    tierCount: curriculum.length,
    topicCount,
    lessonCount: allLessons.length,
    duplicateTierIds,
    duplicateTopicIds,
    duplicateLessonIds,
    malformedLessonIds,
    missingPrerequisites,
    missingRecommendedPrerequisites,
    cycles,
    lessonsWithoutQuiz,
    lessonsWithoutMetadata,
    missingLabsForLessons,
    orphanLabs,
  };
}
