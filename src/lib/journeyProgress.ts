import {
  CapstoneProgressMap,
  Lesson,
  PracticalLab,
  Tier,
  UserProgress,
} from '../types';
import {
  JOURNEY_STAGES,
  JourneyStageDefinition,
  JourneyTopicDefinition,
  SpecialistPathwayDefinition,
} from '../data/journeyBlueprint';
import {
  computeCurriculumStats,
  getCanonicalCompletedSet,
  getMissingPrerequisites,
  IndexedLessonEntry,
  indexCurriculumLessons,
  isLessonUnlocked,
  PrerequisiteInfo,
} from './curriculumProgress';

export type JourneyStageStatus = 'completed' | 'in_progress' | 'available' | 'locked_preview';

export interface JourneyTopicProgressStats {
  topic: JourneyTopicDefinition;
  stageId: string;
  coreTotal: number;
  coreCompleted: number;
  allTotal: number;
  allCompleted: number;
  percent: number;
  totalMinutes: number;
  remainingMinutes: number;
  unlockedCount: number;
  labsDoneCount: number;
  labsTotalCount: number;
  status: JourneyStageStatus;
  recommendedNextLessonId: string | null;
}

export interface JourneyStageProgressStats {
  stage: JourneyStageDefinition;
  coreTotal: number;
  coreCompleted: number;
  optionalTotal: number;
  optionalCompleted: number;
  allTotal: number;
  allCompleted: number;
  corePercent: number;
  totalMinutes: number;
  remainingMinutes: number;
  unlockedCount: number;
  completedCapstoneCount: number;
  totalCapstoneCount: number;
  status: JourneyStageStatus;
  topicStats: JourneyTopicProgressStats[];
  nextMissingPrerequisites: PrerequisiteInfo[];
}

export interface JourneyPathwayProgressStats {
  pathway: SpecialistPathwayDefinition;
  orderedLessonIds: string[];
  totalLessons: number;
  completedLessons: number;
  unlockedLessons: number;
  percent: number;
  totalMinutes: number;
  remainingMinutes: number;
  completedCapstoneCount: number;
  totalCapstoneCount: number;
  nextRecommendedLessonId: string | null;
}

export function computeTopicJourneyStats(
  topic: JourneyTopicDefinition,
  stageId: string,
  curriculum: Tier[],
  lessonIndex: Map<string, IndexedLessonEntry>,
  labsByLesson: Record<string, PracticalLab>,
  progress: UserProgress
): JourneyTopicProgressStats {
  const completedSet = getCanonicalCompletedSet(progress, curriculum);
  const completedLabsSet = new Set(progress.completedExerciseIds || []);

  let coreTotal = 0;
  let coreCompleted = 0;
  let allTotal = 0;
  let allCompleted = 0;
  let totalMinutes = 0;
  let remainingMinutes = 0;
  let unlockedCount = 0;
  let labsDoneCount = 0;
  let labsTotalCount = 0;
  let firstUnlockedIncomplete: string | null = null;
  let firstLessonId: string | null = null;

  for (const lessonId of topic.lessonIds) {
    const entry = lessonIndex.get(lessonId);
    if (!entry) continue;
    const lesson = entry.lesson;
    if (!firstLessonId) firstLessonId = lesson.id;

    allTotal++;
    const isRequired = lesson.required !== false;
    if (isRequired) coreTotal++;

    const isDone = completedSet.has(lesson.id);
    if (isDone) {
      allCompleted++;
      if (isRequired) coreCompleted++;
    }

    const mins = lesson.estimatedMinutes || 15;
    totalMinutes += mins;
    if (!isDone) {
      remainingMinutes += mins;
    }

    const unlocked = isLessonUnlocked(lesson, progress, curriculum);
    if (unlocked) {
      unlockedCount++;
      if (!isDone && !firstUnlockedIncomplete) {
        firstUnlockedIncomplete = lesson.id;
      }
    }

    const lab = labsByLesson[lesson.id];
    if (lab) {
      labsTotalCount++;
      if (completedLabsSet.has(lab.id)) {
        labsDoneCount++;
      }
    }
  }

  const percent =
    coreTotal > 0
      ? Math.round((coreCompleted / coreTotal) * 100)
      : allTotal > 0
      ? Math.round((allCompleted / allTotal) * 100)
      : 0;

  let status: JourneyStageStatus;
  if (coreTotal > 0 ? coreCompleted === coreTotal : allTotal > 0 && allCompleted === allTotal) {
    status = 'completed';
  } else if (allCompleted > 0) {
    status = 'in_progress';
  } else if (unlockedCount > 0) {
    status = 'available';
  } else {
    status = 'locked_preview';
  }

  return {
    topic,
    stageId,
    coreTotal,
    coreCompleted,
    allTotal,
    allCompleted,
    percent,
    totalMinutes,
    remainingMinutes,
    unlockedCount,
    labsDoneCount,
    labsTotalCount,
    status,
    recommendedNextLessonId: firstUnlockedIncomplete || firstLessonId,
  };
}

