import { ACADEMY_CURRICULUM } from '../data/curriculum.ts';
import { ACADEMY_CAPSTONES } from '../data/capstones.ts';
import { indexCurriculumLessons, PrerequisiteInfo } from '../lib/curriculumProgress.ts';
import {
  CapstoneAccountProgress,
  CapstoneEvidenceVerifyResponse,
  CapstoneProgressMap,
  CapstoneProject,
  CapstoneStage,
  CapstoneStageAccountProgress,
  CapstoneStageCheckResponse,
  CapstoneSubmitResponse,
  PublicCapstonesPayload,
} from '../types';
import { AccountRecord, computeUserLevelAndRank } from './migration';

let cachedPublicCapstones: PublicCapstonesPayload | null = null;

function sanitizeCapstoneForClient(cap: CapstoneProject): CapstoneProject {
  return {
    id: cap.id,
    code: cap.code,
    title: cap.title,
    roleTitle: cap.roleTitle,
    difficulty: cap.difficulty,
    estimatedMinutes: cap.estimatedMinutes,
    xpReward: cap.xpReward,
    scenarioOverview: cap.scenarioOverview,
    objectives: [...cap.objectives],
    prerequisiteLessonIds: [...cap.prerequisiteLessonIds],
    recommendedLessonIds: [...cap.recommendedLessonIds],
    backgroundBriefing: cap.backgroundBriefing,
    evidenceArtifacts: cap.evidenceArtifacts.map((art) => ({
      id: art.id,
      title: art.title,
      kind: art.kind,
      summary: art.summary,
      content: art.content,
      targetLineCount: art.targetLineNumbers ? art.targetLineNumbers.length : 0,
      ...(art.evidenceHints ? { evidenceHints: [...art.evidenceHints] } : {}),
    })),
    stages: cap.stages.map((st) => ({
      id: st.id,
      order: st.order,
      title: st.title,
      objective: st.objective,
      guidance: st.guidance,
      practicalTaskPrompt: st.practicalTaskPrompt,
      evidenceArtifactIds: [...st.evidenceArtifactIds],
      xpReward: st.xpReward,
      knowledgeCheck: {
        id: st.knowledgeCheck.id,
        prompt: st.knowledgeCheck.prompt,
        options: [...st.knowledgeCheck.options],
        ...(st.knowledgeCheck.reviewLessonId
          ? { reviewLessonId: st.knowledgeCheck.reviewLessonId }
          : {}),
      },
    })),
    submissionRequirements: [...cap.submissionRequirements],
    deliverableTemplate: {
      title: cap.deliverableTemplate.title,
      instructions: cap.deliverableTemplate.instructions,
      minimumCharacters: cap.deliverableTemplate.minimumCharacters,
      sections: cap.deliverableTemplate.sections.map((s) => ({ ...s })),
    },
    rubricCriteria: cap.rubricCriteria.map((rc) => ({
      id: rc.id,
      label: rc.label,
      maxPoints: rc.maxPoints,
      description: rc.description,
    })),
    reflectionPrompts: [...cap.reflectionPrompts],
    recommendedNextLessonIds: [...cap.recommendedNextLessonIds],
  };
}

export function getPublicCapstonesPayload(): PublicCapstonesPayload {
  if (cachedPublicCapstones) {
    return cachedPublicCapstones;
  }
  cachedPublicCapstones = {
    capstones: ACADEMY_CAPSTONES.map(sanitizeCapstoneForClient),
  };
  return cachedPublicCapstones;
}

export function getCapstoneById(capstoneId: string): CapstoneProject | undefined {
  return ACADEMY_CAPSTONES.find((c) => c.id === capstoneId);
}

