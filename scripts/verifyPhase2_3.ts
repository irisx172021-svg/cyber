import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { ACADEMY_CURRICULUM } from '../src/data/curriculum';
import { LESSON_METADATA } from '../src/data/curriculumMetadata';
import { ALL_PRACTICAL_LABS, getPracticalLabForLesson } from '../src/data/practicalLabs';
import {
  computeCurriculumStats,
  indexCurriculumLessons,
  isLessonUnlocked,
  validateCurriculumGraph,
} from '../src/lib/curriculumProgress';
import { getRequiredDiagramItemCount } from '../src/server/assessments';
import { buildTutorLessonContent, buildTutorSystemPrompt, getLessonContext } from '../src/server/groqTutor';
import { DbSchema, migrateDatabaseSchema } from '../src/server/migration';
import { UserProgress } from '../src/types';
import { TestCookieClient } from './testHttpClient';
import { ACADEMY_CURRICULUM as PRE_23_CURRICULUM } from '../backups/pre-phase2.3-20261118-090200/src/data/curriculum';
import { ALL_PRACTICAL_LABS as PRE_23_LABS } from '../backups/pre-phase2.3-20261118-090200/src/data/practicalLabs';

process.env.CFA_NO_LISTEN = '1';

const TEST_SECRET = 'phase2_3_test_session_secret_material_32chars';

const NEW_MODULE_IDS = [
  'http-web-arch',
  'db-sql-foundations',
  'auth-sessions-id',
  'vuln-management',
  'email-security',
  'devsecops-cicd',
  'c-memory-foundations',
] as const;

const EXPECTED_12_HEADINGS = [
  '#### Learning Objectives',
  '#### Why It Matters',
  '#### Prerequisites & Connections',
  '#### Core Explanation',
  '#### How It Works',
  '#### Real-World Context',
  '#### Examples',
  '#### Security Relevance',
  '#### Common Mistakes',
  '#### Key Takeaways',
  '#### Knowledge Check',
  '#### Further Learning',
];