export function computeAllStageStats(
  curriculum: Tier[],
  labsByLesson: Record<string, PracticalLab>,
  progress: UserProgress,
  capstoneProgress: CapstoneProgressMap = {},
  stages: JourneyStageDefinition[] = JOURNEY_STAGES
): JourneyStageProgressStats[] {
  const lessonIndex = indexCurriculumLessons(curriculum);
  const completedSet = getCanonicalCompletedSet(progress, curriculum);

  const prelim = stages.map((stage) => {
    const topicStats = stage.topics.map((topic) =>
      computeTopicJourneyStats(topic, stage.id, curriculum, lessonIndex, labsByLesson, progress)
    );

    let coreTotal = 0;
    let coreCompleted = 0;
    let optionalTotal = 0;
    let optionalCompleted = 0;
    let allTotal = 0;
    let allCompleted = 0;
    let totalMinutes = 0;
    let remainingMinutes = 0;
    let unlockedCount = 0;
    const missingMap = new Map<string, PrerequisiteInfo>();

    for (const topic of stage.topics) {
      for (const lessonId of topic.lessonIds) {
        const entry = lessonIndex.get(lessonId);
        if (!entry) continue;
        const lesson = entry.lesson;
        const isRequired = lesson.required !== false;
        const isDone = completedSet.has(lesson.id);

        allTotal++;
        if (isDone) allCompleted++;

        if (isRequired) {
          coreTotal++;
          if (isDone) coreCompleted++;
        } else {
          optionalTotal++;
          if (isDone) optionalCompleted++;
        }

        const mins = lesson.estimatedMinutes || 15;
        totalMinutes += mins;
        if (!isDone) remainingMinutes += mins;

        if (isLessonUnlocked(lesson, progress, curriculum)) {
          unlockedCount++;
        } else {
          for (const missing of getMissingPrerequisites(lesson, progress, curriculum)) {
            if (!missingMap.has(missing.id)) {
              missingMap.set(missing.id, missing);
            }
          }
        }
      }
    }

    const corePercent =
      coreTotal > 0
        ? Math.round((coreCompleted / coreTotal) * 100)
        : allTotal > 0
        ? Math.round((allCompleted / allTotal) * 100)
        : 0;

    const totalCapstoneCount = stage.capstoneIds.length;
    const completedCapstoneCount = stage.capstoneIds.filter((cId) =>
      Boolean(capstoneProgress[cId]?.completedAt)
    ).length;

    const isCoreDone =
      coreTotal > 0 ? coreCompleted === coreTotal : allTotal > 0 && allCompleted === allTotal;

    return {
      stage,
      coreTotal,
      coreCompleted,
      optionalTotal,
      optionalCompleted,
      allTotal,
      allCompleted,
      corePercent,
      totalMinutes,
      remainingMinutes,
      unlockedCount,
      completedCapstoneCount,
      totalCapstoneCount,
      topicStats,
      nextMissingPrerequisites: Array.from(missingMap.values()).slice(0, 4),
      isCoreDone,
    };
  });

  // Determine the single primary active stage cleanly if none already has partial progress
  const hasExplicitInProgress = prelim.some((s) => !s.isCoreDone && s.allCompleted > 0);
  const firstAvailableIncompleteIdx = prelim.findIndex(
    (s) => !s.isCoreDone && s.unlockedCount > 0
  );

  return prelim.map((item, idx) => {
    let status: JourneyStageStatus;
    if (item.isCoreDone) {
      status = 'completed';
    } else if (item.allCompleted > 0) {
      status = 'in_progress';
    } else if (!hasExplicitInProgress && idx === firstAvailableIncompleteIdx) {
      status = 'in_progress';
    } else if (item.unlockedCount > 0) {
      status = 'available';
    } else {
      status = 'locked_preview';
    }

    const { isCoreDone: _omit, ...rest } = item;
    return {
      ...rest,
      status,
    };
  });
}

