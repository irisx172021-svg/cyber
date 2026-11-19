import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { DbSchema, migrateDatabaseSchema, needsSchemaMigration } from '../src/server/migration';
import { ACADEMY_CURRICULUM } from '../src/data/curriculum';
import { DEFAULT_TIMELINE_EVENTS, DEFAULT_COMMUNITY_POSTS } from '../src/data/initialState';
import { hashPasswordSync } from '../src/server/auth';
import { CreateApiAppOptions } from '../server';
import { TestCookieClient } from './testHttpClient';

process.env.CFA_NO_LISTEN = '1';

const TEST_SECRET = 'phase1_9b_group_privacy_test_secret_32ch';

async function startTempServer(dbPath: string, options?: CreateApiAppOptions) {
  const { createApiApp } = await import('../server');
  const app = createApiApp(dbPath, {
    sessionSecret: TEST_SECRET,
    ...options,
  });
  const server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address() as { port: number };
  return { server, baseUrl: `http://127.0.0.1:${addr.port}` };
}

async function reqJson(
  baseUrl: string,
  method: string,
  route: string,
  body?: unknown,
  client?: TestCookieClient,
  extraHeaders?: Record<string, string>
) {
  const activeClient = client ?? new TestCookieClient(baseUrl);
  return activeClient.request(method, route, body, extraHeaders);
}

function assertNoInternalIds(rawText: string, context: string) {
  assert.equal(rawText.includes('"ownerId"'), false, `${context}: must NOT expose ownerId`);
  assert.equal(rawText.includes('"senderId"'), false, `${context}: must NOT expose senderId`);
}

function makeSeedDb(targetPath: string) {
  const pwHash = hashPasswordSync('StrongOperatorPass!2026');
  const seed: DbSchema = {
    schemaVersion: 2,
    accounts: [
      {
        email: 'owner@test.local',
        passwordHash: pwHash,
        tokenVersion: 1,
        user: {
          id: 'usr-owner',
          username: '@OwnerAlpha',
          email: 'owner@test.local',
          rank: 'Tier 3 Operator',
          level: 8,
          completion: 15,
          xp: 3500,
          streak: 4,
          lastActiveDate: null,
          following: [],
          followers: [],
          verifiedTopics: [],
        },
        progress: {
          completedLessonIds: [],
          completedExerciseIds: [],
          completedQuizLessonIds: [],
          completedHomeworkLessonIds: [],
          xp: 3500,
          streak: 4,
          lastActiveDate: null,
          schemaVersion: 2,
          awardedXpEventIds: [],
          postXpDailyLog: {},
        },
        labNotes: [],
      },
      {
        email: 'member@test.local',
        passwordHash: pwHash,
        tokenVersion: 1,
        user: {
          id: 'usr-member',
          username: '@MemberBravo',
          email: 'member@test.local',
          rank: 'Tier 2 Operator',
          level: 3,
          completion: 7,
          xp: 1200,
          streak: 2,
          lastActiveDate: null,
          following: [],
          followers: [],
          verifiedTopics: [],
        },
        progress: {
          completedLessonIds: [],
          completedExerciseIds: [],
          completedQuizLessonIds: [],
          completedHomeworkLessonIds: [],
          xp: 1200,
          streak: 2,
          lastActiveDate: null,
          schemaVersion: 2,
          awardedXpEventIds: [],
          postXpDailyLog: {},
        },
        labNotes: [],
      },
      {
        email: 'outsider@test.local',
        passwordHash: pwHash,
        tokenVersion: 1,
        user: {
          id: 'usr-outsider',
          username: '@OutsiderCharlie',
          email: 'outsider@test.local',
          rank: 'Tier 1 Cadet',
          level: 1,
          completion: 1,
          xp: 250,
          streak: 1,
          lastActiveDate: null,
          following: [],
          followers: [],
          verifiedTopics: [],
        },
        progress: {
          completedLessonIds: [],
          completedExerciseIds: [],
          completedQuizLessonIds: [],
          completedHomeworkLessonIds: [],
          xp: 250,
          streak: 1,
          lastActiveDate: null,
          schemaVersion: 2,
          awardedXpEventIds: [],
          postXpDailyLog: {},
        },
        labNotes: [],
      },
      {
        email: 'bystander@test.local',
        passwordHash: pwHash,
        tokenVersion: 1,
        user: {
          id: 'usr-bystander',
          username: '@BystanderDelta',
          email: 'bystander@test.local',
          rank: 'Tier 1 Cadet',
          level: 1,
          completion: 0,
          xp: 100,
          streak: 0,
          lastActiveDate: null,
          following: [],
          followers: [],
          verifiedTopics: [],
        },
        progress: {
          completedLessonIds: [],
          completedExerciseIds: [],
          completedQuizLessonIds: [],
          completedHomeworkLessonIds: [],
          xp: 100,
          streak: 0,
          lastActiveDate: null,
          schemaVersion: 2,
          awardedXpEventIds: [],
          postXpDailyLog: {},
        },
        labNotes: [],
      },
    ],
    posts: [...DEFAULT_COMMUNITY_POSTS],
    timelineEvents: [...DEFAULT_TIMELINE_EVENTS],
    groups: [],
    revokedSessions: [],
  };
  fs.writeFileSync(targetPath, JSON.stringify(seed, null, 2), 'utf-8');
}