export function getMissingCapstonePrerequisites(
  capstone: CapstoneProject,
  completedLessonIds: string[]
): PrerequisiteInfo[] {
  const completedSet = new Set(completedLessonIds || []);
  const lessonIndex = indexCurriculumLessons(ACADEMY_CURRICULUM);
  const missing: PrerequisiteInfo[] = [];

  for (const prereqId of capstone.prerequisiteLessonIds) {
    if (!completedSet.has(prereqId)) {
      const entry = lessonIndex.get(prereqId);
      if (entry) {
        missing.push({
          id: entry.lesson.id,
          title: entry.lesson.title,
          tierNumber: entry.tierNumber,
          topicTitle: entry.topicTitle,
        });
      }
    }
  }
  return missing;
}

function ensureCapstoneRecord(
  account: AccountRecord,
  capstone: CapstoneProject
): CapstoneAccountProgress {
  if (!account.capstoneProgress) {
    account.capstoneProgress = {};
  }
  let rec = account.capstoneProgress[capstone.id];
  if (!rec) {
    const stagesMap: Record<string, CapstoneStageAccountProgress> = {};
    for (const st of capstone.stages) {
      stagesMap[st.id] = {
        evidenceVerified: false,
        verifiedEvidenceIds: [],
        knowledgeCheckPassed: false,
      };
    }
    rec = {
      capstoneId: capstone.id,
      currentStageId: capstone.stages[0]?.id || '',
      stages: stagesMap,
      reportSubmitted: false,
    };
    account.capstoneProgress[capstone.id] = rec;
  } else {
    for (const st of capstone.stages) {
      if (!rec.stages[st.id]) {
        rec.stages[st.id] = {
          evidenceVerified: false,
          verifiedEvidenceIds: [],
          knowledgeCheckPassed: false,
        };
      }
    }
  }
  return rec;
}

function getAllVerifiedArtifactIds(rec: CapstoneAccountProgress): Set<string> {
  const verified = new Set<string>();
  for (const st of Object.values(rec.stages || {})) {
    for (const artId of st.verifiedEvidenceIds || []) {
      verified.add(artId);
    }
  }
  return verified;
}

function syncStageEvidenceFlags(rec: CapstoneAccountProgress, capstone: CapstoneProject): void {
  const globalVerified = getAllVerifiedArtifactIds(rec);
  for (const st of capstone.stages) {
    const stProg = rec.stages[st.id];
    if (!stProg) continue;
    const verifiedHere = st.evidenceArtifactIds.filter(
      (aid) => globalVerified.has(aid) || stProg.verifiedEvidenceIds.includes(aid)
    );
    stProg.verifiedEvidenceIds = Array.from(new Set([...stProg.verifiedEvidenceIds, ...verifiedHere]));
    const artifactsRequiringLineSelection = st.evidenceArtifactIds.filter((aid) => {
      const art = capstone.evidenceArtifacts.find((a) => a.id === aid);
      return Boolean(art?.targetLineNumbers && art.targetLineNumbers.length > 0);
    });
    stProg.evidenceVerified = artifactsRequiringLineSelection.every((aid) =>
      stProg.verifiedEvidenceIds.includes(aid)
    );
  }
}

export function getSanitizedCapstoneProgressForUser(account: AccountRecord): CapstoneProgressMap {
  const out: CapstoneProgressMap = {};
  const raw = account.capstoneProgress || {};
  for (const cap of ACADEMY_CAPSTONES) {
    const rec = raw[cap.id];
    if (!rec) continue;
    const passed = Boolean(rec.completedAt);
    out[cap.id] = {
      capstoneId: cap.id,
      currentStageId: rec.currentStageId || cap.stages[0]?.id || '',
      stages: Object.fromEntries(
        cap.stages.map((st) => {
          const stState = rec.stages?.[st.id];
          return [
            st.id,
            {
              evidenceVerified: Boolean(stState?.evidenceVerified),
              verifiedEvidenceIds: [...(stState?.verifiedEvidenceIds || [])],
              knowledgeCheckPassed: Boolean(stState?.knowledgeCheckPassed),
              ...(stState?.completedAt ? { completedAt: stState.completedAt } : {}),
            },
          ];
        })
      ),
      reportSubmitted: Boolean(rec.reportSubmitted),
      ...(typeof rec.reportScore === 'number' ? { reportScore: rec.reportScore } : {}),
      ...(typeof rec.maxReportScore === 'number' ? { maxReportScore: rec.maxReportScore } : {}),
      ...(Array.isArray(rec.rubricBreakdown) ? { rubricBreakdown: rec.rubricBreakdown } : {}),
      ...(rec.lastSubmissionSections ? { lastSubmissionSections: { ...rec.lastSubmissionSections } } : {}),
      ...(passed && cap.detailedSolutionExplanation
        ? { detailedSolutionExplanation: cap.detailedSolutionExplanation }
        : {}),
      ...(rec.completedAt ? { completedAt: rec.completedAt } : {}),
    };
  }
  return out;
}

