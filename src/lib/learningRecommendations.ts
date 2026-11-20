import {
  CapstoneProgressMap,
  LearningProfile,
  Lesson,
  Tier,
  UserProgress,
} from '../types';
import {
  JOURNEY_CAPSTONE_REFERENCES,
  JOURNEY_STAGES,
  JourneyCapstoneReference,
  JourneyStageDefinition,
  JourneyTopicDefinition,
  SPECIALIST_PATHWAYS,
  SpecialistPathwayDefinition,
} from '../data/journeyBlueprint';
import {
  getCanonicalCompletedSet,
  getMissingPrerequisites,
  IndexedLessonEntry,
  indexCurriculumLessons,
  isLessonUnlocked,
  PrerequisiteInfo,
} from './curriculumProgress';
import { resolveCanonicalLessonId } from '../data/curriculumMetadata';
import { getJourneyRecommendedNext } from './journeyProgress';

/**
 * Public capstone prerequisite metadata synced cleanly with server/data/capstones.ts
 * without importing any server-only solutions, target line numbers, or rubrics.
 */
export const CAPSTONE_PREREQUISITE_MAP: Record<string, string[]> = {
  'capstone-soc-investigation': ['soc-triage', 'endpoint-audit', 'win-ad-logs'],
  'capstone-web-app-review': ['http-web-arch', 'db-sql-foundations', 'auth-sessions-id'],
  'capstone-cloud-incident': ['aws-iam-s3', 'aws-logging'],
  'capstone-forensics-triage': ['dig-forensics', 'malware-triage'],
};

export interface RecommendedLessonAction {
  lesson: Lesson;
  stageId: string;
  stageOrder: number;
  stageTitle: string;
  journeyTopicId: string;
  journeyTopicTitle: string;
  pathwayIds: string[];
  pathwayTitles: string[];
  reasonKind: 'pathway_lesson' | 'shared_foundation_prerequisite' | 'shared_foundation';
  reason: string;
  unlocked: true;
  completed: false;
}

export interface LockedPathwayTarget {
  lesson: Lesson;
  stageId: string;
  stageOrder: number;
  journeyTopicId: string;
  journeyTopicTitle: string;
  pathwayTitle: string;
  missingPrerequisites: PrerequisiteInfo[];
  unlockedEntryLesson: { id: string; title: string } | null;
}

export interface RecommendedTopicItem {
  stageId: string;
  stageOrder: number;
  stageTitle: string;
  topic: JourneyTopicDefinition;
  pathwayTitles: string[];
  matchedLessonCount: number;
  completedCount: number;
  totalCount: number;
  unlockedCount: number;
  isFoundationBridge: boolean;
  reason: string;
}

export interface RecommendedCapstoneItem {
  reference: JourneyCapstoneReference;
  pathwayTitles: string[];
  ready: boolean;
  completed: boolean;
  missingPrerequisites: PrerequisiteInfo[];
}

export interface PersonalizedRecommendations {
  isPersonalized: boolean;
  selectedPathways: SpecialistPathwayDefinition[];
  highlightedPathwayIds: Set<string>;
  highlightedLessonIds: Set<string>;
  recommendedTopicIds: Set<string>;
  domainTopicIds: Set<string>;
  foundationCompletedCount: number;
  foundationTotalCount: number;
  foundationsPending: boolean;
  recommendedNextActions: RecommendedLessonAction[];
  recommendedTopics: RecommendedTopicItem[];
  lockedPathwayTargets: LockedPathwayTarget[];
  recommendedCapstones: RecommendedCapstoneItem[];
}

interface JourneyLessonLocation {
  stage: JourneyStageDefinition;
  topic: JourneyTopicDefinition;
}

function buildJourneyLessonLocationMap(
  stages: JourneyStageDefinition[]
): Map<string, JourneyLessonLocation> {
  const map = new Map<string, JourneyLessonLocation>();
  for (const stage of stages) {
    for (const topic of stage.topics) {
      for (const lessonId of topic.lessonIds) {
        map.set(lessonId, { stage, topic });
      }
    }
  }
  return map;
}

/**
 * Traverses prerequisite ancestors safely (cycle-guarded BFS) to find
 * unlocked prerequisite lessons that directly unlock a target lesson,
 * plus the specific target lesson they lead toward.
 */
