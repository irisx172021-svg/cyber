import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { ACADEMY_CURRICULUM } from '../src/data/curriculum';
import { ACADEMY_CAPSTONES } from '../src/data/capstones';
import { ALL_PRACTICAL_LABS, getPracticalLabForLesson } from '../src/data/practicalLabs';
import {
  indexCurriculumLessons,
  validateCurriculumGraph,
} from '../src/lib/curriculumProgress';
import {
  getPublicCurriculumPayload,
  getRequiredDiagramItemCount,
  getTerminalCommandHint,
  gradeLabChallengeSubmission,
  gradeQuizSubmission,
  matchTerminalCommand,
} from '../src/server/assessments';
import { getPublicCapstonesPayload } from '../src/server/capstones';
import { isBlockedAppPath } from '../src/server/security';
import { TestCookieClient } from './testHttpClient';

process.env.CFA_NO_LISTEN = '1';

const TEST_SECRET = 'phase2_4_test_session_secret_material_32chars';

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

async function unlockLessonAndCompleteLab(
  client: TestCookieClient,
  targetLessonId: string,
  completedQuizSet: Set<string>,
  lessonIdx: ReturnType<typeof indexCurriculumLessons>
) {
  const entry = lessonIdx.get(targetLessonId);
  assert.ok(entry, `Lesson ${targetLessonId} not found`);
  for (const prereqId of entry!.lesson.prerequisites || []) {
    await unlockLessonAndCompleteLab(client, prereqId, completedQuizSet, lessonIdx);
  }
  if (!completedQuizSet.has(targetLessonId)) {
    const lesson = entry!.lesson;
    const answers = Object.fromEntries(lesson.quiz.map((q) => [q.id, q.correctOption]));
    const res = await client.request('POST', '/api/user/engage', {
      engagementType: 'submit_quiz',
      lessonId: targetLessonId,
      answers,
    });
    assert.equal(res.status, 200, `Failed to pass quiz for ${targetLessonId}: ${JSON.stringify(res.data)}`);
    completedQuizSet.add(targetLessonId);
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
  // 1. INVENTORY, DISTRIBUTIONS & MANDATORY PRESERVATION
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

  const quizDist = [0, 0, 0, 0];
  const labDist = [0, 0, 0, 0];

  for (const [id, entry] of lessonIdx.entries()) {
    const lesson = entry.lesson;
    assert.notEqual(
      lesson.completionRequirements?.requirePracticalLab,
      true,
      `Lesson ${id} must keep requirePracticalLab false during Phase 2.4`
    );
    assert.equal(lesson.completionRequirements?.minQuizScorePercent ?? 100, 100);

    const h4Headings = new Set(
      lesson.content
        .split('\n')
        .filter((line) => line.startsWith('#### '))
        .map((line) => line.replace(/^####\s+/, '').trim())
    );

    for (const q of lesson.quiz) {
      assert.equal(q.options.length, 4);
      quizDist[q.correctOption!]++;
      assert.ok(
        Array.isArray(q.optionFeedback) && q.optionFeedback.length === 4,
        `Quiz ${q.id} missing 4 optionFeedback entries`
      );
      for (const fb of q.optionFeedback!) {
        assert.ok(fb && fb.trim().length >= 15, `Quiz ${q.id} has empty/short optionFeedback`);
      }
      assert.ok(
        q.reviewSection && h4Headings.has(q.reviewSection),
        `Quiz ${q.id} reviewSection "${q.reviewSection}" does not match lesson #### heading`
      );
    }

    const lab = getPracticalLabForLesson(id)!;
    assert.ok(lab, `Missing lab for ${id}`);
    labDist[lab.challenge.correctIndex!]++;
    assert.ok(
      Array.isArray(lab.challenge.optionFeedback) && lab.challenge.optionFeedback.length === 4,
      `Lab ${lab.id} missing 4 challenge optionFeedback entries`
    );
    assert.ok(
      lab.challenge.reviewSection && h4Headings.has(lab.challenge.reviewSection),
      `Lab ${lab.id} reviewSection "${lab.challenge.reviewSection}" does not match lesson #### heading`
    );
  }

  assert.deepEqual(quizDist, [76, 76, 76, 76]);
  assert.deepEqual(labDist, [19, 19, 19, 19]);

  pass(
    'Preservation & Misconceptions',
    '304 Quizzes & 76 Lab Challenges Audited',
    'Preserved 11/25/76/76/304 inventory, [76,76,76,76] & [19,19,19,19] distributions, all requirePracticalLab: false, and 100% optionFeedback + lesson-matched reviewSection coverage'
  );

  // =========================================================================
  // 2. ALL 76 INTERACTIVE LAB UPGRADES (4 KINDS)
  // =========================================================================
  const kindCounts = { diagram: 0, terminal: 0, log_investigation: 0, scenario: 0 };

  for (const lab of ALL_PRACTICAL_LABS) {
    kindCounts[lab.kind]++;
    if (lab.kind === 'diagram') {
      const ids = new Set((lab.diagramItems || []).map((it) => it.id));
      let hasConn = false;
      for (const item of lab.diagramItems || []) {
        if (item.connections && item.connections.length > 0) {
          hasConn = true;
          for (const c of item.connections) {
            assert.ok(ids.has(c.targetId), `Diagram ${lab.id} connection references unknown ${c.targetId}`);
            assert.ok(c.relationship.trim().length >= 3 && c.whyItMatters.trim().length >= 8);
          }
        }
      }
      assert.ok(hasConn, `Diagram lab ${lab.id} missing connections`);
    } else if (lab.kind === 'terminal') {
      assert.ok(lab.terminalCommands && lab.terminalCommands.length >= 2);
      for (const tc of lab.terminalCommands!) {
        assert.ok(matchTerminalCommand(lab, tc.command), `Exact match failed for ${lab.id}: ${tc.command}`);
      }
      const bad = matchTerminalCommand(lab, 'not_a_real_command_xyz');
      assert.equal(bad, null, `Terminal lab ${lab.id} matched unknown command`);
      const badHint = getTerminalCommandHint(lab, 'not_a_real_command_xyz');
      assert.ok(badHint.includes('Unrecognized command'));
    } else if (lab.kind === 'log_investigation') {
      assert.ok(
        lab.logEntries && lab.logEntries.length >= 6,
        `Log lab ${lab.id} must have >= 6 entries (has ${lab.logEntries?.length})`
      );
      assert.ok(
        lab.correlationSummary && lab.correlationSummary.trim().length >= 20,
        `Log lab ${lab.id} missing correlationSummary`
      );
      for (const entry of lab.logEntries!) {
        assert.ok(
          entry.analysisNote && entry.analysisNote.trim().length >= 15,
          `Log lab ${lab.id} entry ${entry.id} missing analysisNote`
        );
      }
    } else if (lab.kind === 'scenario') {
      const lines = (lab.artifactContent || '').split('\n');
      if (lab.id === 'lab-win-arch') {
        assert.ok(lines.length >= 7, `lab-win-arch must be expanded >= 7 lines (has ${lines.length})`);
      }
      assert.ok(lab.artifactHighlightLines && lab.artifactHighlightLines.length >= 1);
      assert.ok(lab.artifactLineRationales, `Scenario ${lab.id} missing artifactLineRationales`);
      for (const ln of lab.artifactHighlightLines!) {
        assert.ok(ln >= 1 && ln <= lines.length);
        assert.ok(
          lab.artifactLineRationales![ln] && lab.artifactLineRationales![ln].trim().length >= 15,
          `Scenario ${lab.id} missing rationale for line ${ln}`
        );
      }
      assert.ok(
        lab.decisionTradeoffs && lab.decisionTradeoffs.length >= 2,
        `Scenario ${lab.id} missing decisionTradeoffs`
      );
    }
  }

  assert.deepEqual(kindCounts, {
    diagram: 25,
    terminal: 19,
    log_investigation: 7,
    scenario: 25,
  });

  // Explicit flexible terminal command variations
  const linLogLab = getPracticalLabForLesson('linux-log-filtering')!;
  assert.ok(matchTerminalCommand(linLogLab, "grep -i 'Failed password' /var/log/auth.log"), 'Failed quoted grep match');
  assert.ok(matchTerminalCommand(linLogLab, 'grep -i "Failed password" /var/log/auth.log'), 'Failed double-quoted grep match');
  const netPortsLab = getPracticalLabForLesson('net-ports')!;
  assert.ok(matchTerminalCommand(netPortsLab, 'ss -nlut'), 'Failed reordered POSIX flags ss -nlut');
  assert.ok(matchTerminalCommand(netPortsLab, 'ss -t -u -l -n'), 'Failed separated POSIX flags ss -t -u -l -n');
  const linFsLab = getPracticalLabForLesson('lin-fs')!;
  assert.ok(matchTerminalCommand(linFsLab, 'ls -l -a /etc'), 'Failed separated flags ls -l -a /etc');
  assert.ok(matchTerminalCommand(linFsLab, 'pwd'), 'Failed pwd');
  const pyLab = getPracticalLabForLesson('py-file-regex')!;
  assert.ok(matchTerminalCommand(pyLab, 'python parse_auth.py'), 'Failed python alias for python3');
  assert.ok(matchTerminalCommand(pyLab, 'cat parse_auth.py'), 'Failed cat inspect script');
  const gitLab = getPracticalLabForLesson('git-workflows')!;
  assert.ok(matchTerminalCommand(gitLab, 'git status'), 'Failed git status');

  pass(
    'Interactive Lab Upgrades',
    'All 76 Labs Verified (25 Diagram / 19 Terminal / 7 Log / 25 Scenario)',
    'Verified flexible terminal flag/quote/alias matching + invalid command rejection, diagram connections, >=6 log entries + notes/correlation, and scenario rationales + tradeoffs'
  );

  // =========================================================================
  // 3. UNIT CHECKS ON NON-ORACLE QUIZ/LAB GRADING + CAPSTONES STRUCTURAL AUDIT
  // =========================================================================
  const publicPayload = getPublicCurriculumPayload();
  const sampleLesson = ACADEMY_CURRICULUM[0].topics[0].lessons[0];
  const wrongAnswers = Object.fromEntries(
    sampleLesson.quiz.map((q) => [q.id, (q.correctOption! + 1) % 4])
  );
  const failGrade = gradeQuizSubmission(sampleLesson, wrongAnswers);
  assert.equal(failGrade.ok, true);
  if (failGrade.ok) {
    assert.equal(failGrade.passed, false);
    assert.equal(failGrade.questionFeedback, undefined, 'Quiz failure must never expose questionFeedback');
    assert.ok(failGrade.misconceptionHints && failGrade.misconceptionHints.length >= 1);
    assert.ok(failGrade.recommendedSections && failGrade.recommendedSections.length >= 1);
  }

  const sampleLab = getPracticalLabForLesson(sampleLesson.id)!;
  const wrongIdx = (sampleLab.challenge.correctIndex! + 1) % 4;
  const labFail = gradeLabChallengeSubmission(sampleLesson.id, sampleLab.id, wrongIdx);
  assert.equal(labFail.ok, true);
  if (labFail.ok) {
    assert.equal(labFail.correct, false);
    assert.equal(labFail.explanation, undefined, 'Lab challenge failure must never expose explanation');
    assert.ok(labFail.misconceptionFeedback && labFail.misconceptionFeedback.length > 10);
    assert.ok(labFail.selectedReasoningStatus === 'partially_correct' || labFail.selectedReasoningStatus === 'incorrect');
  }

  assert.equal(ACADEMY_CAPSTONES.length, 4);
  const expectedCapstoneIds = [
    'capstone-soc-investigation',
    'capstone-web-app-review',
    'capstone-cloud-incident',
    'capstone-forensics-triage',
  ];
  assert.deepEqual(
    ACADEMY_CAPSTONES.map((c) => c.id),
    expectedCapstoneIds
  );

  for (const cap of ACADEMY_CAPSTONES) {
    assert.ok(cap.objectives.length >= 3);
    assert.ok(cap.prerequisiteLessonIds.length >= 2);
    for (const pid of cap.prerequisiteLessonIds) assert.ok(lessonIdx.has(pid));
    for (const rid of cap.recommendedLessonIds) assert.ok(lessonIdx.has(rid));
    for (const nid of cap.recommendedNextLessonIds) assert.ok(lessonIdx.has(nid));
    assert.ok(cap.stages.length >= 3);
    const totalPts = cap.rubricCriteria.reduce((s, r) => s + r.maxPoints, 0);
    assert.equal(totalPts, 100, `Capstone ${cap.id} rubric must total 100 points`);
    for (const art of cap.evidenceArtifacts) {
      const lineCount = art.content.split('\n').length;
      for (const ln of art.targetLineNumbers || []) {
        assert.ok(ln >= 1 && ln <= lineCount, `${cap.id} ${art.id} target line ${ln} out of 1..${lineCount}`);
      }
    }
  }

  assert.equal(isBlockedAppPath('/src/data/capstones.ts', 'dev'), true);
  assert.equal(isBlockedAppPath('/src/server/capstones.ts', 'prod'), true);
  assert.equal(isBlockedAppPath('/@id/src/data/capstones.ts', 'dev'), true);
  assert.equal(isBlockedAppPath('/src/data/curriculumAssessmentEnhancer.ts', 'dev'), true);

  pass(
    'Capstones & Non-Oracle Logic',
    '4 Capstones & Server Path Isolation Verified',
    'Verified non-oracle quiz/lab failure outputs, 4 capstones with 100-pt rubrics & line-bounded evidence artifacts, and blocked module path guards'
  );

  // =========================================================================
  // 4. PUBLIC API SANITIZATION & CLIENT BUNDLE ANTI-LEAKAGE
  // =========================================================================
  const publicCapPayload = getPublicCapstonesPayload();
  const capJson = JSON.stringify(publicCapPayload);
  for (const forbidden of [
    'targetLineNumbers',
    'correctIndex',
    'optionFeedback',
    'partialCreditIndices',
    'expectedKeywords',
    'detailedSolutionExplanation',
  ]) {
    assert.equal(capJson.includes(`"${forbidden}"`), false, `/api/capstones leaked ${forbidden}`);
  }

  const currJson = JSON.stringify(publicPayload);
  for (const forbidden of [
    'correctOption',
    'correctIndex',
    'optionFeedback',
    'partialCreditIndices',
    'suspiciousEntryId',
    'analysisNote',
    'correlationSummary',
    'artifactHighlightLines',
    'artifactLineRationales',
  ]) {
    assert.equal(currJson.includes(`"${forbidden}"`), false, `/api/curriculum leaked ${forbidden}`);
  }

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
    for (const tok of [
      'correctOption',
      'correctIndex',
      'suspiciousEntryId',
      'artifactHighlightLines',
      'artifactLineRationales',
      'optionFeedback',
      'expectedKeywords',
      'targetLineNumbers',
    ]) {
      assert.equal(raw.includes(tok), false, `${df} leaked forbidden token ${tok}`);
    }
  }

  pass(
    'Bundle & Payload Security',
    'Public Payloads & dist/client Anti-Leakage',
    'Zero answer keys, hidden evidence targets, optionFeedback arrays, or rubric keywords present in API payloads or built client assets'
  );

  // =========================================================================
  // 5. LIVE TEMP-DB HTTP INTEGRATION (LAB FEEDBACK + FULL CAPSTONE WORKFLOW)
  // =========================================================================
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-p24-test-'));
  const tmpDbPath = path.join(tmpDir, 'database.json');
  fs.copyFileSync(path.join(rootDir, 'backups', 'pre-phase1', 'database.test-copy.json'), tmpDbPath);

  const srv = await startTempServer(tmpDbPath, {
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

  try {
    const client = new TestCookieClient(srv.baseUrl);
    const capPublicRes = await client.request('GET', '/api/capstones');
    assert.equal(capPublicRes.status, 200);
    assert.equal(capPublicRes.data.capstones.length, 4);

    const reg = await client.request('POST', '/api/auth/register', {
      email: 'phase24-runner@test.local',
      username: 'Phase24Runner',
      password: 'StrongPassword!2026',
    });
    assert.equal(reg.status, 201);

    // 5a. Capstone prerequisite enforcement (must return 403 when prerequisites incomplete)
    const capA = ACADEMY_CAPSTONES[0];
    const lockedRes = await client.request('POST', `/api/capstones/${capA.id}/evidence`, {
      stageId: capA.stages[0].id,
      artifactId: capA.evidenceArtifacts[0].id,
      selectedLines: capA.evidenceArtifacts[0].targetLineNumbers,
    });
    assert.equal(lockedRes.status, 403);
    assert.ok(Array.isArray(lockedRes.data.missingPrerequisites) && lockedRes.data.missingPrerequisites.length >= 1);

    // 5b. Non-oracle Quiz failure + Misconception Hints via HTTP
    const firstLesson = ACADEMY_CURRICULUM[0].topics[0].lessons[0];
    const wrongQuizPayload = Object.fromEntries(
      firstLesson.quiz.map((q) => [q.id, (q.correctOption! + 1) % 4])
    );
    const quizFailHttp = await client.request('POST', '/api/user/engage', {
      engagementType: 'submit_quiz',
      lessonId: firstLesson.id,
      answers: wrongQuizPayload,
    });
    assert.equal(quizFailHttp.status, 400);
    assert.equal(quizFailHttp.data.questionFeedback, undefined, 'HTTP 400 quiz fail leaked questionFeedback');
    assert.ok(Array.isArray(quizFailHttp.data.misconceptionHints) && quizFailHttp.data.misconceptionHints.length >= 1);
    assert.ok(Array.isArray(quizFailHttp.data.recommendedSections) && quizFailHttp.data.recommendedSections.length >= 1);

    // 5c. Lab diagram exploration + Non-oracle Lab challenge failure + reviewSection via HTTP
    const firstLab = getPracticalLabForLesson(firstLesson.id)!;
    const reqDiagram = getRequiredDiagramItemCount(firstLab);
    for (const it of firstLab.diagramItems!.slice(0, reqDiagram)) {
      const expRes = await client.request('POST', '/api/assessments/explore-lab', {
        lessonId: firstLesson.id,
        labId: firstLab.id,
        action: 'explore_diagram_item',
        itemId: it.id,
      });
      assert.equal(expRes.status, 200);
    }

    const labWrongHttp = await client.request('POST', '/api/user/engage', {
      engagementType: 'complete_exercise',
      lessonId: firstLesson.id,
      exerciseId: firstLab.id,
      selectedOption: (firstLab.challenge.correctIndex! + 1) % 4,
    });
    assert.equal(labWrongHttp.status, 400);
    assert.equal(labWrongHttp.data.explanation, undefined, 'HTTP 400 lab fail leaked explanation');
    assert.ok(typeof labWrongHttp.data.misconceptionFeedback === 'string' && labWrongHttp.data.misconceptionFeedback.length > 10);
    assert.ok(typeof labWrongHttp.data.reviewSection === 'string' && labWrongHttp.data.reviewSection.length > 0);

    // 5d. Scenario lab line rationales (revealed strictly on exact match) & Log investigation analysisNote/correlationSummary
    const completed = new Set<string>();
    await unlockLessonAndCompleteLab(client, 'win-arch', completed, lessonIdx);
    const winLab = getPracticalLabForLesson('win-arch')!;
    const badScen = await client.request('POST', '/api/assessments/explore-lab', {
      lessonId: 'win-arch',
      labId: winLab.id,
      action: 'verify_scenario_lines',
      selectedLines: [1],
    });
    assert.equal(badScen.status, 200);
    assert.equal(badScen.data.scenarioResult.verified, false);
    assert.equal(badScen.data.scenarioResult.lineRationales, undefined);

    const goodScen = await client.request('POST', '/api/assessments/explore-lab', {
      lessonId: 'win-arch',
      labId: winLab.id,
      action: 'verify_scenario_lines',
      selectedLines: winLab.artifactHighlightLines,
    });
    assert.equal(goodScen.status, 200);
    assert.equal(goodScen.data.scenarioResult.verified, true);
    assert.ok(goodScen.data.scenarioResult.lineRationales?.[String(winLab.artifactHighlightLines![0])]);

    await unlockLessonAndCompleteLab(client, 'linux-log-filtering', completed, lessonIdx);
    const linLogLabObj = getPracticalLabForLesson('linux-log-filtering')!;
    const benignEntry = linLogLabObj.logEntries!.find((e) => !e.isSuspicious)!;
    const benignRes = await client.request('POST', '/api/assessments/verify-log', {
      lessonId: 'linux-log-filtering',
      labId: linLogLabObj.id,
      entryId: benignEntry.id,
    });
    assert.equal(benignRes.status, 200);
    assert.equal(benignRes.data.isTarget, false);
    assert.ok(typeof benignRes.data.analysisNote === 'string' && benignRes.data.analysisNote.length > 10);
    assert.equal(benignRes.data.correlationSummary, undefined);

    const targetRes = await client.request('POST', '/api/assessments/verify-log', {
      lessonId: 'linux-log-filtering',
      labId: linLogLabObj.id,
      entryId: linLogLabObj.suspiciousEntryId,
    });
    assert.equal(targetRes.status, 200);
    assert.equal(targetRes.data.isTarget, true);
    assert.ok(typeof targetRes.data.correlationSummary === 'string' && targetRes.data.correlationSummary.length > 20);

    // 5e. Full Capstone A execution + Stage Revisiting + Anti-XP-Farming
    for (const prereqId of capA.prerequisiteLessonIds) {
      await unlockLessonAndCompleteLab(client, prereqId, completed, lessonIdx);
    }

    for (const stage of capA.stages) {
      for (const artId of stage.evidenceArtifactIds) {
        const art = capA.evidenceArtifacts.find((a) => a.id === artId)!;
        const evRes = await client.request('POST', `/api/capstones/${capA.id}/evidence`, {
          stageId: stage.id,
          artifactId: art.id,
          selectedLines: art.targetLineNumbers,
        });
        assert.equal(evRes.status, 200, `Evidence verify failed for ${stage.id}/${art.id}: ${JSON.stringify(evRes.data)}`);
        assert.equal(evRes.data.verified, true);
      }

      const wrongStageOpt = (stage.knowledgeCheck.correctIndex! + 1) % 4;
      const failCheck = await client.request('POST', `/api/capstones/${capA.id}/stage-check`, {
        stageId: stage.id,
        selectedOption: wrongStageOpt,
      });
      assert.equal(failCheck.status, 200);
      assert.equal(failCheck.data.correct, false);
      assert.ok(failCheck.data.misconceptionFeedback);
      assert.equal(failCheck.data.explanation, undefined);

      const passCheck = await client.request('POST', `/api/capstones/${capA.id}/stage-check`, {
        stageId: stage.id,
        selectedOption: stage.knowledgeCheck.correctIndex,
      });
      assert.equal(passCheck.status, 200);
      assert.equal(passCheck.data.correct, true);
      assert.equal(passCheck.data.xpAwarded, stage.xpReward);
    }

    // Revisit Stage 1 safely with zero extra XP
    const revisitRes = await client.request('POST', `/api/capstones/${capA.id}/stage-check`, {
      stageId: capA.stages[0].id,
      selectedOption: capA.stages[0].knowledgeCheck.correctIndex,
    });
    assert.equal(revisitRes.status, 200);
    assert.equal(revisitRes.data.xpAwarded, 0, 'Stage revisit must never award duplicate XP');

    // Reject overly short report (400)
    const briefReport = await client.request('POST', `/api/capstones/${capA.id}/submit`, {
      sections: Object.fromEntries(capA.deliverableTemplate.sections.map((s) => [s.key, 'too short report text'])),
    });
    assert.equal(briefReport.status, 400);

    // Submit strong grounded report covering rubric keywords
    const strongReportSections = Object.fromEntries(
      capA.deliverableTemplate.sections.map((s) => [
        s.key,
        `Incident investigation findings: Password spray against m.patel from 198.51.100.77 succeeded with Event ID 4624 logon and 4625 failures, followed by suspicious PowerShell encodedcommand / Win32_Process / rundll32 staging under svchost.exe and lsass access indicators. Remediation: reset compromised session/password, isolate wkst-fin-14 containment host, enforce MFA Conditional Access, lockout threshold, and Windows Event Log Sysmon Script Block Logging monitoring.`,
      ])
    );
    const submitPass = await client.request('POST', `/api/capstones/${capA.id}/submit`, {
      sections: strongReportSections,
    });
    assert.equal(submitPass.status, 200, `Submit failed: ${JSON.stringify(submitPass.data)}`);
    assert.equal(submitPass.data.passed, true);
    assert.ok(submitPass.data.score >= 70);
    assert.equal(submitPass.data.xpAwarded, capA.xpReward);
    assert.ok(typeof submitPass.data.detailedSolutionExplanation === 'string' && submitPass.data.detailedSolutionExplanation.length > 40);

    // Duplicate final submission awards 0 extra XP
    const resubmit = await client.request('POST', `/api/capstones/${capA.id}/submit`, {
      sections: strongReportSections,
    });
    assert.equal(resubmit.status, 200);
    assert.equal(resubmit.data.xpAwarded, 0, 'Capstone resubmission must never award duplicate XP');

    pass(
      'Live HTTP Integration',
      'Quiz/Lab Feedback + Log/Scenario + Full Capstone E2E',
      `Verified HTTP 403 prereq enforcement, non-oracle misconceptions, log/scenario conditional reveals, Stage 1 revisit, rubric score=${submitPass.data.score}/100, and anti-XP-farming`
    );
  } finally {
    srv.server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  // =========================================================================
  // 6. PRODUCTION database.json BYTE-FOR-BYTE SHA-256 PRESERVATION
  // =========================================================================
  const liveDbBytes = fs.readFileSync(path.join(rootDir, 'database.json'));
  const backupDbBytes = fs.readFileSync(
    path.join(rootDir, 'backups', 'pre-phase2.4-20261119-014000', 'database.json')
  );
  const liveHash = crypto.createHash('sha256').update(liveDbBytes).digest('hex');
  const backupHash = crypto.createHash('sha256').update(backupDbBytes).digest('hex');
  assert.equal(liveHash, backupHash, 'database.json must remain byte-for-byte identical to pre-Phase 2.4 backup');

  pass(
    'Data Preservation',
    'Production database.json Byte-Identical Check',
    `SHA-256 verified identical (${liveHash})`
  );

  console.log(`\nALL ${results.length} PHASE 2.4 VERIFICATION SUITES PASSED.`);
}

runTests().catch((err) => {
  console.error('Phase 2.4 verification failed:', err);
  process.exit(1);
});