function grantCapstoneXpOnce(
  account: AccountRecord,
  eventKey: string,
  xpAmount: number
): number {
  if (xpAmount <= 0) return 0;
  const events = account.progress.awardedXpEventIds || [];
  if (events.includes(eventKey)) {
    return 0;
  }
  events.push(eventKey);
  account.progress.awardedXpEventIds = events;
  const nextXp = (account.user.xp || 0) + xpAmount;
  const { level, rank } = computeUserLevelAndRank(nextXp, account.user.rank);
  account.user.xp = nextXp;
  account.user.level = level;
  account.user.rank = rank;
  account.progress.xp = nextXp;
  account.progress.updatedAt = new Date().toISOString();
  return xpAmount;
}

export function processCapstoneEvidenceVerification(
  account: AccountRecord,
  capstoneId: unknown,
  stageId: unknown,
  artifactId: unknown,
  selectedLines: unknown
):
  | { ok: true; data: CapstoneEvidenceVerifyResponse; timelineAction?: string; dbChanged: boolean }
  | { ok: false; status: number; error: string; missingPrerequisites?: PrerequisiteInfo[] } {
  if (typeof capstoneId !== 'string' || !capstoneId.trim()) {
    return { ok: false, status: 400, error: 'Valid capstoneId is required.' };
  }
  const capstone = getCapstoneById(capstoneId.trim());
  if (!capstone) {
    return { ok: false, status: 404, error: `Capstone "${capstoneId}" was not found.` };
  }

  const missingPrereqs = getMissingCapstonePrerequisites(
    capstone,
    account.progress?.completedLessonIds || []
  );
  if (missingPrereqs.length > 0) {
    return {
      ok: false,
      status: 403,
      error: `Capstone "${capstone.title}" is locked until prerequisite lessons are completed.`,
      missingPrerequisites: missingPrereqs,
    };
  }

  if (typeof stageId !== 'string' || !stageId.trim()) {
    return { ok: false, status: 400, error: 'Valid stageId is required.' };
  }
  const stage: CapstoneStage | undefined = capstone.stages.find((s) => s.id === stageId.trim());
  if (!stage) {
    return { ok: false, status: 404, error: `Stage "${stageId}" not found in capstone "${capstone.id}".` };
  }

  if (typeof artifactId !== 'string' || !stage.evidenceArtifactIds.includes(artifactId.trim())) {
    return { ok: false, status: 400, error: `Evidence artifact "${String(artifactId)}" is not part of this stage.` };
  }
  const artifact = capstone.evidenceArtifacts.find((a) => a.id === artifactId.trim());
  if (!artifact) {
    return { ok: false, status: 404, error: 'Evidence artifact not found.' };
  }

  if (!Array.isArray(selectedLines)) {
    return { ok: false, status: 400, error: 'selectedLines array of integers is required.' };
  }

  const maxLine = Math.max(1, artifact.content.split('\n').length);
  const selectedSet = new Set<number>();
  for (const n of selectedLines) {
    if (typeof n !== 'number' || !Number.isInteger(n) || n < 1 || n > maxLine) {
      return { ok: false, status: 400, error: `Line selections must be integers between 1 and ${maxLine}.` };
    }
    selectedSet.add(n);
  }

  const expected = [...(artifact.targetLineNumbers || [])].sort((a, b) => a - b);
  if (selectedSet.size !== expected.length) {
    return {
      ok: false,
      status: 400,
      error: `Select exactly ${expected.length} high-signal evidence line${expected.length === 1 ? '' : 's'} for this artifact.`,
    };
  }

  const sortedSelected = Array.from(selectedSet).sort((a, b) => a - b);
  const matched = sortedSelected.every((v, idx) => v === expected[idx]);

  const rec = ensureCapstoneRecord(account, capstone);
  rec.currentStageId = stage.id;
  syncStageEvidenceFlags(rec, capstone);

  if (!matched) {
    return {
      ok: true,
      dbChanged: false,
      data: {
        capstoneId: capstone.id,
        stageId: stage.id,
        artifactId: artifact.id,
        verified: false,
        xpAwarded: 0,
        message: 'Selected lines do not match the key forensic/security indicators in this artifact. Check the stage guidance and hints.',
        stageProgress: rec.stages[stage.id],
        capstoneProgress: getSanitizedCapstoneProgressForUser(account)[capstone.id] || rec,
      },
    };
  }

  const stProg = rec.stages[stage.id];
  if (!stProg.verifiedEvidenceIds.includes(artifact.id)) {
    stProg.verifiedEvidenceIds.push(artifact.id);
  }
  syncStageEvidenceFlags(rec, capstone);

  let xpAwarded = 0;
  let timelineAction: string | undefined;
  if (stProg.evidenceVerified && stProg.knowledgeCheckPassed && !stProg.completedAt) {
    stProg.completedAt = new Date().toISOString();
    xpAwarded = grantCapstoneXpOnce(
      account,
      `capstone_stage:${capstone.id}:${stage.id}`,
      stage.xpReward
    );
    if (xpAwarded > 0) {
      timelineAction = `completed ${capstone.title} (${stage.title})`;
    }
  }

  return {
    ok: true,
    dbChanged: true,
    timelineAction,
    data: {
      capstoneId: capstone.id,
      stageId: stage.id,
      artifactId: artifact.id,
      verified: true,
      xpAwarded,
      message: 'Evidence indicators verified! Proceed to the Stage Knowledge Check below.',
      stageProgress: rec.stages[stage.id],
      capstoneProgress: getSanitizedCapstoneProgressForUser(account)[capstone.id] || rec,
      user: account.user,
      progress: account.progress,
    },
  };
}

