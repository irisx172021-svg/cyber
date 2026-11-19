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