export function computePathwayStats(
  pathway: SpecialistPathwayDefinition,
  curriculum: Tier[],
  labsByLesson: Record<string, PracticalLab>,
  progress: UserProgress,
  capstoneProgress: CapstoneProgressMap = {}
): JourneyPathwayProgressStats {
  const lessonIndex = indexCurriculumLessons(curriculum);
  const completedSet = getCanonicalCompletedSet(progress, curriculum);

  const seen = new Set<string>();
  const orderedLessonIds: string[] = [];
  for (const id of [
    ...pathway.sharedFoundationLessonIds,
    ...pathway.stage4IntroLessonIds,
    ...pathway.stage5AdvancedLessonIds,
  ]) {
    if (!seen.has(id) && lessonIndex.has(id)) {
      seen.add(id);
      orderedLessonIds.push(id);
    }
  }

  let completedLessons = 0;
  let unlockedLessons = 0;
  let totalMinutes = 0;
  let remainingMinutes = 0;
  let nextRecommendedLessonId: string | null = null;

  for (const id of orderedLessonIds) {
    const entry = lessonIndex.get(id)!;
    const lesson = entry.lesson;
    const isDone = completedSet.has(id);
    const unlocked = isLessonUnlocked(lesson, progress, curriculum);
    const mins = lesson.estimatedMinutes || 15;

    totalMinutes += mins;
    if (isDone) {
      completedLessons++;
    } else {
      remainingMinutes += mins;
    }

    if (unlocked) {
      unlockedLessons++;
      if (!isDone && !nextRecommendedLessonId) {
        nextRecommendedLessonId = id;
      }
    }
  }

  const totalLessons = orderedLessonIds.length;
  const percent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const totalCapstoneCount = pathway.capstoneIds.length;
  const completedCapstoneCount = pathway.capstoneIds.filter((cId) =>
    Boolean(capstoneProgress[cId]?.completedAt)
  ).length;

  return {
    pathway,
    orderedLessonIds,
    totalLessons,
    completedLessons,
    unlockedLessons,
    percent,
    totalMinutes,
    remainingMinutes,
    completedCapstoneCount,
    totalCapstoneCount,
    nextRecommendedLessonId: nextRecommendedLessonId || orderedLessonIds[0] || null,
  };
}

export interface JourneyRecommendedNext {
  lesson: Lesson;
  stageId: string;
  stageOrder: number;
  stageTitle: string;
  topicId: string;
  topicTitle: string;
}

export function getJourneyRecommendedNext(
  curriculum: Tier[],
  progress: UserProgress,
  stages: JourneyStageDefinition[] = JOURNEY_STAGES
): JourneyRecommendedNext | null {
  const lessonIndex = indexCurriculumLessons(curriculum);
  const completedSet = getCanonicalCompletedSet(progress, curriculum);

  let firstUncompleted: JourneyRecommendedNext | null = null;
  let firstAny: JourneyRecommendedNext | null = null;

  for (const stage of stages) {
    for (const topic of stage.topics) {
      for (const lessonId of topic.lessonIds) {
        const entry = lessonIndex.get(lessonId);
        if (!entry) continue;
        const candidate: JourneyRecommendedNext = {
          lesson: entry.lesson,
          stageId: stage.id,
          stageOrder: stage.order,
          stageTitle: stage.title,
          topicId: topic.id,
          topicTitle: topic.title,
        };
        if (!firstAny) firstAny = candidate;
        if (!completedSet.has(lessonId)) {
          if (!firstUncompleted) firstUncompleted = candidate;
          if (isLessonUnlocked(entry.lesson, progress, curriculum)) {
            return candidate;
          }
        }
      }
    }
  }

  return firstUncompleted || firstAny;
}

export function getGlobalJourneyStats(curriculum: Tier[], progress: UserProgress) {
  return computeCurriculumStats(curriculum, progress);
}

export function formatEstimatedDuration(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