export function processCapstoneStageCheck(
  account: AccountRecord,
  capstoneId: unknown,
  stageId: unknown,
  selectedOption: unknown
):
  | { ok: true; data: CapstoneStageCheckResponse; timelineAction?: string; dbChanged: boolean }
  | { ok: false; status: number; error: string; missingPrerequisites?: PrerequisiteInfo[] } {
  if (typeof capstoneId !== 'string' || !capstoneId.trim()) {
    return { ok: false, status: 400, error: 'Valid capstoneId is required.' };
  }
  const capstone = getCapstoneById(capstoneId.trim());
  if (!capstone) {
    return { ok: false, status: 404, error: `Capstone "${capstoneId}" was not found.` };
  }

  const missingPrereqs = getMissingCapstonePrerequisites(
    capstone,
    account.progress?.completedLessonIds || []
  );
  if (missingPrereqs.length > 0) {
    return {
      ok: false,
      status: 403,
      error: `Capstone "${capstone.title}" is locked until prerequisite lessons are completed.`,
      missingPrerequisites: missingPrereqs,
    };
  }

  if (typeof stageId !== 'string' || !stageId.trim()) {
    return { ok: false, status: 400, error: 'Valid stageId is required.' };
  }
  const stage = capstone.stages.find((s) => s.id === stageId.trim());
  if (!stage) {
    return { ok: false, status: 404, error: `Stage "${stageId}" was not found.` };
  }

  const rec = ensureCapstoneRecord(account, capstone);
  rec.currentStageId = stage.id;
  syncStageEvidenceFlags(rec, capstone);
  const stProg = rec.stages[stage.id];

  if (!stProg.evidenceVerified) {
    return {
      ok: false,
      status: 400,
      error: 'Verify the stage evidence artifact lines before submitting the stage knowledge check.',
    };
  }

  if (
    typeof selectedOption !== 'number' ||
    !Number.isInteger(selectedOption) ||
    selectedOption < 0 ||
    selectedOption >= stage.knowledgeCheck.options.length
  ) {
    return { ok: false, status: 400, error: 'Valid selectedOption index is required.' };
  }

  const correct = selectedOption === stage.knowledgeCheck.correctIndex;
  if (!correct) {
    const isPartial = Array.isArray(stage.knowledgeCheck.partialCreditIndices)
      ? stage.knowledgeCheck.partialCreditIndices.includes(selectedOption)
      : false;
    const feedback =
      stage.knowledgeCheck.optionFeedback?.[selectedOption] ||
      'That reasoning misses a key signal in the stage evidence. Re-inspect the flagged lines.';
    return {
      ok: true,
      dbChanged: false,
      data: {
        capstoneId: capstone.id,
        stageId: stage.id,
        correct: false,
        xpAwarded: 0,
        misconceptionFeedback: feedback,
        selectedReasoningStatus: isPartial ? 'partially_correct' : 'incorrect',
        stageProgress: stProg,
        capstoneProgress: getSanitizedCapstoneProgressForUser(account)[capstone.id] || rec,
      },
    };
  }

  stProg.knowledgeCheckPassed = true;
  if (!stProg.completedAt) {
    stProg.completedAt = new Date().toISOString();
  }

  // Advance pointer cleanly to next incomplete stage if available, while still permitting free revisit
  const nextStage = capstone.stages.find(
    (s) => s.order > stage.order && !rec.stages[s.id]?.knowledgeCheckPassed
  );
  if (nextStage) {
    rec.currentStageId = nextStage.id;
  }

  const xpAwarded = grantCapstoneXpOnce(
    account,
    `capstone_stage:${capstone.id}:${stage.id}`,
    stage.xpReward
  );
  const timelineAction =
    xpAwarded > 0 ? `completed stage ${stage.order} of ${capstone.title}` : undefined;

  return {
    ok: true,
    dbChanged: true,
    timelineAction,
    data: {
      capstoneId: capstone.id,
      stageId: stage.id,
      correct: true,
      xpAwarded,
      explanation: stage.knowledgeCheck.explanation,
      stageProgress: stProg,
      capstoneProgress: getSanitizedCapstoneProgressForUser(account)[capstone.id] || rec,
      user: account.user,
      progress: account.progress,
    },
  };
}