function findUnlockedPrerequisitePath(
  targetLessonId: string,
  lessonIndex: Map<string, IndexedLessonEntry>,
  completedSet: Set<string>,
  progress: UserProgress,
  curriculum: Tier[]
): {
  unlockedAncestors: string[];
} {
  const visited = new Set<string>();
  const queue: string[] = [targetLessonId];
  const unlockedAncestors: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const entry = lessonIndex.get(currentId);
    if (!entry) continue;

    for (const rawPrereq of entry.lesson.prerequisites || []) {
      const prereqId = resolveCanonicalLessonId(rawPrereq);
      if (completedSet.has(prereqId)) continue;
      const prereqEntry = lessonIndex.get(prereqId);
      if (!prereqEntry) continue;

      if (isLessonUnlocked(prereqEntry.lesson, progress, curriculum)) {
        if (!unlockedAncestors.includes(prereqId)) {
          unlockedAncestors.push(prereqId);
        }
      } else if (!visited.has(prereqId)) {
        queue.push(prereqId);
      }
    }
  }

  return { unlockedAncestors };
}

export function computePersonalizedRecommendations(
  profile: LearningProfile | undefined | null,
  curriculum: Tier[],
  progress: UserProgress,
  capstoneProgress: CapstoneProgressMap = {},
  stages: JourneyStageDefinition[] = JOURNEY_STAGES,
  pathways: SpecialistPathwayDefinition[] = SPECIALIST_PATHWAYS
): PersonalizedRecommendations {
  const selectedIds = new Set(profile?.interests || []);
  const selectedPathways = pathways.filter((p) => selectedIds.has(p.id));

  if (selectedPathways.length === 0 || curriculum.length === 0) {
    return {
      isPersonalized: false,
      selectedPathways: [],
      highlightedPathwayIds: new Set(),
      highlightedLessonIds: new Set(),
      recommendedTopicIds: new Set(),
      domainTopicIds: new Set(),
      foundationCompletedCount: 0,
      foundationTotalCount: 0,
      foundationsPending: true,
      recommendedNextActions: [],
      recommendedTopics: [],
      lockedPathwayTargets: [],
      recommendedCapstones: [],
    };
  }

  const lessonIndex = indexCurriculumLessons(curriculum);
  const completedSet = getCanonicalCompletedSet(progress, curriculum);
  const locationMap = buildJourneyLessonLocationMap(stages);

  // Measure shared Stage 1-3 foundations cleanly
  let foundationTotalCount = 0;
  let foundationCompletedCount = 0;
  for (const stage of stages) {
    if (stage.order > 3) continue;
    for (const topic of stage.topics) {
      for (const lid of topic.lessonIds) {
        const entry = lessonIndex.get(lid);
        if (!entry || entry.lesson.required === false) continue;
        foundationTotalCount++;
        if (completedSet.has(lid)) foundationCompletedCount++;
      }
    }
  }
  const foundationsPending = foundationCompletedCount < foundationTotalCount;

  // Map every pathway-referenced lesson to the selected pathways requesting it
  const lessonToPathways = new Map<string, SpecialistPathwayDefinition[]>();
  const highlightedLessonIds = new Set<string>();
  const domainLessonIds = new Set<string>();

  for (const pathway of selectedPathways) {
    const allIds = [
      ...pathway.sharedFoundationLessonIds,
      ...pathway.stage4IntroLessonIds,
      ...pathway.stage5AdvancedLessonIds,
    ];
    for (const lid of allIds) {
      if (!lessonIndex.has(lid)) continue;
      highlightedLessonIds.add(lid);
      const list = lessonToPathways.get(lid) || [];
      if (!list.some((p) => p.id === pathway.id)) {
        list.push(pathway);
      }
      lessonToPathways.set(lid, list);
    }
    for (const lid of [...pathway.stage4IntroLessonIds, ...pathway.stage5AdvancedLessonIds]) {
      if (lessonIndex.has(lid)) {
        domainLessonIds.add(lid);
      }
    }
  }

  // Track unlocked prerequisite ancestors leading toward locked domain/pathway lessons
  const prereqLeadTargetMap = new Map<
    string,
    { targetTitles: string[]; pathways: SpecialistPathwayDefinition[] }
  >();

  for (const pathway of selectedPathways) {
    const pathwayTargets = [
      ...pathway.stage4IntroLessonIds,
      ...pathway.stage5AdvancedLessonIds,
      ...pathway.sharedFoundationLessonIds,
    ];
    for (const targetId of pathwayTargets) {
      if (completedSet.has(targetId)) continue;
      const entry = lessonIndex.get(targetId);
      if (!entry) continue;
      if (isLessonUnlocked(entry.lesson, progress, curriculum)) continue;

      const { unlockedAncestors } = findUnlockedPrerequisitePath(
        targetId,
        lessonIndex,
        completedSet,
        progress,
        curriculum
      );
      for (const ancestorId of unlockedAncestors) {
        const existing = prereqLeadTargetMap.get(ancestorId) || {
          targetTitles: [],
          pathways: [],
        };
        if (!existing.targetTitles.includes(entry.lesson.title)) {
          existing.targetTitles.push(entry.lesson.title);
        }
        if (!existing.pathways.some((p) => p.id === pathway.id)) {
          existing.pathways.push(pathway);
        }
        prereqLeadTargetMap.set(ancestorId, existing);
      }
    }
  }

  // Build candidate unlocked, uncompleted next actions (NEVER locked, NEVER already completed)
  const actionCandidates: Array<RecommendedLessonAction & { score: number }> = [];
  const addedActionIds = new Set<string>();

  const pushCandidate = (
    lessonId: string,
    reasonKind: RecommendedLessonAction['reasonKind'],
    reason: string,
    candidatePathways: SpecialistPathwayDefinition[],
    priorityScore: number
  ) => {
    if (addedActionIds.has(lessonId) || completedSet.has(lessonId)) return;
    const entry = lessonIndex.get(lessonId);
    const loc = locationMap.get(lessonId);
    if (!entry || !loc) return;
    if (!isLessonUnlocked(entry.lesson, progress, curriculum)) return;

    addedActionIds.add(lessonId);
    const coreBonus = entry.lesson.required !== false ? 20 : 0;
    actionCandidates.push({
      lesson: entry.lesson,
      stageId: loc.stage.id,
      stageOrder: loc.stage.order,
      stageTitle: loc.stage.title,
      journeyTopicId: loc.topic.id,
      journeyTopicTitle: loc.topic.title,
      pathwayIds: candidatePathways.map((p) => p.id),
      pathwayTitles: candidatePathways.map((p) => p.title),
      reasonKind,
      reason,
      unlocked: true,
      completed: false,
      score: priorityScore + coreBonus,
    });
  };

  // 1. Unlocked Stage 4 / Stage 5 lessons in selected pathways
  for (const lessonId of domainLessonIds) {
    if (completedSet.has(lessonId)) continue;
    const entry = lessonIndex.get(lessonId);
    if (!entry || !isLessonUnlocked(entry.lesson, progress, curriculum)) continue;
    const reqPathways = lessonToPathways.get(lessonId) || selectedPathways;
    const isBeginnerPendingFoundations =
      profile?.experienceLevel === 'beginner' && foundationsPending;
    const loc = locationMap.get(lessonId);
    const stageScore = loc?.stage.order === 4 ? 95 : 85;
    pushCandidate(
      lessonId,
      'pathway_lesson',
      `Direct domain module for ${reqPathways.map((p) => p.title).join(' & ')}`,
      reqPathways,
      isBeginnerPendingFoundations ? stageScore - 30 : stageScore
    );
  }

  // 2. Unlocked shared foundation lessons directly listed in selected pathways
  for (const [lessonId, reqPathways] of lessonToPathways.entries()) {
    if (domainLessonIds.has(lessonId) || completedSet.has(lessonId)) continue;
    const entry = lessonIndex.get(lessonId);
    if (!entry || !isLessonUnlocked(entry.lesson, progress, curriculum)) continue;
    const leadInfo = prereqLeadTargetMap.get(lessonId);
    const targetPreview = leadInfo?.targetTitles[0];
    pushCandidate(
      lessonId,
      leadInfo ? 'shared_foundation_prerequisite' : 'shared_foundation',
      targetPreview
        ? `Shared foundation for ${reqPathways.map((p) => p.title).join(' & ')} — helps unlock ${targetPreview}`
        : `Core shared foundation emphasized by ${reqPathways.map((p) => p.title).join(' & ')}`,
      reqPathways,
      profile?.experienceLevel === 'beginner' ? 110 : 80
    );
  }

  // 3. Unlocked critical-path prerequisite lessons from Stages 1-3 reaching selected pathway targets
  for (const [ancestorId, leadInfo] of prereqLeadTargetMap.entries()) {
    if (completedSet.has(ancestorId)) continue;
    const targetPreview = leadInfo.targetTitles.slice(0, 2).join(', ');
    pushCandidate(
      ancestorId,
      'shared_foundation_prerequisite',
      `Prerequisite foundation step toward ${targetPreview} (${leadInfo.pathways
        .map((p) => p.title)
        .join(' & ')})`,
      leadInfo.pathways,
      profile?.experienceLevel === 'beginner' ? 105 : 75
    );
  }

  // 4. Deterministic fallback: if no pathway-specific node is currently unlocked yet, suggest the canonical unlocked journey next step
  if (actionCandidates.length === 0) {
    const fallbackNext = getJourneyRecommendedNext(curriculum, progress, stages);
    if (
      fallbackNext &&
      !completedSet.has(fallbackNext.lesson.id) &&
      isLessonUnlocked(fallbackNext.lesson, progress, curriculum)
    ) {
      pushCandidate(
        fallbackNext.lesson.id,
        'shared_foundation',
        `Next unlocked Stage ${fallbackNext.stageOrder} foundation step before branching into ${selectedPathways
          .map((p) => p.title)
          .join(' & ')}`,
        selectedPathways,
        50
      );
    }
  }

  actionCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.stageOrder - b.stageOrder;
  });

  const recommendedNextActions: RecommendedLessonAction[] = actionCandidates
    .slice(0, 4)
    .map(({ score: _score, ...action }) => action);

  // Collect locked pathway target previews (explicitly NOT immediately playable)
  const lockedPathwayTargets: LockedPathwayTarget[] = [];
  for (const pathway of selectedPathways) {
    for (const lid of [...pathway.stage4IntroLessonIds, ...pathway.stage5AdvancedLessonIds]) {
      if (completedSet.has(lid)) continue;
      if (lockedPathwayTargets.some((item) => item.lesson.id === lid)) continue;
      const entry = lessonIndex.get(lid);
      const loc = locationMap.get(lid);
      if (!entry || !loc) continue;
      if (isLessonUnlocked(entry.lesson, progress, curriculum)) continue;

      const missingPrerequisites = getMissingPrerequisites(entry.lesson, progress, curriculum);
      const { unlockedAncestors } = findUnlockedPrerequisitePath(
        lid,
        lessonIndex,
        completedSet,
        progress,
        curriculum
      );
      const entryId = unlockedAncestors[0];
      const entryLesson = entryId ? lessonIndex.get(entryId)?.lesson : undefined;

      lockedPathwayTargets.push({
        lesson: entry.lesson,
        stageId: loc.stage.id,
        stageOrder: loc.stage.order,
        journeyTopicId: loc.topic.id,
        journeyTopicTitle: loc.topic.title,
        pathwayTitle: pathway.title,
        missingPrerequisites,
        unlockedEntryLesson: entryLesson
          ? { id: entryLesson.id, title: entryLesson.title }
          : null,
      });

      if (lockedPathwayTargets.length >= 4) break;
    }
    if (lockedPathwayTargets.length >= 4) break;
  }

  // Collect recommended Journey Topics across Stage 4/5 + any Stages 1-3 foundation bridge topics
  const recommendedTopics: RecommendedTopicItem[] = [];
  const recommendedTopicIds = new Set<string>();
  const domainTopicIds = new Set<string>();
  const nextPrereqSet = new Set(recommendedNextActions.map((a) => a.lesson.id));

  for (const stage of stages) {
    for (const topic of stage.topics) {
      const matchingDomainLessons = topic.lessonIds.filter((id) => domainLessonIds.has(id));
      const matchingBridgeLessons = topic.lessonIds.filter(
        (id) =>
          (highlightedLessonIds.has(id) || nextPrereqSet.has(id)) && !completedSet.has(id)
      );

      const isDomainMatch = stage.order >= 4 && matchingDomainLessons.length > 0;
      const isFoundationBridge = stage.order <= 3 && matchingBridgeLessons.length > 0;

      if (!isDomainMatch && !isFoundationBridge) continue;

      let completedCount = 0;
      let unlockedCount = 0;
      const pathwayTitleSet = new Set<string>();

      for (const lid of topic.lessonIds) {
        if (completedSet.has(lid)) completedCount++;
        const entry = lessonIndex.get(lid);
        if (entry && isLessonUnlocked(entry.lesson, progress, curriculum)) {
          unlockedCount++;
        }
        for (const pw of lessonToPathways.get(lid) || []) {
          pathwayTitleSet.add(pw.title);
        }
      }

      if (pathwayTitleSet.size === 0) {
        for (const act of recommendedNextActions) {
          if (act.journeyTopicId === topic.id) {
            for (const title of act.pathwayTitles) pathwayTitleSet.add(title);
          }
        }
      }

      if (isDomainMatch) {
        domainTopicIds.add(topic.id);
      }
      recommendedTopicIds.add(topic.id);

      recommendedTopics.push({
        stageId: stage.id,
        stageOrder: stage.order,
        stageTitle: stage.title,
        topic,
        pathwayTitles: Array.from(pathwayTitleSet),
        matchedLessonCount: isDomainMatch
          ? matchingDomainLessons.length
          : matchingBridgeLessons.length,
        completedCount,
        totalCount: topic.lessonIds.length,
        unlockedCount,
        isFoundationBridge,
        reason: isDomainMatch
          ? `Explore ${Array.from(pathwayTitleSet).join(' & ')} concepts in Stage ${stage.order}`
          : `Contains shared foundations supporting your selected interests`,
      });
    }
  }

  recommendedTopics.sort((a, b) => {
    if (a.isFoundationBridge !== b.isFoundationBridge) {
      return a.isFoundationBridge ? 1 : -1;
    }
    if (b.matchedLessonCount !== a.matchedLessonCount) {
      return b.matchedLessonCount - a.matchedLessonCount;
    }
    return a.stageOrder - b.stageOrder;
  });

  // Compute recommended Guided Capstones matching selected pathways
  const capstoneIdsOrdered = new Set<string>();
  for (const pw of selectedPathways) {
    for (const cid of pw.capstoneIds) {
      capstoneIdsOrdered.add(cid);
    }
  }

  const recommendedCapstones: RecommendedCapstoneItem[] = [];
  for (const cid of capstoneIdsOrdered) {
    const ref = JOURNEY_CAPSTONE_REFERENCES.find((r) => r.id === cid);
    if (!ref) continue;
    const matchingPathwayTitles = selectedPathways
      .filter((p) => p.capstoneIds.includes(cid))
      .map((p) => p.title);
    const reqIds = CAPSTONE_PREREQUISITE_MAP[cid] || [];
    const missingPrerequisites: PrerequisiteInfo[] = [];

    for (const pid of reqIds) {
      if (!completedSet.has(pid)) {
        const entry = lessonIndex.get(pid);
        missingPrerequisites.push({
          id: pid,
          title: entry ? entry.lesson.title : pid,
          tierNumber: entry ? entry.tierNumber : 1,
          topicTitle: entry ? entry.topicTitle : 'Foundations',
        });
      }
    }

    recommendedCapstones.push({
      reference: ref,
      pathwayTitles: matchingPathwayTitles,
      ready: missingPrerequisites.length === 0,
      completed: Boolean(capstoneProgress[cid]?.completedAt),
      missingPrerequisites,
    });
  }

  return {
    isPersonalized: true,
    selectedPathways,
    highlightedPathwayIds: selectedIds,
    highlightedLessonIds,
    recommendedTopicIds,
    domainTopicIds,
    foundationCompletedCount,
    foundationTotalCount,
    foundationsPending,
    recommendedNextActions,
    recommendedTopics,
    lockedPathwayTargets,
    recommendedCapstones,
  };
}
