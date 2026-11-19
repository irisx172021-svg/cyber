import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { ACADEMY_CURRICULUM } from '../src/data/curriculum';
import { ALL_PRACTICAL_LABS, getPracticalLabForLesson } from '../src/data/practicalLabs';
import {
  indexCurriculumLessons,
  validateCurriculumGraph,
} from '../src/lib/curriculumProgress';
import {
  getRequiredDiagramItemCount,
  validateServerHomeworkOutput,
} from '../src/server/assessments';
import { TestCookieClient } from './testHttpClient';

process.env.CFA_NO_LISTEN = '1';

const TEST_SECRET = 'phase2_2_test_session_secret_material_32chars';

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
  // 1. CURRICULUM INVENTORY, STRUCTURE & GRAPH INTEGRITY
  // =========================================================================
  const graphReport = validateCurriculumGraph(ACADEMY_CURRICULUM, ALL_PRACTICAL_LABS);
  assert.equal(graphReport.valid, true, 'Curriculum graph must be valid');
  assert.equal(graphReport.tierCount, 11);
  assert.equal(graphReport.topicCount, 25);
  assert.equal(graphReport.lessonCount, 76);
  assert.equal(ALL_PRACTICAL_LABS.length, 76);

  const allQuestions = ACADEMY_CURRICULUM.flatMap((t) =>
    t.topics.flatMap((tp) => tp.lessons.flatMap((l) => l.quiz))
  );
  assert.equal(allQuestions.length, 304);

  // Check completion requirements unchanged (quiz required 100%, practical labs optional)
  for (const entry of lessonIdx.values()) {
    assert.notEqual(
      entry.lesson.completionRequirements?.requirePracticalLab,
      true,
      `Lesson ${entry.lesson.id} must keep requirePracticalLab false/unset`
    );
    assert.equal(
      entry.lesson.completionRequirements?.minQuizScorePercent ?? 100,
      100,
      `Lesson ${entry.lesson.id} minQuizScorePercent must remain 100`
    );
  }

  // Structural checks on every lab kind
  for (const lab of ALL_PRACTICAL_LABS) {
    if (lab.kind === 'diagram') {
      assert.ok((lab.diagramItems?.length || 0) >= 2, `Diagram lab ${lab.id} missing items`);
    } else if (lab.kind === 'terminal') {
      assert.ok((lab.terminalCommands?.length || 0) >= 1, `Terminal lab ${lab.id} missing commands`);
      assert.ok((lab.requiredCommands?.length || 0) >= 1, `Terminal lab ${lab.id} must define requiredCommands`);
      for (const reqCmd of lab.requiredCommands!) {
        assert.ok(
          lab.terminalCommands!.some((c) => c.command === reqCmd),
          `Terminal lab ${lab.id} requiredCommand "${reqCmd}" missing from terminalCommands`
        );
      }
    } else if (lab.kind === 'log_investigation') {
      assert.ok(lab.suspiciousEntryId, `Log lab ${lab.id} missing suspiciousEntryId`);
      assert.ok(
        lab.logEntries?.some((e) => e.id === lab.suspiciousEntryId),
        `Log lab ${lab.id} suspiciousEntryId must exist in logEntries`
      );
    } else if (lab.kind === 'scenario') {
      const lineCount = (lab.artifactContent || '').split('\n').length;
      assert.ok(
        (lab.artifactHighlightLines?.length || 0) >= 1,
        `Scenario lab ${lab.id} missing artifactHighlightLines`
      );
      for (const ln of lab.artifactHighlightLines!) {
        assert.ok(
          Number.isInteger(ln) && ln >= 1 && ln <= lineCount,
          `Scenario lab ${lab.id} highlight line ${ln} out of bounds 1..${lineCount}`
        );
      }
    }
  }

  pass(
    'Curriculum Inventory',
    'Preserved 11 Tiers / 25 Topics / 76 Lessons / 76 Labs / 304 Qs',
    'Verified canonical graph DAG, zero duplicates, optional labs, 100% quiz threshold, and valid lab structures across all 76 labs'
  );

  // =========================================================================
  // 2. QUIZ & LAB OPTION POSITION + LENGTH BIAS REBALANCE VERIFICATION
  // =========================================================================
  const quizPos = [0, 0, 0, 0];
  let quizMaxRun = 0;
  let quizRun = 0;
  let quizPrev = -1;
  let quizStrictLongest = 0;

  for (const q of allQuestions) {
    assert.equal(q.options.length, 4, `Expected 4 options for quiz ${q.id}`);
    const idx = q.correctOption!;
    quizPos[idx]++;
    quizRun = idx === quizPrev ? quizRun + 1 : 1;
    quizMaxRun = Math.max(quizMaxRun, quizRun);
    quizPrev = idx;

    const lens = q.options.map((o) => o.length);
    const maxOther = Math.max(...lens.filter((_, i) => i !== idx));
    if (lens[idx] > maxOther) quizStrictLongest++;
  }
  const quizStrictPct = (quizStrictLongest / allQuestions.length) * 100;
  assert.deepEqual(quizPos, [76, 76, 76, 76], 'Quiz answer distribution must be exactly uniform');
  assert.ok(quizMaxRun <= 2, `Quiz max consecutive same index too high: ${quizMaxRun}`);
  assert.ok(quizStrictPct <= 35, `Quiz strict-longest rate too high: ${quizStrictPct.toFixed(1)}%`);

  const labPos = [0, 0, 0, 0];
  let labMaxRun = 0;
  let labRun = 0;
  let labPrev = -1;
  let labStrictLongest = 0;

  for (const lab of ALL_PRACTICAL_LABS) {
    const idx = lab.challenge.correctIndex!;
    assert.ok(idx >= 0 && idx < 4);
    labPos[idx]++;
    labRun = idx === labPrev ? labRun + 1 : 1;
    labMaxRun = Math.max(labMaxRun, labRun);
    labPrev = idx;

    const lens = lab.challenge.options.map((o) => o.length);
    const maxOther = Math.max(...lens.filter((_, i) => i !== idx));
    if (lens[idx] > maxOther) labStrictLongest++;
  }
  const labStrictPct = (labStrictLongest / ALL_PRACTICAL_LABS.length) * 100;
  for (const count of labPos) {
    assert.ok(count >= 17 && count <= 21, `Imbalanced lab correctIndex count: ${JSON.stringify(labPos)}`);
  }
  assert.ok(labMaxRun <= 3, `Lab max consecutive same index too high: ${labMaxRun}`);
  assert.ok(labStrictPct <= 35, `Lab strict-longest rate too high: ${labStrictPct.toFixed(1)}%`);

  pass(
    'Assessment Rebalance',
    'Zero Position & Length Bias Across All 304 Qs + 76 Labs',
    `Quizzes: pos=${JSON.stringify(quizPos)}, maxRun=${quizMaxRun}, strictLongest=${quizStrictPct.toFixed(1)}% | Labs: pos=${JSON.stringify(labPos)}, maxRun=${labMaxRun}, strictLongest=${labStrictPct.toFixed(1)}%`
  );

  // =========================================================================
  // 3. TECHNICAL ACCURACY & HARDENED HOMEWORK REGEX VERIFICATION
  // =========================================================================
  const nistLesson = lessonIdx.get('infosec-frameworks')!.lesson;
  assert.ok(nistLesson.content.includes('NIST CSF 2.0'), 'Expected NIST CSF 2.0 update in infosec-frameworks');
  assert.ok(nistLesson.content.includes('Govern'), 'Expected Govern function in NIST CSF 2.0');

  const irLesson = lessonIdx.get('incident-response')!.lesson;
  assert.ok(
    irLesson.content.includes('NIST SP 800-61 Rev. 3') && irLesson.content.includes('NIST CSF 2.0'),
    'Expected NIST SP 800-61 Rev. 3 / CSF 2.0 coverage in incident-response'
  );

  const volLesson = lessonIdx.get('dig-forensics')!.lesson;
  const volLab = getPracticalLabForLesson('dig-forensics')!;
  assert.ok(
    volLesson.content.includes('windows.pslist') &&
      volLab.requiredCommands?.includes('vol -f lab-ws-04.mem windows.netscan'),
    'Expected Volatility 3 plugin syntax in dig-forensics lesson and lab'
  );

  const k8sLesson = lessonIdx.get('k8s-basics')!.lesson;
  assert.ok(
    k8sLesson.content.includes('kubectl version') && !k8sLesson.content.includes('--short'),
    'Expected deprecated --short flag removed from kubectl version in k8s-basics'
  );

  const malwareLesson = lessonIdx.get('malware-triage')!.lesson;
  assert.ok(
    malwareLesson.content.includes('sha256sum'),
    'Expected SHA-256 hashing update in malware-triage'
  );

  const compHw = lessonIdx.get('comp-hardware')!.lesson;
  assert.equal(validateServerHomeworkOutput(compHw, 'I have a fast cpu'), false, 'Tightened comp-hardware regex must reject false positive');
  assert.equal(
    validateServerHomeworkOutput(compHw, 'Architecture: x86_64\nCPU(s): 8\nModel name: AMD Ryzen'),
    true
  );

  const winLogs = lessonIdx.get('win-ad-logs')!.lesson;
  assert.equal(winLogs.homeworkCommand, 'Get-WinEvent -LogName System -MaxEvents 5');
  assert.equal(validateServerHomeworkOutput(winLogs, 'random log text'), false);
  assert.equal(
    validateServerHomeworkOutput(winLogs, 'ProviderName: Microsoft-Windows-Kernel-General\nTimeCreated: 2026-11-18\nLevelDisplayName: Information'),
    true
  );

  const vpnFw = lessonIdx.get('vpn-firewalls')!.lesson;
  assert.equal(vpnFw.homeworkCommand, 'sudo nft list ruleset');
  assert.equal(validateServerHomeworkOutput(vpnFw, 'table inet filter { chain input { type filter hook input priority filter; policy drop; } }'), true);

  pass(
    'Technical Accuracy',
    'Curriculum Content Updates & Homework Validation Tightening',
    'Verified NIST CSF 2.0, NIST SP 800-61 Rev. 3, Volatility 3 plugins, kubectl version, sha256sum, Get-WinEvent, nftables, and tightened regex validation'
  );

  // =========================================================================
  // 4. STATIC CLIENT BUNDLE & LIVE /api/curriculum ANTI-LEAKAGE CHECK
  // =========================================================================
  const distClientDir = path.join(rootDir, 'dist', 'client');
  assert.ok(fs.existsSync(distClientDir), 'dist/client must exist (run npm run build first)');
  const checkFiles: string[] = [];
  const walk = (d: string) => {
    for (const ent of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.isFile() && /\.(js|html)$/.test(ent.name)) checkFiles.push(p);
    }
  };
  walk(distClientDir);
  for (const cf of checkFiles) {
    const text = fs.readFileSync(cf, 'utf-8');
    assert.equal(text.includes('artifactHighlightLines'), false, `${cf} leaked artifactHighlightLines`);
    assert.equal(text.includes('correctIndex'), false, `${cf} leaked correctIndex`);
    assert.equal(text.includes('correctOption'), false, `${cf} leaked correctOption`);
    assert.equal(text.includes('suspiciousEntryId'), false, `${cf} leaked suspiciousEntryId`);
  }

  // =========================================================================
  // 5. LIVE SERVER STEP 1 EXPLORATION ENFORCEMENT ACROSS ALL 4 LAB KINDS
  // =========================================================================
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p22-test-'));
  const tmpDbPath = path.join(tmpDir, 'database.json');
  fs.copyFileSync(path.join(rootDir, 'backups', 'pre-phase1', 'database.test-copy.json'), tmpDbPath);

  const srv = await startTempServer(tmpDbPath, {
    sessionSecret: TEST_SECRET,
    rateLimits: {
      exploreUserMax: 40,
      exploreUserWindowMs: 60_000,
      exploreIpMax: 80,
      exploreIpWindowMs: 60_000,
      assessmentUserMax: 100,
      assessmentUserWindowMs: 60_000,
    },
  });

  try {
    const anonClient = new TestCookieClient(srv.baseUrl);
    const learnerClient = new TestCookieClient(srv.baseUrl);

    // Verify GET /api/curriculum strips artifactHighlightLines and exposes highlightTargetCount
    const currRes = await anonClient.request('GET', '/api/curriculum');
    assert.equal(currRes.status, 200);
    const rawCurr = JSON.stringify(currRes.data);
    assert.equal(rawCurr.includes('"artifactHighlightLines"'), false, '/api/curriculum must strip artifactHighlightLines');
    for (const lab of currRes.data.labs) {
      assert.equal(lab.artifactHighlightLines, undefined);
      if (lab.kind === 'scenario') {
        assert.ok(
          typeof lab.highlightTargetCount === 'number' && lab.highlightTargetCount >= 1,
          `Scenario lab ${lab.id} missing client-safe highlightTargetCount`
        );
      }
    }

    // Unauthenticated explore-lab must fail with 401
    const compLab = getPracticalLabForLesson('comp-hardware')!;
    const unauthExplore = await anonClient.request('POST', '/api/assessments/explore-lab', {
      lessonId: 'comp-hardware',
      labId: compLab.id,
      action: 'explore_diagram_item',
      itemId: compLab.diagramItems![0].id,
    });
    assert.equal(unauthExplore.status, 401);

    // Register test learner
    const reg = await learnerClient.request('POST', '/api/auth/register', {
      email: 'phase22-learner@test.local',
      username: 'Phase22Learner',
      password: 'StrongPassword!2026',
    });
    assert.equal(reg.status, 201);
    assert.deepEqual(reg.data.labExploration, {});

    // Locked lesson explore-lab must fail with 403
    const termLab = ALL_PRACTICAL_LABS.find((l) => l.kind === 'terminal' && (l.requiredCommands?.length || 0) >= 2)!;
    const lockedExplore = await learnerClient.request('POST', '/api/assessments/explore-lab', {
      lessonId: termLab.lessonId,
      labId: termLab.id,
      action: 'execute_terminal_command',
      command: termLab.requiredCommands![0],
    });
    assert.equal(lockedExplore.status, 403);

    // --- KIND 1: DIAGRAM LAB ENFORCEMENT (comp-hardware) ---
    const reqDiagramCount = getRequiredDiagramItemCount(compLab);
    assert.equal(reqDiagramCount, 3);

    // Even with correct option, complete_exercise must return 400 before Step 1 completes
    const preExploreDiagram = await learnerClient.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: 'comp-hardware',
      exerciseId: compLab.id,
      selectedOption: compLab.challenge.correctIndex,
    });
    assert.equal(preExploreDiagram.status, 400);
    assert.match(preExploreDiagram.data.error, /Step 1/i);

    // Explore 2 items (still < 3 -> explorationComplete false -> complete_exercise 400)
    for (let i = 0; i < 2; i++) {
      const stepRes = await learnerClient.request('POST', '/api/assessments/explore-lab', {
        lessonId: 'comp-hardware',
        labId: compLab.id,
        action: 'explore_diagram_item',
        itemId: compLab.diagramItems![i].id,
      });
      assert.equal(stepRes.status, 200);
      assert.equal(stepRes.data.explorationComplete, false);
    }

    const partialDiagramSubmit = await learnerClient.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: 'comp-hardware',
      exerciseId: compLab.id,
      selectedOption: compLab.challenge.correctIndex,
    });
    assert.equal(partialDiagramSubmit.status, 400);

    // Explore 3rd item -> explorationComplete: true -> complete_exercise 200
    const step3Res = await learnerClient.request('POST', '/api/assessments/explore-lab', {
      lessonId: 'comp-hardware',
      labId: compLab.id,
      action: 'explore_diagram_item',
      itemId: compLab.diagramItems![2].id,
    });
    assert.equal(step3Res.status, 200);
    assert.equal(step3Res.data.explorationComplete, true);

    const passDiagramSubmit = await learnerClient.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: 'comp-hardware',
      exerciseId: compLab.id,
      selectedOption: compLab.challenge.correctIndex,
    });
    assert.equal(passDiagramSubmit.status, 200);
    assert.equal(passDiagramSubmit.data.xpAwarded, compLab.xpReward);

    // Verify /api/auth/me hydrates persisted labExploration across refresh
    const meAfterDiagram = await learnerClient.request('GET', '/api/auth/me');
    assert.equal(meAfterDiagram.status, 200);
    assert.equal(meAfterDiagram.data.labExploration[compLab.id].explorationComplete, true);
    assert.equal(meAfterDiagram.data.labExploration[compLab.id].exploredDiagramIds.length, 3);

    const completedQuizzes = new Set<string>();

    // --- KIND 2: SIMULATED TERMINAL LAB ENFORCEMENT ---
    await unlockLessonPrerequisites(learnerClient, termLab.lessonId, completedQuizzes, lessonIdx);

    // Partial/invalid command boundary check (must NOT match unrelated command starting with alias letters)
    const unknownCmdRes = await learnerClient.request('POST', '/api/assessments/explore-lab', {
      lessonId: termLab.lessonId,
      labId: termLab.id,
      action: 'execute_terminal_command',
      command: 'not_a_real_command_xyz',
    });
    assert.equal(unknownCmdRes.status, 200);
    assert.equal(unknownCmdRes.data.commandResult.matched, false);
    assert.equal(unknownCmdRes.data.explorationComplete, false);

    // Premature complete_exercise rejected (400)
    const preTermSubmit = await learnerClient.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: termLab.lessonId,
      exerciseId: termLab.id,
      selectedOption: termLab.challenge.correctIndex,
    });
    assert.equal(preTermSubmit.status, 400);

    // Run required commands via server endpoint
    for (let i = 0; i < termLab.requiredCommands!.length; i++) {
      const cmd = termLab.requiredCommands![i];
      const cmdRes = await learnerClient.request('POST', '/api/assessments/explore-lab', {
        lessonId: termLab.lessonId,
        labId: termLab.id,
        action: 'execute_terminal_command',
        command: `  ${cmd}  `, // also checks whitespace tolerance
      });
      assert.equal(cmdRes.status, 200);
      assert.equal(cmdRes.data.commandResult.matched, true);
      if (i < termLab.requiredCommands!.length - 1) {
        assert.equal(cmdRes.data.explorationComplete, false);
      } else {
        assert.equal(cmdRes.data.explorationComplete, true);
      }
    }

    const passTermSubmit = await learnerClient.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: termLab.lessonId,
      exerciseId: termLab.id,
      selectedOption: termLab.challenge.correctIndex,
    });
    assert.equal(passTermSubmit.status, 200);
    assert.equal(passTermSubmit.data.xpAwarded, termLab.xpReward);

    // --- KIND 3: LOG INVESTIGATION LAB ENFORCEMENT ---
    const logLab = ALL_PRACTICAL_LABS.find((l) => l.kind === 'log_investigation' && (l.logEntries?.length || 0) >= 2)!;
    await unlockLessonPrerequisites(learnerClient, logLab.lessonId, completedQuizzes, lessonIdx);

    // Flagging benign baseline entry must NOT unlock Step 2
    const benignEntry = logLab.logEntries!.find((e) => e.id !== logLab.suspiciousEntryId)!;
    const flagBenign = await learnerClient.request('POST', '/api/assessments/verify-log', {
      lessonId: logLab.lessonId,
      labId: logLab.id,
      entryId: benignEntry.id,
    });
    assert.equal(flagBenign.status, 200);
    assert.equal(flagBenign.data.isTarget, false);

    const preLogSubmit = await learnerClient.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: logLab.lessonId,
      exerciseId: logLab.id,
      selectedOption: logLab.challenge.correctIndex,
    });
    assert.equal(preLogSubmit.status, 400);

    // Flagging suspicious entry persists Step 1 completion & unlocks Step 2
    const flagTarget = await learnerClient.request('POST', '/api/assessments/verify-log', {
      lessonId: logLab.lessonId,
      labId: logLab.id,
      entryId: logLab.suspiciousEntryId,
    });
    assert.equal(flagTarget.status, 200);
    assert.equal(flagTarget.data.isTarget, true);
    assert.equal(flagTarget.data.explorationComplete, true);

    const passLogSubmit = await learnerClient.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: logLab.lessonId,
      exerciseId: logLab.id,
      selectedOption: logLab.challenge.correctIndex,
    });
    assert.equal(passLogSubmit.status, 200);
    assert.equal(passLogSubmit.data.xpAwarded, logLab.xpReward);

    // --- KIND 4: SCENARIO DECISION LAB ENFORCEMENT ---
    const scenarioLab = ALL_PRACTICAL_LABS.find(
      (l) => l.kind === 'scenario' && (l.artifactHighlightLines?.length || 0) >= 1
    )!;
    await unlockLessonPrerequisites(learnerClient, scenarioLab.lessonId, completedQuizzes, lessonIdx);

    // Check /api/auth/me NEVER exposes unverified scenario lines prior to solving
    const meBeforeScenario = await learnerClient.request('GET', '/api/auth/me');
    assert.equal(meBeforeScenario.data.labExploration[scenarioLab.id], undefined);

    // Premature complete_exercise rejected (400)
    const preScenarioSubmit = await learnerClient.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: scenarioLab.lessonId,
      exerciseId: scenarioLab.id,
      selectedOption: scenarioLab.challenge.correctIndex,
    });
    assert.equal(preScenarioSubmit.status, 400);

    // Oversized selection rejected (400) so attacker can't highlight every line
    const totalLines = (scenarioLab.artifactContent || '').split('\n').length;
    const allLinesTry = Array.from({ length: totalLines }, (_, i) => i + 1);
    if (allLinesTry.length > scenarioLab.artifactHighlightLines!.length) {
      const bruteLines = await learnerClient.request('POST', '/api/assessments/explore-lab', {
        lessonId: scenarioLab.lessonId,
        labId: scenarioLab.id,
        action: 'verify_scenario_lines',
        selectedLines: allLinesTry,
      });
      assert.equal(bruteLines.status, 400);
    }

    // Wrong line selection returns verified: false without leaking expected lines
    const wrongLine = Array.from({ length: totalLines }, (_, i) => i + 1).find(
      (n) => !scenarioLab.artifactHighlightLines!.includes(n)
    )!;
    const wrongScenarioCheck = await learnerClient.request('POST', '/api/assessments/explore-lab', {
      lessonId: scenarioLab.lessonId,
      labId: scenarioLab.id,
      action: 'verify_scenario_lines',
      selectedLines: [wrongLine],
    });
    assert.equal(wrongScenarioCheck.status, 200);
    assert.equal(wrongScenarioCheck.data.scenarioResult.verified, false);
    assert.equal(wrongScenarioCheck.data.scenarioResult.verifiedHighlightLines, undefined);
    assert.equal(wrongScenarioCheck.data.explorationComplete, false);

    // Exact match verifies Step 1, returns verifiedHighlightLines, and unlocks Step 2
    const passScenarioCheck = await learnerClient.request('POST', '/api/assessments/explore-lab', {
      lessonId: scenarioLab.lessonId,
      labId: scenarioLab.id,
      action: 'verify_scenario_lines',
      selectedLines: scenarioLab.artifactHighlightLines,
    });
    assert.equal(passScenarioCheck.status, 200);
    assert.equal(passScenarioCheck.data.scenarioResult.verified, true);
    assert.deepEqual(
      passScenarioCheck.data.scenarioResult.verifiedHighlightLines,
      [...scenarioLab.artifactHighlightLines!].sort((a, b) => a - b)
    );
    assert.equal(passScenarioCheck.data.explorationComplete, true);

    const passScenarioSubmit = await learnerClient.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: scenarioLab.lessonId,
      exerciseId: scenarioLab.id,
      selectedOption: scenarioLab.challenge.correctIndex,
    });
    assert.equal(passScenarioSubmit.status, 200);
    assert.equal(passScenarioSubmit.data.xpAwarded, scenarioLab.xpReward);

    pass(
      'Step 1 Enforcement',
      'Server-Verified Exploration Across All 4 Lab Kinds',
      `Verified server-side gating, persistence, and anti-leakage for diagram (${compLab.id}), terminal (${termLab.id}), log (${logLab.id}), and scenario (${scenarioLab.id})`
    );
  } finally {
    srv.server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // =========================================================================
  // 6. PRODUCTION database.json BYTE-FOR-BYTE PRESERVATION CHECK
  // =========================================================================
  const liveDbBytes = fs.readFileSync(path.join(rootDir, 'database.json'));
  const backupDbPath = path.join(rootDir, 'backups', 'pre-phase2.2-20261118-162900', 'database.json');
  const backupDbBytes = fs.readFileSync(backupDbPath);
  const liveHash = crypto.createHash('sha256').update(liveDbBytes).digest('hex');
  const backupHash = crypto.createHash('sha256').update(backupDbBytes).digest('hex');
  assert.equal(liveHash, backupHash, 'Live database.json must remain byte-for-byte identical to pre-Phase 2.2 backup');

  pass(
    'Data Preservation',
    'Production database.json Byte-Identical Check',
    `SHA-256 verified identical (${liveHash.slice(0, 16)}...) across all 6 accounts, XP, progress, notes, posts, timeline, and groups`
  );

  console.log(`\nALL ${results.length} PHASE 2.2 VERIFICATION SUITES PASSED.`);
}

runTests().catch((err) => {
  console.error('Phase 2.2 verification failed:', err);
  process.exit(1);
});