export function processCapstoneReportSubmission(
  account: AccountRecord,
  capstoneId: unknown,
  sections: unknown
):
  | { ok: true; data: CapstoneSubmitResponse; timelineAction?: string; dbChanged: boolean }
  | { ok: false; status: number; error: string; missingPrerequisites?: PrerequisiteInfo[] } {
  if (typeof capstoneId !== 'string' || !capstoneId.trim()) {
    return { ok: false, status: 400, error: 'Valid capstoneId is required.' };
  }
  const capstone = getCapstoneById(capstoneId.trim());
  if (!capstone) {
    return { ok: false, status: 404, error: `Capstone "${capstoneId}" was not found.` };
  }

  const missingPrereqs = getMissingCapstonePrerequisites(
    capstone,
    account.progress?.completedLessonIds || []
  );
  if (missingPrereqs.length > 0) {
    return {
      ok: false,
      status: 403,
      error: `Capstone "${capstone.title}" is locked until prerequisite lessons are completed.`,
      missingPrerequisites: missingPrereqs,
    };
  }

  const rec = ensureCapstoneRecord(account, capstone);
  syncStageEvidenceFlags(rec, capstone);

  const incompleteStages = capstone.stages.filter(
    (st) => !rec.stages[st.id]?.evidenceVerified || !rec.stages[st.id]?.knowledgeCheckPassed
  );
  if (incompleteStages.length > 0) {
    return {
      ok: false,
      status: 400,
      error: `Complete all investigation stages first (${incompleteStages.map((s) => s.title).join(', ')}) before submitting the final deliverable.`,
    };
  }

  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) {
    return { ok: false, status: 400, error: 'Deliverable report sections object is required.' };
  }

  const sectionRecord = sections as Record<string, unknown>;
  const cleanedSections: Record<string, string> = {};
  let totalChars = 0;

  for (const secDef of capstone.deliverableTemplate.sections) {
    const val = sectionRecord[secDef.key];
    if (typeof val !== 'string' || val.trim().length < 15) {
      return {
        ok: false,
        status: 400,
        error: `Provide a substantive response (>= 15 characters) for "${secDef.label}".`,
      };
    }
    const trimmed = val.trim().slice(0, 6000);
    cleanedSections[secDef.key] = trimmed;
    totalChars += trimmed.length;
  }

  if (totalChars < capstone.deliverableTemplate.minimumCharacters) {
    return {
      ok: false,
      status: 400,
      error: `Final report is too brief (${totalChars}/${capstone.deliverableTemplate.minimumCharacters} characters minimum). Expand with specific artifacts and remediation controls.`,
    };
  }

  const combinedNormalized = Object.values(cleanedSections).join('\n').toLowerCase();
  const rubricBreakdown: CapstoneSubmitResponse['rubricBreakdown'] = [];
  let totalScore = 0;
  let maxScore = 0;

  for (const criterion of capstone.rubricCriteria) {
    maxScore += criterion.maxPoints;
    const expected = criterion.expectedKeywords || [];
    const matchedKeywords = expected.filter((kw) => combinedNormalized.includes(kw.toLowerCase()));
    const missingKeywords = expected.filter((kw) => !combinedNormalized.includes(kw.toLowerCase()));

    const ratio = expected.length > 0 ? matchedKeywords.length / expected.length : 1;
    // Award proportional points grounded strictly in evidence/control concepts covered
    let pointsEarned = Math.round(criterion.maxPoints * Math.min(1, ratio * 1.15));
    if (matchedKeywords.length === expected.length) {
      pointsEarned = criterion.maxPoints;
    }

    totalScore += pointsEarned;
    rubricBreakdown.push({
      criterionId: criterion.id,
      label: criterion.label,
      pointsEarned,
      maxPoints: criterion.maxPoints,
      feedback:
        missingKeywords.length === 0
          ? `Strong coverage of ${criterion.label} (${matchedKeywords.join(', ')}).`
          : `Partial coverage (${pointsEarned}/${criterion.maxPoints}). Strengthen your analysis by explicitly addressing: ${missingKeywords.join(', ')}.`,
    });
  }

  const passingThreshold = Math.round(maxScore * 0.7);
  const passed = totalScore >= passingThreshold;

  rec.reportSubmitted = true;
  rec.reportScore = totalScore;
  rec.maxReportScore = maxScore;
  rec.rubricBreakdown = rubricBreakdown;
  rec.lastSubmissionSections = cleanedSections;

  let xpAwarded = 0;
  let timelineAction: string | undefined;
  if (passed) {
    if (!rec.completedAt) {
      rec.completedAt = new Date().toISOString();
    }
    xpAwarded = grantCapstoneXpOnce(
      account,
      `capstone_complete:${capstone.id}`,
      capstone.xpReward
    );
    if (xpAwarded > 0) {
      timelineAction = `completed Capstone ${capstone.code}: ${capstone.title}`;
    }
  }

  return {
    ok: true,
    dbChanged: true,
    timelineAction,
    data: {
      capstoneId: capstone.id,
      passed,
      score: totalScore,
      maxScore,
      xpAwarded,
      rubricBreakdown,
      ...(passed && capstone.detailedSolutionExplanation
        ? { detailedSolutionExplanation: capstone.detailedSolutionExplanation }
        : {}),
      capstoneProgress: getSanitizedCapstoneProgressForUser(account)[capstone.id] || rec,
      user: account.user,
      progress: account.progress,
    },
  };
}
