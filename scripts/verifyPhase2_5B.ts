import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { ACADEMY_CURRICULUM } from '../src/data/curriculum';
import { ACADEMY_CAPSTONES } from '../src/data/capstones';
import { ALL_PRACTICAL_LABS } from '../src/data/practicalLabs';
import {
  JOURNEY_CAPSTONE_REFERENCES,
  JOURNEY_STAGES,
  SPECIALIST_PATHWAYS,
} from '../src/data/journeyBlueprint';
import {
  indexCurriculumLessons,
  isLessonUnlocked,
  validateCurriculumGraph,
} from '../src/lib/curriculumProgress';
import {
  computeAllStageStats,
  computePathwayStats,
  getGlobalJourneyStats,
  getJourneyRecommendedNext,
} from '../src/lib/journeyProgress';
import { UserProgress } from '../src/types';
import { TestCookieClient } from './testHttpClient';

process.env.CFA_NO_LISTEN = '1';

const TEST_SECRET = 'phase2_5b_test_session_secret_material_32chars';

async function startTempServer(dbPath: string) {
  const { createApiApp } = await import('../server');
  const app = createApiApp(dbPath, {
    sessionSecret: TEST_SECRET,
    rateLimits: {
      exploreUserMax: 200,
      exploreUserWindowMs: 60_000,
      exploreIpMax: 300,
      exploreIpWindowMs: 60_000,
      assessmentUserMax: 300,
      assessmentUserWindowMs: 60_000,
      assessmentIpMax: 400,
      assessmentIpWindowMs: 60_000,
    },
  });
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address() as { port: number };
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

function makeEmptyProgress(): UserProgress {
  return {
    completedLessonIds: [],
    completedExerciseIds: [],
    completedQuizLessonIds: [],
    completedHomeworkLessonIds: [],
    xp: 0,
    streak: 0,
    lastActiveDate: null,
  };
}

async function runTests() {
  const rootDir = process.cwd();
  const results: Array<{ category: string; name: string; detail: string }> = [];
  const pass = (category: string, name: string, detail: string) => {
    results.push({ category, name, detail });
    console.log(`[PASS][${category}] ${name}: ${detail}`);
  };

  const labsByLesson: Record<string, (typeof ALL_PRACTICAL_LABS)[number]> = {};
  for (const lab of ALL_PRACTICAL_LABS) {
    labsByLesson[lab.lessonId] = lab;
  }

  // =========================================================================
  // 1-6: COMPLETE CANONICAL INVENTORY & MAPPING PRESERVATION
  // =========================================================================
  const graphReport = validateCurriculumGraph(ACADEMY_CURRICULUM, ALL_PRACTICAL_LABS);
  assert.equal(graphReport.valid, true, `Curriculum graph invalid: ${JSON.stringify(graphReport)}`);
  assert.equal(graphReport.tierCount, 11);
  assert.equal(graphReport.topicCount, 25);
  assert.equal(graphReport.lessonCount, 76);
  assert.equal(ALL_PRACTICAL_LABS.length, 76);

  const quizCount = ACADEMY_CURRICULUM.reduce(
    (sum, tier) =>
      sum + tier.topics.reduce((tSum, top) => tSum + top.lessons.reduce((lSum, l) => lSum + l.quiz.length, 0), 0),
    0
  );
  assert.equal(quizCount, 304);
  assert.equal(ACADEMY_CAPSTONES.length, 4);

  assert.equal(JOURNEY_STAGES.length, 5);
  const canonicalLessonIndex = indexCurriculumLessons(ACADEMY_CURRICULUM);
  const canonicalTopicIds = new Set(
    ACADEMY_CURRICULUM.flatMap((tier) => tier.topics.map((topic) => topic.id))
  );
  assert.equal(canonicalTopicIds.size, 25);

  const mappedLessons: string[] = [];
  const lessonToStageOrder = new Map<string, number>();
  const lessonToPosition = new Map<string, number>();
  const mappedCanonicalTopics = new Set<string>();

  for (const stage of JOURNEY_STAGES) {
    assert.ok(stage.topics.length >= 1, `Stage ${stage.id} has no topics`);
    for (const jTopic of stage.topics) {
      assert.ok(jTopic.canonicalTopicIds.length >= 1, `Journey topic ${jTopic.id} missing canonicalTopicIds`);
      for (const ctId of jTopic.canonicalTopicIds) {
        assert.ok(canonicalTopicIds.has(ctId), `Unknown canonicalTopicId ${ctId} in ${jTopic.id}`);
        mappedCanonicalTopics.add(ctId);
      }
      for (const lessonId of jTopic.lessonIds) {
        assert.ok(canonicalLessonIndex.has(lessonId), `Unknown lessonId ${lessonId} in ${jTopic.id}`);
        assert.ok(!lessonToStageOrder.has(lessonId), `Duplicate primary journey mapping for ${lessonId}`);
        lessonToPosition.set(lessonId, mappedLessons.length);
        lessonToStageOrder.set(lessonId, stage.order);
        mappedLessons.push(lessonId);
      }
    }
  }

  assert.equal(mappedLessons.length, 76, `Expected 76 mapped lessons, got ${mappedLessons.length}`);
  assert.equal(new Set(mappedLessons).size, 76);
  assert.equal(
    mappedCanonicalTopics.size,
    25,
    `Expected all 25 canonical topics mapped, got ${mappedCanonicalTopics.size}`
  );

  // Check capstones & pathways
  assert.equal(SPECIALIST_PATHWAYS.length, 8);
  assert.equal(JOURNEY_CAPSTONE_REFERENCES.length, 4);
  const capstoneIdSet = new Set(ACADEMY_CAPSTONES.map((c) => c.id));
  for (const ref of JOURNEY_CAPSTONE_REFERENCES) {
    assert.ok(capstoneIdSet.has(ref.id), `Capstone ref ${ref.id} missing from ACADEMY_CAPSTONES`);
  }
  for (const pathway of SPECIALIST_PATHWAYS) {
    for (const lid of [
      ...pathway.sharedFoundationLessonIds,
      ...pathway.stage4IntroLessonIds,
      ...pathway.stage5AdvancedLessonIds,
    ]) {
      assert.ok(canonicalLessonIndex.has(lid), `Pathway ${pathway.id} unknown lesson ${lid}`);
    }
    for (const cid of pathway.capstoneIds) {
      assert.ok(capstoneIdSet.has(cid), `Pathway ${pathway.id} unknown capstone ${cid}`);
    }
  }

  pass(
    'Curriculum Preservation',
    '11/25/76/76/304/4 Baseline & 5-Stage Mapping',
    'Verified 76/76 unique lessons, 25/25 canonical topics, 11 tiers, 76 labs, 304 quizzes, 8 pathways, and 4 capstones'
  );

  // =========================================================================
  // 8. ZERO CROSS-STAGE INVERSIONS OR INTRA-STAGE PREREQUISITE CONFLICTS
  // =========================================================================
  for (const [lessonId, entry] of canonicalLessonIndex.entries()) {
    const lessonStage = lessonToStageOrder.get(lessonId)!;
    const lessonPos = lessonToPosition.get(lessonId)!;
    for (const prereqId of entry.lesson.prerequisites || []) {
      const prereqStage = lessonToStageOrder.get(prereqId)!;
      const prereqPos = lessonToPosition.get(prereqId)!;
      assert.ok(
        prereqStage <= lessonStage,
        `Stage inversion: ${lessonId} (Stage ${lessonStage}) depends on ${prereqId} (Stage ${prereqStage})`
      );
      assert.ok(
        prereqPos < lessonPos,
        `Order conflict: ${lessonId} (pos ${lessonPos}) appears before prereq ${prereqId} (pos ${prereqPos})`
      );
    }
  }

  pass(
    'Topological Integrity',
    'Zero Cross-Stage Inversions or Order Conflicts',
    'All prerequisites appear strictly earlier across Stages 1-5 and within each topic sequence'
  );

  // =========================================================================
  // 9-11. DERIVED PROGRESS, OPTIONAL LESSONS, EARLY-UNLOCKED S5, LOCKED PREVIEW
  // =========================================================================
  const emptyProgress = makeEmptyProgress();
  const guestStageStats = computeAllStageStats(ACADEMY_CURRICULUM, labsByLesson, emptyProgress);
  assert.equal(guestStageStats[0].status, 'in_progress');
  assert.equal(guestStageStats[0].unlockedCount, 1); // only comp-hardware unlocked initially
  assert.equal(guestStageStats[2].status, 'locked_preview');
  assert.equal(guestStageStats[2].unlockedCount, 0);
  assert.equal(guestStageStats[3].status, 'locked_preview');
  assert.equal(guestStageStats[3].unlockedCount, 0);
  assert.equal(guestStageStats[4].status, 'locked_preview');
  assert.equal(guestStageStats[4].unlockedCount, 0);

  const recEmpty = getJourneyRecommendedNext(ACADEMY_CURRICULUM, emptyProgress);
  assert.equal(recEmpty?.lesson.id, 'comp-hardware');
  assert.equal(recEmpty?.stageOrder, 1);

  // Complete all core lessons in Stage 4 while leaving Optional lessons (ctf-formats, entry-certs) incomplete
  const stage4CoreIds = JOURNEY_STAGES[3].topics
    .flatMap((t) => t.lessonIds)
    .filter((id) => canonicalLessonIndex.get(id)!.lesson.required !== false);
  const stage1To3CoreIds = JOURNEY_STAGES.slice(0, 3)
    .flatMap((s) => s.topics.flatMap((t) => t.lessonIds))
    .filter((id) => canonicalLessonIndex.get(id)!.lesson.required !== false);

  const stage4CoreDoneProgress: UserProgress = {
    completedLessonIds: [...stage1To3CoreIds, ...stage4CoreIds],
    completedExerciseIds: [],
    completedQuizLessonIds: [...stage1To3CoreIds, ...stage4CoreIds],
    completedHomeworkLessonIds: [],
    xp: 5000,
    streak: 3,
    lastActiveDate: null,
  };
  const coreDoneStats = computeAllStageStats(
    ACADEMY_CURRICULUM,
    labsByLesson,
    stage4CoreDoneProgress
  );
  assert.equal(coreDoneStats[3].coreCompleted, coreDoneStats[3].coreTotal);
  assert.equal(coreDoneStats[3].corePercent, 100);
  assert.equal(
    coreDoneStats[3].status,
    'completed',
    'Optional lessons must never block Stage 4 core completion'
  );
  assert.ok(coreDoneStats[3].optionalTotal >= 2);
  assert.equal(coreDoneStats[3].optionalCompleted, 0);

  // Early-unlocked Stage 5 modules when Stage 1-3 prerequisites are met
  const stage1To3DoneProgress: UserProgress = {
    completedLessonIds: stage1To3CoreIds,
    completedExerciseIds: [],
    completedQuizLessonIds: stage1To3CoreIds,
    completedHomeworkLessonIds: [],
    xp: 3500,
    streak: 2,
    lastActiveDate: null,
  };
  for (const earlyS5Id of ['c-memory-foundations', 'password-attacks', 'portfolio-resumes']) {
    const entry = canonicalLessonIndex.get(earlyS5Id)!;
    assert.equal(
      isLessonUnlocked(entry.lesson, stage1To3DoneProgress, ACADEMY_CURRICULUM),
      true,
      `Expected early Stage 5 lesson ${earlyS5Id} to unlock once Stage 1-3 prereqs complete`
    );
  }

  const globalEmpty = getGlobalJourneyStats(ACADEMY_CURRICULUM, emptyProgress);
  assert.equal(globalEmpty.totalLessons, 76);
  assert.equal(globalEmpty.completedLessons, 0);

  const pathwaySample = computePathwayStats(
    SPECIALIST_PATHWAYS[0],
    ACADEMY_CURRICULUM,
    labsByLesson,
    stage1To3DoneProgress
  );
  assert.ok(pathwaySample.totalLessons > 0 && pathwaySample.completedLessons > 0);

  pass(
    'Progress & Unlock Semantics',
    'Optional Non-Blocking, Early Stage 5 Unlocks & Locked Previews',
    'Verified locked_preview (0 unlocked), optional modules non-blocking at 100% core, and early Stage 5 lesson unlocks'
  );

  // =========================================================================
  // 12. PREVIEWING/EXPANDING STAGES & OPENING LESSONS AWARDS ZERO XP / COMPLETION
  // =========================================================================
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p25b-test-'));
  const tmpDbPath = path.join(tmpDir, 'database.json');
  fs.copyFileSync(path.join(rootDir, 'backups', 'pre-phase1', 'database.test-copy.json'), tmpDbPath);

  const srv = await startTempServer(tmpDbPath);
  try {
    const client = new TestCookieClient(srv.baseUrl);
    const reg = await client.request('POST', '/api/auth/register', {
      email: 'phase25b-runner@test.local',
      username: 'Phase25BRunner',
      password: 'StrongPassword!2026',
    });
    assert.equal(reg.status, 201);

    // 12a. open_lesson on unlocked first lesson awards 0 XP and 0 completions
    const openRes = await client.request('POST', '/api/user/engage', {
      engagementType: 'open_lesson',
      lessonId: 'comp-hardware',
    });
    assert.equal(openRes.status, 200);
    assert.equal(openRes.data.progress.xp, 0, 'open_lesson must award 0 XP');
    assert.equal(
      openRes.data.progress.completedLessonIds.length,
      0,
      'open_lesson must record 0 lesson completions'
    );

    // 12b. Submitting quiz/lab on a Stage 3/4/5 locked lesson still returns 403 from server
    const lockedStage3Id = JOURNEY_STAGES[2].topics[0].lessonIds[0];
    const lockedStage3Entry = canonicalLessonIndex.get(lockedStage3Id)!;
    const lockedQuizRes = await client.request('POST', '/api/user/engage', {
      engagementType: 'submit_quiz',
      lessonId: lockedStage3Id,
      answers: Object.fromEntries(
        lockedStage3Entry.lesson.quiz.map((q) => [q.id, q.correctOption])
      ),
    });
    assert.equal(lockedQuizRes.status, 403, `Locked Stage 3 lesson ${lockedStage3Id} must return HTTP 403`);
  } finally {
    srv.server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  pass(
    'Server Enforcement',
    'Zero Completion/XP on Preview + 403 Prerequisite Enforcement',
    'Verified open_lesson grants 0 XP / 0 completions and server rejects locked lesson submissions with HTTP 403'
  );

  // =========================================================================
  // 13. LIVE database.json BYTE-FOR-BYTE SHA-256 PRESERVATION
  // =========================================================================
  const liveDbBytes = fs.readFileSync(path.join(rootDir, 'database.json'));
  const backupDbBytes = fs.readFileSync(
    path.join(rootDir, 'backups', 'pre-phase2.4-20261119-014000', 'database.json')
  );
  const liveHash = crypto.createHash('sha256').update(liveDbBytes).digest('hex');
  const backupHash = crypto.createHash('sha256').update(backupDbBytes).digest('hex');
  assert.equal(liveHash, backupHash, 'database.json must remain byte-for-byte identical');

  pass(
    'Data Preservation',
    'Production database.json Byte-Identical Check',
    `SHA-256 verified identical (${liveHash})`
  );

  // =========================================================================
  // 14. BUILT CLIENT BUNDLE ZERO-LEAKAGE CHECK
  // =========================================================================
  const distClientDir = path.join(rootDir, 'dist', 'client');
  assert.ok(fs.existsSync(distClientDir), 'dist/client must exist (run npm run build first)');
  const distFiles: string[] = [];
  const walkDist = (dir: string) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walkDist(p);
      else if (ent.isFile() && /\.(js|html)$/.test(ent.name)) distFiles.push(p);
    }
  };
  walkDist(distClientDir);
  assert.ok(distFiles.length >= 1);

  const forbiddenTokens = [
    'correctOption',
    'correctIndex',
    'optionFeedback',
    'suspiciousEntryId',
    'artifactHighlightLines',
    'artifactLineRationales',
    'targetLineNumbers',
    'expectedKeywords',
  ];
  const forbiddenSolutionSnippets = ACADEMY_CAPSTONES.map((c) =>
    c.detailedSolutionExplanation.slice(0, 48)
  );
  for (const file of distFiles) {
    const raw = fs.readFileSync(file, 'utf-8');
    for (const tok of forbiddenTokens) {
      assert.equal(raw.includes(tok), false, `${file} leaked forbidden token ${tok}`);
    }
    for (const snip of forbiddenSolutionSnippets) {
      assert.equal(raw.includes(snip), false, `${file} leaked capstone solution text`);
    }
  }

  pass(
    'Bundle Security',
    'dist/client Zero-Leakage Audit',
    `Scanned ${distFiles.length} built client assets; zero answer keys or hidden rubric/evidence tokens found`
  );

  console.log(`\nALL ${results.length} PHASE 2.5B VERIFICATION SUITES PASSED.`);
}

runTests().catch((err) => {
  console.error('Phase 2.5B verification failed:', err);
  process.exit(1);
});