async function startTempServer(
  dbPath: string,
  options?: Parameters<(typeof import('../server'))['createApiApp']>[1]
) {
  const { createApiApp } = await import('../server');
  const app = createApiApp(dbPath, options);
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address() as { port: number };
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

async function unlockLessonPrerequisites(
  client: TestCookieClient,
  targetLessonId: string,
  completedQuizSet: Set<string>,
  lessonIdx: ReturnType<typeof indexCurriculumLessons>
) {
  const entry = lessonIdx.get(targetLessonId);
  assert.ok(entry, `Lesson ${targetLessonId} not found in index`);
  for (const prereqId of entry!.lesson.prerequisites || []) {
    await unlockLessonPrerequisites(client, prereqId, completedQuizSet, lessonIdx);
    if (!completedQuizSet.has(prereqId)) {
      const prereqLesson = lessonIdx.get(prereqId)!.lesson;
      const answers = Object.fromEntries(prereqLesson.quiz.map((q) => [q.id, q.correctOption]));
      const res = await client.request('POST', '/api/user/engage', {
        engagementType: 'submit_quiz',
        lessonId: prereqId,
        answers,
      });
      assert.equal(res.status, 200, `Failed to unlock prerequisite ${prereqId}: ${JSON.stringify(res.data)}`);
      completedQuizSet.add(prereqId);
    }
  }
}

async function runTests() {
  const results: Array<{ category: string; name: string; detail: string }> = [];
  const pass = (category: string, name: string, detail: string) => {
    results.push({ category, name, detail });
    console.log(`[PASS][${category}] ${name}: ${detail}`);
  };

  const rootDir = process.cwd();
  const lessonIdx = indexCurriculumLessons(ACADEMY_CURRICULUM);

  // =========================================================================
  // 1. INVENTORY, GRAPH DAG & CANONICAL PRESERVATION (69->76 / 276->304)
  // =========================================================================
  const graphReport = validateCurriculumGraph(ACADEMY_CURRICULUM, ALL_PRACTICAL_LABS);
  assert.equal(graphReport.valid, true, `Curriculum graph invalid: ${JSON.stringify(graphReport)}`);
  assert.equal(graphReport.tierCount, 11);
  assert.equal(graphReport.topicCount, 25);
  assert.equal(graphReport.lessonCount, 76);
  assert.equal(ALL_PRACTICAL_LABS.length, 76);

  const allQuestions = ACADEMY_CURRICULUM.flatMap((t) =>
    t.topics.flatMap((tp) => tp.lessons.flatMap((l) => l.quiz))
  );
  assert.equal(allQuestions.length, 304);

  const freshProgress: UserProgress = {
    completedLessonIds: [],
    completedExerciseIds: [],
    completedQuizLessonIds: [],
    completedHomeworkLessonIds: [],
    xp: 0,
    streak: 0,
    lastActiveDate: null,
  };
  const freshStats = computeCurriculumStats(ACADEMY_CURRICULUM, freshProgress);
  assert.equal(freshStats.totalLessons, 76);

  // Compare against pre-2.3 backup snapshot: every original ID & original correctOption preserved
  const preLessons = PRE_23_CURRICULUM.flatMap((t: any) =>
    t.topics.flatMap((tp: any) => tp.lessons)
  );
  assert.equal(preLessons.length, 69);
  assert.equal(PRE_23_LABS.length, 69);

  const liveQuizById = new Map(allQuestions.map((q) => [q.id, q]));
  const liveLabById = new Map(ALL_PRACTICAL_LABS.map((l) => [l.id, l]));

  for (const oldLesson of preLessons) {
    assert.ok(lessonIdx.has(oldLesson.id), `Missing preserved lesson ID: ${oldLesson.id}`);
    const liveLesson = lessonIdx.get(oldLesson.id)!.lesson;
    assert.notEqual(
      liveLesson.completionRequirements?.requirePracticalLab,
      true,
      `Lesson ${liveLesson.id} must keep requirePracticalLab false/unset`
    );
    assert.equal(liveLesson.completionRequirements?.minQuizScorePercent ?? 100, 100);
    for (const oldQ of oldLesson.quiz) {
      const liveQ = liveQuizById.get(oldQ.id);
      assert.ok(liveQ, `Missing preserved quiz ID: ${oldQ.id}`);
      assert.equal(
        liveQ!.correctOption,
        oldQ.correctOption,
        `Quiz ${oldQ.id} altered correctOption (${oldQ.correctOption} -> ${liveQ!.correctOption})`
      );
    }
  }
  for (const oldLab of PRE_23_LABS) {
    assert.ok(liveLabById.has(oldLab.id), `Missing preserved lab ID: ${oldLab.id}`);
  }
  for (const newId of NEW_MODULE_IDS) {
    assert.ok(lessonIdx.has(newId), `Missing new module lesson: ${newId}`);
    assert.ok(getPracticalLabForLesson(newId), `Missing new practical lab for ${newId}`);
  }

  pass(
    'Preservation & Inventory',
    '11 Tiers / 25 Topics / 76 Lessons / 76 Labs / 304 Qs',
    'Verified all 69 original lessons, 69 original labs, and 276 original quiz IDs + exact correctOption keys preserved alongside 7 new modules'
  );

  // =========================================================================
  // 2. ZERO DIFFICULTY INVERSIONS & LIVE DB ACCOUNT UNLOCK PRESERVATION
  // =========================================================================
  const rank: Record<string, number> = { beginner: 1, intermediate: 2, advanced: 3 };
  const inversions: string[] = [];
  for (const entry of lessonIdx.values()) {
    const lRank = rank[entry.lesson.difficulty || 'beginner'] || 1;
    for (const pId of entry.lesson.prerequisites || []) {
      const pEntry = lessonIdx.get(pId);
      assert.ok(pEntry, `Missing prerequisite ${pId} on ${entry.lesson.id}`);
      const pRank = rank[pEntry!.lesson.difficulty || 'beginner'] || 1;
      if (lRank < pRank) {
        inversions.push(`${entry.lesson.id} (${entry.lesson.difficulty}) -> ${pId} (${pEntry!.lesson.difficulty})`);
      }
    }
  }
  assert.deepEqual(inversions, [], `Prerequisite difficulty inversions found: ${inversions.join('; ')}`);

  const liveDbRaw = JSON.parse(fs.readFileSync(path.join(rootDir, 'database.json'), 'utf-8')) as DbSchema;
  assert.equal(liveDbRaw.accounts.length, 6);
  const migratedView = migrateDatabaseSchema(JSON.parse(JSON.stringify(liveDbRaw)), ACADEMY_CURRICULUM);
  for (const acc of migratedView.db.accounts) {
    for (const doneId of acc.progress.completedLessonIds) {
      const entry = lessonIdx.get(doneId);
      if (entry) {
        assert.equal(
          isLessonUnlocked(entry.lesson, acc.progress, ACADEMY_CURRICULUM),
          true,
          `Previously completed lesson ${doneId} for ${acc.user.username} must remain unlocked`
        );
      }
    }
  }

  pass(
    'Prerequisite Graph',
    'Zero Difficulty Inversions & Account Unlock Safety',
    '0 cycles, 0 inversions across 76 lessons, and all 6 live DB user accounts retain unlocked access to completed modules'
  );

  // =========================================================================
  // 3. 12-PART SCHEMA, FENCES, METADATA SYNC & DOMAIN PURITY (ALL 76 LESSONS)
  // =========================================================================
  for (const [id, entry] of lessonIdx.entries()) {
    const lesson = entry.lesson;
    const meta = LESSON_METADATA[id];
    assert.ok(meta, `Missing LESSON_METADATA for ${id}`);
    assert.equal(
      lesson.content.includes('IN-DEPTH TECHNICAL SECURITY GUIDE'),
      false,
      `Legacy boilerplate remains in ${id}`
    );
    assert.ok((lesson.learningObjectives?.length || 0) >= 3, `${id} must have >= 3 learning objectives`);

    const fences = (lesson.content.match(/```/g) || []).length;
    assert.equal(fences % 2, 0, `${id} has unbalanced code fences (${fences})`);

    let lastPos = -1;
    for (const heading of EXPECTED_12_HEADINGS) {
      const idx = lesson.content.indexOf(heading);
      assert.ok(idx > lastPos, `${id} missing or misordered heading: ${heading}`);
      lastPos = idx;
    }

    const diffMatch = lesson.content.match(/\*\*Difficulty:\*\*\s*(Beginner|Intermediate|Advanced)/i);
    assert.ok(
      diffMatch && diffMatch[1].toLowerCase() === (lesson.difficulty || '').toLowerCase(),
      `${id} inline Difficulty out of sync with metadata (${diffMatch?.[1]} vs ${lesson.difficulty})`
    );

    const timeMatch = lesson.content.match(/\*\*Estimated Study Time:\*\*\s*(\d+)\s*Minutes?/i);
    assert.ok(
      timeMatch && Number(timeMatch[1]) === lesson.estimatedMinutes,
      `${id} inline Estimated Study Time out of sync (${timeMatch?.[1]} vs ${lesson.estimatedMinutes})`
    );

    const prereqMatch = lesson.content.match(/\*\*Prerequisites:\*\*\s*([^\n]+)/i);
    assert.ok(prereqMatch, `${id} missing inline Prerequisites line`);
    if ((lesson.prerequisites?.length || 0) === 0) {
      assert.match(prereqMatch![1], /None/i, `${id} expected Prerequisites: None`);
    }
  }

  // Domain purity & technical spec updates
  assert.equal(lessonIdx.get('comp-hardware')!.lesson.content.includes('Spectre'), false);
  assert.equal(lessonIdx.get('win-arch')!.lesson.content.includes('Mimikatz'), false);
  assert.equal(lessonIdx.get('osint-passive')!.lesson.content.includes('Golden Ticket'), false);
  assert.equal(lessonIdx.get('aws-logging')!.lesson.content.includes('Shared Responsibility Model'), false);
  assert.equal(lessonIdx.get('azure-security')!.lesson.content.includes('Shared Responsibility Model'), false);
  assert.equal(lessonIdx.get('gcp-security')!.lesson.content.includes('Shared Responsibility Model'), false);
  assert.ok(lessonIdx.get('web-owasp-top-10')!.lesson.content.includes('OWASP Top 10:2025'));
  assert.ok(lessonIdx.get('vuln-management')!.lesson.content.includes('CVSS v4.0'));
  assert.ok(lessonIdx.get('auth-sessions-id')!.lesson.content.includes('OAuth 2.1'));
  assert.ok(lessonIdx.get('email-security')!.lesson.content.includes('DMARC'));
  assert.ok(lessonIdx.get('devsecops-cicd')!.lesson.content.includes('SLSA'));
  assert.ok(lessonIdx.get('http-web-arch')!.lesson.content.includes('RFC 9110'));

  pass(
    'Lesson Quality & Purity',
    '12-Part Schema, Metadata Sync & Technical Accuracy Across All 76 Lessons',
    'All 76 lessons pass 12-heading schema order, balanced fences, >=3 objectives, exact metadata sync, zero legacy boilerplate, and domain purity'
  );

  // =========================================================================
  // 4. ASSESSMENT BIAS & LAB VALIDATION AUDIT (304 Qs + 76 LABS)
  // =========================================================================
  const quizPos = [0, 0, 0, 0];
  let qRun = 0, qMaxRun = 0, qPrev = -1, qStrict = 0;
  for (const q of allQuestions) {
    assert.equal(q.options.length, 4, `Quiz ${q.id} must have 4 options`);
    const idx = q.correctOption!;
    quizPos[idx]++;
    qRun = idx === qPrev ? qRun + 1 : 1;
    qMaxRun = Math.max(qMaxRun, qRun);
    qPrev = idx;
    const lens = q.options.map((o) => o.length);
    if (lens[idx] > Math.max(...lens.filter((_, i) => i !== idx))) qStrict++;
  }
  const qStrictPct = (qStrict / allQuestions.length) * 100;
  assert.deepEqual(quizPos, [76, 76, 76, 76]);
  assert.ok(qMaxRun <= 2, `Quiz maxRun too high: ${qMaxRun}`);
  assert.ok(qStrictPct <= 30, `Quiz strictLongest too high: ${qStrictPct.toFixed(1)}%`);

  const labPos = [0, 0, 0, 0];
  let lRun = 0, lMaxRun = 0, lPrev = -1, lStrict = 0;
  for (const lab of ALL_PRACTICAL_LABS) {
    const idx = lab.challenge.correctIndex!;
    labPos[idx]++;
    lRun = idx === lPrev ? lRun + 1 : 1;
    lMaxRun = Math.max(lMaxRun, lRun);
    lPrev = idx;
    const lens = lab.challenge.options.map((o) => o.length);
    if (lens[idx] > Math.max(...lens.filter((_, i) => i !== idx))) lStrict++;

    if (lab.kind === 'diagram') {
      const req = getRequiredDiagramItemCount(lab);
      assert.ok(lab.diagramItems && req >= 1 && req <= lab.diagramItems.length);
    } else if (lab.kind === 'terminal') {
      for (const rc of lab.requiredCommands || []) {
        assert.ok(lab.terminalCommands?.some((tc) => tc.command === rc));
      }
    } else if (lab.kind === 'log_investigation') {
      const target = lab.logEntries?.find((e) => e.id === lab.suspiciousEntryId);
      assert.ok(target, `Missing suspicious entry for ${lab.id}`);
    } else if (lab.kind === 'scenario') {
      const lines = (lab.artifactContent || '').split('\n').length;
      assert.ok(lab.artifactHighlightLines && lab.artifactHighlightLines.length >= 1);
      for (const ln of lab.artifactHighlightLines!) {
        assert.ok(ln >= 1 && ln <= lines, `${lab.id} highlight line ${ln} out of 1..${lines}`);
      }
    }
  }
  const lStrictPct = (lStrict / ALL_PRACTICAL_LABS.length) * 100;
  assert.deepEqual(labPos, [19, 19, 19, 19]);
  assert.ok(lMaxRun <= 3, `Lab maxRun too high: ${lMaxRun}`);
  assert.ok(lStrictPct <= 30, `Lab strictLongest too high: ${lStrictPct.toFixed(1)}%`);

  pass(
    'Assessment Bias',
    'Balanced 304 Quizzes & 76 Practical Labs',
    `Quiz=${JSON.stringify(quizPos)} maxRun=${qMaxRun} strict=${qStrictPct.toFixed(1)}% | Lab=${JSON.stringify(labPos)} maxRun=${lMaxRun} strict=${lStrictPct.toFixed(1)}%`
  );

  // =========================================================================
  // 5. AI TUTOR CONTEXT GROUNDING & SECTION-AWARE BUDGET
  // =========================================================================
  for (const id of NEW_MODULE_IDS) {
    const ctx = getLessonContext(id);
    assert.ok(ctx, `Missing AI tutor lesson context for ${id}`);
    const built = buildTutorLessonContent(ctx!.lesson, 12000);
    assert.ok(built.length > 0 && built.length <= 12000, `${id} tutor content budget exceeded`);
    assert.equal((built.match(/```/g) || []).length % 2, 0, `${id} tutor slice split code block`);

    const prompt = buildTutorSystemPrompt(ctx!);
    assert.ok(prompt.includes('Recommended Prerequisites:'));
    assert.ok(prompt.includes('Further Learning'));
  }

  pass(
    'AI Tutor Grounding',
    'Section-Aware 12k Context & Recommended Prerequisites',
    'Verified clean heading/codeblock preservation, 12k budget compliance, and Further Learning grounding across all 7 new modules'
  );

  // =========================================================================
  // 6. DIST ANTI-LEAKAGE & LIVE TEMP-DB HTTP TESTS FOR ALL 7 NEW MODULES
  // =========================================================================
  const distClientDir = path.join(rootDir, 'dist', 'client');
  assert.ok(fs.existsSync(distClientDir), 'dist/client must exist (run npm run build first)');
  const distFiles: string[] = [];
  const walkDist = (d: string) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walkDist(p);
      else if (ent.isFile() && /\.(js|html)$/.test(ent.name)) distFiles.push(p);
    }
  };
  walkDist(distClientDir);
  for (const df of distFiles) {
    const raw = fs.readFileSync(df, 'utf-8');
    for (const tok of ['correctOption', 'correctIndex', 'suspiciousEntryId', 'artifactHighlightLines']) {
      assert.equal(raw.includes(tok), false, `${df} leaked forbidden token ${tok}`);
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p23-test-'));
  const tmpDbPath = path.join(tmpDir, 'database.json');
  fs.copyFileSync(path.join(rootDir, 'backups', 'pre-phase1', 'database.test-copy.json'), tmpDbPath);

  const srv = await startTempServer(tmpDbPath, {
    sessionSecret: TEST_SECRET,
    rateLimits: {
      exploreUserMax: 150,
      exploreUserWindowMs: 60_000,
      exploreIpMax: 200,
      exploreIpWindowMs: 60_000,
      assessmentUserMax: 200,
      assessmentUserWindowMs: 60_000,
      assessmentIpMax: 300,
      assessmentIpWindowMs: 60_000,
    },
  });

  try {
    const client = new TestCookieClient(srv.baseUrl);
    const currRes = await client.request('GET', '/api/curriculum');
    assert.equal(currRes.status, 200);
    assert.equal(currRes.data.curriculum.length, 11);
    assert.equal(currRes.data.labs.length, 76);

    const reg = await client.request('POST', '/api/auth/register', {
      email: 'phase23-runner@test.local',
      username: 'Phase23Runner',
      password: 'StrongPassword!2026',
    });
    assert.equal(reg.status, 201);

    const completedQuizzes = new Set<string>();
    for (const moduleId of NEW_MODULE_IDS) {
      await unlockLessonPrerequisites(client, moduleId, completedQuizzes, lessonIdx);

      const lesson = lessonIdx.get(moduleId)!.lesson;
      const lab = getPracticalLabForLesson(moduleId)!;

      // Step 1 practical lab verification per kind
      if (lab.kind === 'scenario') {
        const expRes = await client.request('POST', '/api/assessments/explore-lab', {
          lessonId: moduleId,
          labId: lab.id,
          action: 'verify_scenario_lines',
          selectedLines: lab.artifactHighlightLines,
        });
        assert.equal(expRes.status, 200, `Scenario Step 1 failed for ${moduleId}: ${JSON.stringify(expRes.data)}`);
        assert.equal(expRes.data.explorationComplete, true);
      } else if (lab.kind === 'diagram') {
        const reqCount = getRequiredDiagramItemCount(lab);
        for (const item of lab.diagramItems!.slice(0, reqCount)) {
          const expRes = await client.request('POST', '/api/assessments/explore-lab', {
            lessonId: moduleId,
            labId: lab.id,
            action: 'explore_diagram_item',
            itemId: item.id,
          });
          assert.equal(expRes.status, 200);
        }
      } else if (lab.kind === 'terminal') {
        for (const cmd of lab.requiredCommands!) {
          const expRes = await client.request('POST', '/api/assessments/explore-lab', {
            lessonId: moduleId,
            labId: lab.id,
            action: 'execute_terminal_command',
            command: cmd,
          });
          assert.equal(expRes.status, 200);
          assert.equal(expRes.data.commandResult.matched, true);
        }
      } else if (lab.kind === 'log_investigation') {
        const logRes = await client.request('POST', '/api/assessments/verify-log', {
          lessonId: moduleId,
          labId: lab.id,
          entryId: lab.suspiciousEntryId,
        });
        assert.equal(logRes.status, 200);
        assert.equal(logRes.data.isTarget, true);
        assert.equal(logRes.data.explorationComplete, true);
      }

      // Step 2 practical lab completion
      const labRes = await client.request('POST', '/api/user/engage', {
        engagementType: 'complete_exercise',
        lessonId: moduleId,
        exerciseId: lab.id,
        selectedOption: lab.challenge.correctIndex,
      });
      assert.equal(labRes.status, 200, `Lab Step 2 failed for ${moduleId}: ${JSON.stringify(labRes.data)}`);
      assert.equal(labRes.data.xpAwarded, lab.xpReward);

      // Quiz submission (100% pass)
      const qAnswers = Object.fromEntries(lesson.quiz.map((q) => [q.id, q.correctOption]));
      const qRes = await client.request('POST', '/api/user/engage', {
        engagementType: 'submit_quiz',
        lessonId: moduleId,
        answers: qAnswers,
      });
      assert.equal(qRes.status, 200, `Quiz failed for ${moduleId}: ${JSON.stringify(qRes.data)}`);
      assert.equal(qRes.data.passed, true);
      assert.equal(qRes.data.xpAwarded, lesson.quiz.length * 100);
      completedQuizzes.add(moduleId);
    }

    const meRes = await client.request('GET', '/api/auth/me');
    assert.equal(meRes.status, 200);
    const serverStats = computeCurriculumStats(ACADEMY_CURRICULUM, meRes.data.progress);
    assert.equal(serverStats.totalLessons, 76);
    assert.equal(meRes.data.user.completion, serverStats.completionPercent);

    pass(
      'Live HTTP Integration',
      'All 7 New Modules Verified End-to-End',
      `Completed Step 1 + Step 2 practical labs (all 4 kinds) and 100% quizzes across all 7 new modules; completion=${meRes.data.user.completion}% (${serverStats.completedLessons}/76)`
    );
  } finally {
    srv.server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // =========================================================================
  // 7. PRODUCTION database.json BYTE-FOR-BYTE SHA-256 PRESERVATION
  // =========================================================================
  const liveDbBytes = fs.readFileSync(path.join(rootDir, 'database.json'));
  const backupDbBytes = fs.readFileSync(
    path.join(rootDir, 'backups', 'pre-phase2.3-20261118-090200', 'database.json')
  );
  const liveHash = crypto.createHash('sha256').update(liveDbBytes).digest('hex');
  const backupHash = crypto.createHash('sha256').update(backupDbBytes).digest('hex');
  assert.equal(liveHash, backupHash, 'database.json must remain byte-for-byte identical to pre-Phase 2.3 backup');

  pass(
    'Data Preservation',
    'Production database.json Byte-Identical Check',
    `SHA-256 verified identical (${liveHash.slice(0, 16)}...) against pre-Phase 2.3 backup`
  );

  console.log(`\nALL ${results.length} PHASE 2.3 VERIFICATION SUITES PASSED.`);
}

runTests().catch((err) => {
  console.error('Phase 2.3 verification failed:', err);
  process.exit(1);
});