async function login(baseUrl: string, email: string): Promise<TestCookieClient> {
  const client = new TestCookieClient(baseUrl);
  const res = await client.request('POST', '/api/auth/login', {
    email,
    password: 'StrongOperatorPass!2026',
  });
  assert.equal(res.status, 200, `Login failed for ${email}: ${res.rawText}`);
  assert.equal(res.data.token, undefined);
  assert.ok(client.cookies.has('cfa_session'));
  return client;
}

async function runTests() {
  const rootDir = process.cwd();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfa-19b-'));

  const pass = (category: string, name: string, detail: string) => {
    console.log(`[PASS][${category}] ${name}: ${detail}`);
  };

  try {
    // =========================================================================
    // 1. CONSERVATIVE LEGACY MIGRATION & DATA PRESERVATION
    // =========================================================================
    const pre19bBackup = path.join(rootDir, 'backups', 'pre-phase1.9b', 'database.pre-phase1.9b.json');
    assert.ok(fs.existsSync(pre19bBackup), 'Expected pre-phase1.9b backup database file');
    const originalSnapshot = JSON.parse(fs.readFileSync(pre19bBackup, 'utf-8')) as DbSchema;

    const migrationTestDb = JSON.parse(JSON.stringify(originalSnapshot)) as DbSchema;
    assert.equal(
      needsSchemaMigration(migrationTestDb),
      true,
      'Legacy groups lacking visibility must require schema migration'
    );
    const mig1 = migrateDatabaseSchema(migrationTestDb, ACADEMY_CURRICULUM);
    assert.equal(mig1.changed, true);
    assert.equal(needsSchemaMigration(mig1.db), false, 'Second check must be clean');
    const mig2 = migrateDatabaseSchema(mig1.db, ACADEMY_CURRICULUM);
    assert.equal(mig2.changed, false, 'Migration must be idempotent on second run');

    assert.equal(mig1.db.accounts.length, originalSnapshot.accounts.length);
    for (let i = 0; i < originalSnapshot.accounts.length; i++) {
      assert.equal(mig1.db.accounts[i].user.id, originalSnapshot.accounts[i].user.id);
      assert.equal(mig1.db.accounts[i].progress.xp, originalSnapshot.accounts[i].progress.xp);
      assert.equal(mig1.db.accounts[i].progress.streak, originalSnapshot.accounts[i].progress.streak);
    }
    assert.equal(mig1.db.groups.length, originalSnapshot.groups.length);
    for (let i = 0; i < originalSnapshot.groups.length; i++) {
      const origG = originalSnapshot.groups[i];
      const migG = mig1.db.groups[i];
      assert.equal(migG.visibility, 'private', `Legacy group ${migG.id} must conservatively default to private`);
      assert.equal(migG.ownerId, origG.ownerId);
      assert.equal(migG.ownerHandle, origG.ownerHandle);
      assert.deepEqual(migG.members, origG.members);
      assert.deepEqual(migG.messages, origG.messages);
      assert.deepEqual(migG.invitations, []);
      assert.deepEqual(migG.joinRequests, []);
    }

    // Also confirm migration NEVER invents an owner if ownerId and ownerHandle are both missing
    const orphanDb: DbSchema = {
      schemaVersion: 2,
      accounts: [mig1.db.accounts[0]],
      posts: [],
      timelineEvents: [],
      groups: [
        {
          id: 'grp-orphan',
          name: 'Orphan Legacy Group',
          description: 'No owner metadata',
          avatar: '🔒',
          ownerHandle: '',
          members: ['@NetRunner_Zero'],
          messages: [],
          createdAt: new Date().toISOString(),
        } as any,
      ],
    };
    assert.equal(needsSchemaMigration(orphanDb), true);
    const orphanMig = migrateDatabaseSchema(orphanDb, ACADEMY_CURRICULUM);
    assert.equal(orphanMig.db.groups[0].visibility, 'private');
    assert.equal(orphanMig.db.groups[0].ownerId, undefined, 'Must never invent an ownerId');
    assert.equal(orphanMig.db.groups[0].ownerHandle, '', 'Must never invent an ownerHandle');
    assert.deepEqual(orphanMig.db.groups[0].members, ['@NetRunner_Zero']);

    pass(
      'Migration',
      'Conservative Legacy Group Migration & Preservation',
      `${mig1.db.groups.length} groups migrated safely to private, 0 messages/members/XP altered, idempotent`
    );

    // =========================================================================
    // 2. MAIN ENDPOINT AUTHORIZATION, VISIBILITY, INVITATIONS, REQUESTS
    // =========================================================================
    const mainDbPath = path.join(tmpDir, 'main-db.json');
    makeSeedDb(mainDbPath);
    const mainSrv = await startTempServer(mainDbPath);

    try {
      const ownerToken = await login(mainSrv.baseUrl, 'owner@test.local');
      const memberToken = await login(mainSrv.baseUrl, 'member@test.local');
      const outsiderToken = await login(mainSrv.baseUrl, 'outsider@test.local');
      const bystanderToken = await login(mainSrv.baseUrl, 'bystander@test.local');

      // 2a. Unauthenticated requests -> 401
      const unauthChecks: Array<[string, string, unknown?]> = [
        ['GET', '/api/groups'],
        ['GET', '/api/groups/grp-1'],
        ['GET', '/api/groups/grp-1/messages'],
        ['POST', '/api/groups', { name: 'X', description: 'Y' }],
        ['POST', '/api/groups/grp-1/join'],
        ['POST', '/api/groups/grp-1/invitations', { username: '@MemberBravo' }],
        ['POST', '/api/groups/grp-1/invitations/respond', { action: 'accept' }],
        ['POST', '/api/groups/grp-1/requests'],
        ['POST', '/api/groups/grp-1/requests/respond', { username: '@OutsiderCharlie', action: 'approve' }],
        ['POST', '/api/groups/grp-1/members', { username: '@MemberBravo' }],
        ['POST', '/api/groups/grp-1/messages', { content: 'hi' }],
      ];
      for (const [m, route, body] of unauthChecks) {
        const res = await reqJson(mainSrv.baseUrl, m, route, body);
        assert.equal(res.status, 401, `${m} ${route} without auth must return 401, got ${res.status}`);
      }
      pass('AuthN', 'Unauthenticated Group Endpoints Rejected', `${unauthChecks.length} routes returned 401`);

      // 2b. Validation & default private visibility + forged ownerId ignored
      const badName = await reqJson(
        mainSrv.baseUrl,
        'POST',
        '/api/groups',
        { name: 'A'.repeat(101), description: 'Valid desc' },
        ownerToken
      );
      assert.equal(badName.status, 400);

      const badDesc = await reqJson(
        mainSrv.baseUrl,
        'POST',
        '/api/groups',
        { name: 'Valid', description: 'B'.repeat(501) },
        ownerToken
      );
      assert.equal(badDesc.status, 400);

      const badVis = await reqJson(
        mainSrv.baseUrl,
        'POST',
        '/api/groups',
        { name: 'Valid', description: 'Valid', visibility: 'secret-mode' },
        ownerToken
      );
      assert.equal(badVis.status, 400);

      // Omit visibility -> conservative default 'private'; attempt forged ownerId -> ignored
      const createPriv = await reqJson(
        mainSrv.baseUrl,
        'POST',
        '/api/groups',
        {
          name: 'BlackVault Incident Room',
          description: 'Sensitive incident response channel',
          ownerId: 'usr-outsider',
          ownerHandle: '@OutsiderCharlie',
        },
        ownerToken
      );
      assert.equal(createPriv.status, 201);
      assertNoInternalIds(createPriv.rawText, 'POST /api/groups private');
      assert.equal(createPriv.data.visibility, 'private');
      assert.equal(createPriv.data.ownerHandle, '@OwnerAlpha');
      assert.equal(createPriv.data.isOwner, true);
      assert.equal(createPriv.data.isMember, true);
      const privId = createPriv.data.id as string;

      // Also create a PUBLIC group
      const createPub = await reqJson(
        mainSrv.baseUrl,
        'POST',
        '/api/groups',
        {
          name: 'Open Packet Workshop',
          description: 'Public study room for all cadets',
          visibility: 'public',
        },
        ownerToken
      );
      assert.equal(createPub.status, 201);
      assertNoInternalIds(createPub.rawText, 'POST /api/groups public');
      assert.equal(createPub.data.visibility, 'public');
      const pubId = createPub.data.id as string;

      pass(
        'Validation',
        'Group Creation Validation, Conservative Private Default & Owner Spoof Immunity',
        `Oversized/invalid rejected (400); omitted visibility -> private; forged ownerId ignored`
      );

      // 2c. Owner posts confidential message in private group & public message in public group
      const SECRET_MSG = 'TOP_SECRET_IOC_192_0_2_99_CONFIDENTIAL';
      const PUB_MSG = 'Welcome to the public workshop!';

      const tooLongMsg = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${privId}/messages`,
        { content: 'X'.repeat(2001) },
        ownerToken
      );
      assert.equal(tooLongMsg.status, 400);

      const postPrivMsg = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${privId}/messages`,
        { content: SECRET_MSG, senderId: 'usr-outsider' },
        ownerToken
      );
      assert.equal(postPrivMsg.status, 201);
      assertNoInternalIds(postPrivMsg.rawText, 'POST private message');
      assert.equal(postPrivMsg.data.senderUsername, '@OwnerAlpha');

      const postPubMsg = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${pubId}/messages`,
        { content: PUB_MSG },
        ownerToken
      );
      assert.equal(postPubMsg.status, 201);

      // 2d. Non-member cannot access private messages, private details, or self-join private group
      const outsiderList = await reqJson(mainSrv.baseUrl, 'GET', '/api/groups', undefined, outsiderToken);
      assert.equal(outsiderList.status, 200);
      assertNoInternalIds(outsiderList.rawText, 'GET /api/groups outsider');
      assert.equal(
        outsiderList.rawText.includes(SECRET_MSG),
        false,
        'Private group message history must NEVER appear in non-member GET /api/groups'
      );
      assert.equal(
        outsiderList.rawText.includes(PUB_MSG),
        false,
        'Even public group messages must stay hidden until user joins'
      );
      const privSummaryForOutsider = outsiderList.data.find((g: any) => g.id === privId);
      assert.ok(privSummaryForOutsider);
      assert.equal(privSummaryForOutsider.visibility, 'private');
      assert.deepEqual(privSummaryForOutsider.members, []);
      assert.deepEqual(privSummaryForOutsider.messages, []);
      assert.equal(privSummaryForOutsider.memberCount, undefined);
      assert.equal(privSummaryForOutsider.invitations, undefined);
      assert.equal(privSummaryForOutsider.joinRequests, undefined);
      assert.equal(privSummaryForOutsider.isMember, false);
      assert.equal(privSummaryForOutsider.isOwner, false);

      assert.equal((await reqJson(mainSrv.baseUrl, 'GET', `/api/groups/${privId}`, undefined, outsiderToken)).status, 403);
      assert.equal(
        (await reqJson(mainSrv.baseUrl, 'GET', `/api/groups/${privId}/messages`, undefined, outsiderToken)).status,
        403
      );
      assert.equal(
        (
          await reqJson(
            mainSrv.baseUrl,
            'POST',
            `/api/groups/${privId}/messages`,
            { content: 'intrusion' },
            outsiderToken
          )
        ).status,
        403
      );
      assert.equal(
        (await reqJson(mainSrv.baseUrl, 'POST', `/api/groups/${privId}/join`, undefined, outsiderToken)).status,
        403
      );
      assert.equal(
        (
          await reqJson(
            mainSrv.baseUrl,
            'POST',
            `/api/groups/${privId}/members`,
            { username: '@OutsiderCharlie' },
            outsiderToken
          )
        ).status,
        403
      );
      pass(
        'Privacy',
        'Private Group Redaction & Self-Join Blocking',
        'Non-members blocked (403) from private details, messages, posting, and self-joining; 0 secret leaks'
      );

      // 2e. Public group non-member read blocked until join; self-join allowed; messages unlocked
      assert.equal(
        (await reqJson(mainSrv.baseUrl, 'GET', `/api/groups/${pubId}/messages`, undefined, outsiderToken)).status,
        403
      );
      const pubDetailNonMember = await reqJson(mainSrv.baseUrl, 'GET', `/api/groups/${pubId}`, undefined, outsiderToken);
      assert.equal(pubDetailNonMember.status, 200);
      assert.deepEqual(pubDetailNonMember.data.messages, []);
      assert.deepEqual(pubDetailNonMember.data.members, []);

      const joinPub = await reqJson(mainSrv.baseUrl, 'POST', `/api/groups/${pubId}/join`, undefined, outsiderToken);
      assert.equal(joinPub.status, 200);
      assert.equal(joinPub.data.isMember, true);
      assert.equal(joinPub.data.messages.length, 1);

      // Also test public self-join via legacy /members endpoint for MemberBravo
      const joinPubLegacy = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${pubId}/members`,
        { username: '@MemberBravo' },
        memberToken
      );
      assert.equal(joinPubLegacy.status, 200);
      assert.equal(joinPubLegacy.data.isMember, true);

      pass(
        'Public Groups',
        'Public Discovery & Self-Join Flow',
        'Public messages locked until joined (403), unlocked immediately after joining via /join and /members'
      );

      // 2f. Owner invitation lifecycle + unauthorized member invite blocking
      // Non-member cannot invite
      assert.equal(
        (
          await reqJson(
            mainSrv.baseUrl,
            'POST',
            `/api/groups/${privId}/invitations`,
            { username: '@BystanderDelta' },
            outsiderToken
          )
        ).status,
        403
      );

      // Unknown invitee -> 404
      assert.equal(
        (
          await reqJson(
            mainSrv.baseUrl,
            'POST',
            `/api/groups/${privId}/invitations`,
            { username: '@NonExistentGhost' },
            ownerToken
          )
        ).status,
        404
      );

      // Invite MemberBravo -> 201
      const inviteMember = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${privId}/invitations`,
        { username: '@MemberBravo' },
        ownerToken
      );
      assert.equal(inviteMember.status, 201);
      assertNoInternalIds(inviteMember.rawText, 'POST /invitations');

      // Duplicate invite -> 409
      assert.equal(
        (
          await reqJson(
            mainSrv.baseUrl,
            'POST',
            `/api/groups/${privId}/invitations`,
            { username: '@MemberBravo' },
            ownerToken
          )
        ).status,
        409
      );

      // Invited user sees hasPendingInvite: true, still cannot view private messages before accepting
      const memberListBeforeAccept = await reqJson(mainSrv.baseUrl, 'GET', '/api/groups', undefined, memberToken);
      const privForInvited = memberListBeforeAccept.data.find((g: any) => g.id === privId);
      assert.equal(privForInvited.hasPendingInvite, true);
      assert.equal(privForInvited.isMember, false);
      assert.deepEqual(privForInvited.messages, []);
      assert.equal(
        (await reqJson(mainSrv.baseUrl, 'GET', `/api/groups/${privId}/messages`, undefined, memberToken)).status,
        403
      );

      // Uninvited user cannot hijack invitation response -> 403
      assert.equal(
        (
          await reqJson(
            mainSrv.baseUrl,
            'POST',
            `/api/groups/${privId}/invitations/respond`,
            { action: 'accept' },
            bystanderToken
          )
        ).status,
        403
      );

      // Invited user declines -> accepted: false, then owner re-invites and user accepts
      const declineRes = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${privId}/invitations/respond`,
        { action: 'decline' },
        memberToken
      );
      assert.equal(declineRes.status, 200);
      assert.equal(declineRes.data.accepted, false);
      assert.equal(declineRes.data.group.hasPendingInvite, false);

      const reInvite = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${privId}/invitations`,
        { username: '@MemberBravo' },
        ownerToken
      );
      assert.equal(reInvite.status, 201);

      const acceptRes = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${privId}/invitations/respond`,
        { action: 'accept' },
        memberToken
      );
      assert.equal(acceptRes.status, 200);
      assert.equal(acceptRes.data.accepted, true);
      assert.equal(acceptRes.data.group.isMember, true);
      assert.equal(acceptRes.data.group.messages.length, 1);

      // Inviting existing member -> 409
      assert.equal(
        (
          await reqJson(
            mainSrv.baseUrl,
            'POST',
            `/api/groups/${privId}/invitations`,
            { username: '@MemberBravo' },
            ownerToken
          )
        ).status,
        409
      );

      // Ordinary non-owner member CANNOT invite or add other users!
      assert.equal(
        (
          await reqJson(
            mainSrv.baseUrl,
            'POST',
            `/api/groups/${privId}/invitations`,
            { username: '@BystanderDelta' },
            memberToken
          )
        ).status,
        403
      );
      assert.equal(
        (
          await reqJson(
            mainSrv.baseUrl,
            'POST',
            `/api/groups/${privId}/members`,
            { username: '@BystanderDelta' },
            memberToken
          )
        ).status,
        403
      );

      // Ordinary member CAN read messages and post inside private group, without seeing invitations/joinRequests
      const memberDetail = await reqJson(mainSrv.baseUrl, 'GET', `/api/groups/${privId}`, undefined, memberToken);
      assert.equal(memberDetail.status, 200);
      assert.equal(memberDetail.data.invitations, undefined, 'Non-owner member must not see owner invitations');
      assert.equal(memberDetail.data.joinRequests, undefined, 'Non-owner member must not see owner joinRequests');

      const memberMsg = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${privId}/messages`,
        { content: 'MemberBravo reporting in.' },
        memberToken
      );
      assert.equal(memberMsg.status, 201);
      assertNoInternalIds(memberMsg.rawText, 'Member POST message');

      pass(
        'Invitations & RBAC',
        'Owner Invitations, Accept/Decline & Non-Owner Restrictions',
        'Non-owners blocked from inviting (403), uninvited respond blocked (403), duplicate/existing -> 409, unknown -> 404'
      );

      // 2g. Expired invitation check (backdate invitation expiresAt in DB)
      const invExpired = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${privId}/invitations`,
        { username: '@BystanderDelta' },
        ownerToken
      );
      assert.equal(invExpired.status, 201);
      const rawDb = JSON.parse(fs.readFileSync(mainDbPath, 'utf-8')) as DbSchema;
      const privGroupRecord = rawDb.groups.find((g) => g.id === privId)!;
      privGroupRecord.invitations![0].expiresAt = new Date(Date.now() - 60_000).toISOString();
      fs.writeFileSync(mainDbPath, JSON.stringify(rawDb, null, 2), 'utf-8');

      const acceptExpired = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${privId}/invitations/respond`,
        { action: 'accept' },
        bystanderToken
      );
      assert.equal(acceptExpired.status, 410, 'Expired invitation must return 410 Gone');
      pass('Expiration', 'Expired Group Invitations Rejected & Pruned', 'Backdated invite returned 410 Gone');

      // 2h. Join Request & Owner Approval Lifecycle
      const req1 = await reqJson(mainSrv.baseUrl, 'POST', `/api/groups/${privId}/requests`, undefined, outsiderToken);
      assert.equal(req1.status, 201);
      assert.equal(req1.data.hasPendingRequest, true);
      assertNoInternalIds(req1.rawText, 'POST /requests');

      // Duplicate join request -> 409
      assert.equal(
        (await reqJson(mainSrv.baseUrl, 'POST', `/api/groups/${privId}/requests`, undefined, outsiderToken)).status,
        409
      );

      // Non-owner member cannot approve/reject -> 403
      assert.equal(
        (
          await reqJson(
            mainSrv.baseUrl,
            'POST',
            `/api/groups/${privId}/requests/respond`,
            { username: '@OutsiderCharlie', action: 'approve' },
            memberToken
          )
        ).status,
        403
      );

      // Owner sees joinRequests and rejects first, then outsider re-requests and owner approves
      const ownerView = await reqJson(mainSrv.baseUrl, 'GET', `/api/groups/${privId}`, undefined, ownerToken);
      assert.equal(ownerView.data.joinRequests.length, 1);
      assert.equal(ownerView.data.joinRequests[0].username, '@OutsiderCharlie');

      const rejRes = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${privId}/requests/respond`,
        { username: '@OutsiderCharlie', action: 'reject' },
        ownerToken
      );
      assert.equal(rejRes.status, 200);
      assert.equal(rejRes.data.joinRequests.length, 0);

      const req2 = await reqJson(mainSrv.baseUrl, 'POST', `/api/groups/${privId}/requests`, undefined, outsiderToken);
      assert.equal(req2.status, 201);

      const appRes = await reqJson(
        mainSrv.baseUrl,
        'POST',
        `/api/groups/${privId}/requests/respond`,
        { username: '@OutsiderCharlie', action: 'approve' },
        ownerToken
      );
      assert.equal(appRes.status, 200);
      assert.equal(appRes.data.members.includes('@OutsiderCharlie'), true);

      const outsiderMsgs = await reqJson(
        mainSrv.baseUrl,
        'GET',
        `/api/groups/${privId}/messages`,
        undefined,
        outsiderToken
      );
      assert.equal(outsiderMsgs.status, 200);
      assertNoInternalIds(outsiderMsgs.rawText, 'Approved member GET /messages');
      assert.equal(outsiderMsgs.data.length, 2);

      pass(
        'Join Requests',
        'Private Group Join Request & Owner Approval Lifecycle',
        'Duplicate -> 409, non-owner approve -> 403, reject/re-request/approve works and unlocks messages'
      );

      // 2i. Concurrent membership requests race-safety
      const concPub = await reqJson(
        mainSrv.baseUrl,
        'POST',
        '/api/groups',
        { name: 'Race Public Squad', description: 'Concurrency test public', visibility: 'public' },
        ownerToken
      );
      const concPubId = concPub.data.id as string;
      const concJoins = await Promise.all([
        reqJson(mainSrv.baseUrl, 'POST', `/api/groups/${concPubId}/join`, undefined, bystanderToken),
        reqJson(mainSrv.baseUrl, 'POST', `/api/groups/${concPubId}/join`, undefined, bystanderToken),
        reqJson(mainSrv.baseUrl, 'POST', `/api/groups/${concPubId}/join`, undefined, bystanderToken),
      ]);
      assert.equal(concJoins.filter((r) => r.status === 200).length, 1, 'Only 1 concurrent join should succeed');
      assert.equal(concJoins.filter((r) => r.status === 409).length, 2, 'Remaining concurrent joins must get 409');

      const concPriv = await reqJson(
        mainSrv.baseUrl,
        'POST',
        '/api/groups',
        { name: 'Race Private Squad', description: 'Concurrency test private', visibility: 'private' },
        ownerToken
      );
      const concPrivId = concPriv.data.id as string;
      const concReqs = await Promise.all([
        reqJson(mainSrv.baseUrl, 'POST', `/api/groups/${concPrivId}/requests`, undefined, bystanderToken),
        reqJson(mainSrv.baseUrl, 'POST', `/api/groups/${concPrivId}/requests`, undefined, bystanderToken),
        reqJson(mainSrv.baseUrl, 'POST', `/api/groups/${concPrivId}/requests`, undefined, bystanderToken),
      ]);
      assert.equal(concReqs.filter((r) => r.status === 201).length, 1);
      assert.equal(concReqs.filter((r) => r.status === 409).length, 2);

      const concInvs = await Promise.all([
        reqJson(
          mainSrv.baseUrl,
          'POST',
          `/api/groups/${concPrivId}/invitations`,
          { username: '@MemberBravo' },
          ownerToken
        ),
        reqJson(
          mainSrv.baseUrl,
          'POST',
          `/api/groups/${concPrivId}/invitations`,
          { username: '@MemberBravo' },
          ownerToken
        ),
      ]);
      assert.equal(concInvs.filter((r) => r.status === 201).length, 1);
      assert.equal(concInvs.filter((r) => r.status === 409).length, 1);

      pass(
        'Concurrency',
        'Parallel Membership, Request & Invitation Deduplication',
        'Promise.all bursts produced zero duplicate members, requests, or invitations'
      );
    } finally {
      await new Promise<void>((resolve) => mainSrv.server.close(() => resolve()));
    }

    // =========================================================================
    // 3. GROUP CREATION & MESSAGE RATE LIMITING + ANTI-SPOOFING
    // =========================================================================
    const rlDbPath = path.join(tmpDir, 'rl-db.json');
    makeSeedDb(rlDbPath);
    const rlSrv = await startTempServer(rlDbPath, {
      trustProxy: false,
      rateLimits: {
        groupCreateUserMax: 2,
        groupCreateUserWindowMs: 60_000,
        groupCreateIpMax: 3,
        groupCreateIpWindowMs: 60_000,
        groupMessageUserMax: 3,
        groupMessageUserWindowMs: 60_000,
        groupMessageIpMax: 4,
        groupMessageIpWindowMs: 60_000,
      },
    });

    try {
      const ownerToken = await login(rlSrv.baseUrl, 'owner@test.local');
      const memberToken = await login(rlSrv.baseUrl, 'member@test.local');

      const g1 = await reqJson(
        rlSrv.baseUrl,
        'POST',
        '/api/groups',
        { name: 'RL Squad 1', description: 'Desc 1', visibility: 'public' },
        ownerToken
      );
      assert.equal(g1.status, 201);
      const g1Id = g1.data.id as string;

      const g2 = await reqJson(
        rlSrv.baseUrl,
        'POST',
        '/api/groups',
        { name: 'RL Squad 2', description: 'Desc 2' },
        ownerToken
      );
      assert.equal(g2.status, 201);

      // 3rd group creation by same user hits per-user limit (2) even with spoofed X-Forwarded-For
      const g3 = await reqJson(
        rlSrv.baseUrl,
        'POST',
        '/api/groups',
        { name: 'RL Squad 3', description: 'Desc 3' },
        ownerToken,
        { 'X-Forwarded-For': '203.0.113.50' }
      );
      assert.equal(g3.status, 429);
      assert.ok(g3.headers.get('retry-after'));

      // Different user from same loopback IP can create 1 more (reaching IP limit 3), then 2nd fails IP limit
      const g4 = await reqJson(
        rlSrv.baseUrl,
        'POST',
        '/api/groups',
        { name: 'RL Squad 4', description: 'Desc 4' },
        memberToken,
        { 'X-Forwarded-For': '203.0.113.99' }
      );
      assert.equal(g4.status, 201);
      const g5 = await reqJson(
        rlSrv.baseUrl,
        'POST',
        '/api/groups',
        { name: 'RL Squad 5', description: 'Desc 5' },
        memberToken,
        { 'X-Forwarded-For': '203.0.113.100' }
      );
      assert.equal(g5.status, 429);

      // Message rate limiting (user max 3, IP max 4)
      for (let i = 1; i <= 3; i++) {
        const m = await reqJson(
          rlSrv.baseUrl,
          'POST',
          `/api/groups/${g1Id}/messages`,
          { content: `msg ${i}` },
          ownerToken
        );
        assert.equal(m.status, 201);
      }
      const m4 = await reqJson(
        rlSrv.baseUrl,
        'POST',
        `/api/groups/${g1Id}/messages`,
        { content: 'msg 4 throttled' },
        ownerToken,
        { 'X-Forwarded-For': '198.51.100.22' }
      );
      assert.equal(m4.status, 429);
      assert.ok(m4.headers.get('retry-after'));

      pass(
        'Rate Limits',
        'Per-User & Per-IP Group Creation & Messaging Throttles',
        '429 + Retry-After enforced for both endpoints; spoofed X-Forwarded-For ignored when trustProxy=false'
      );
    } finally {
      await new Promise<void>((resolve) => rlSrv.server.close(() => resolve()));
    }

    // =========================================================================
    // 4. VERIFY REAL SERVER MIGRATION ON ISOLATED COPY OF PRODUCTION DATABASE
    // =========================================================================
    const liveCopyPath = path.join(tmpDir, 'prod-copy.json');
    fs.copyFileSync(pre19bBackup, liveCopyPath);
    const liveSrv = await startTempServer(liveCopyPath);
    try {
      // Trigger loadDb migration by registering/logging in or checking migrated JSON
      await reqJson(liveSrv.baseUrl, 'GET', '/api/posts');
      const migratedLiveCopy = JSON.parse(fs.readFileSync(liveCopyPath, 'utf-8')) as DbSchema;
      assert.equal(migratedLiveCopy.accounts.length, 6);
      assert.equal(migratedLiveCopy.groups.length, 2);
      assert.equal(migratedLiveCopy.groups[0].visibility, 'private');
      assert.equal(migratedLiveCopy.groups[0].messages.length, 2);
      assert.equal(migratedLiveCopy.groups[1].visibility, 'private');
      assert.equal(migratedLiveCopy.groups[1].messages.length, 1);

      pass(
        'Production Migration',
        '6 Accounts & 3 Historical Group Messages Preserved',
        'Verified full legacy DB migration through live server loadDb without data loss'
      );
    } finally {
      await new Promise<void>((resolve) => liveSrv.server.close(() => resolve()));
    }

    console.log('\n=== Phase 1.9B Group Privacy Verification Summary: ALL PASSED ===');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('\n[FAIL] Phase 1.9B verification failed:', err);
  process.exit(1);
});
