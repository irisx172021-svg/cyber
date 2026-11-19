import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {
  DbSchema,
  migrateAccountPasswordsToScrypt,
  sanitizeDbCredentialsForBackup,
} from '../src/server/migration';
import { isRedactedCredentialMarker, isScryptHash } from '../src/server/auth';
import { readExistingDbSafe, saveDbAtomic, withDbLock } from '../src/server/persistence';

function collectJsonFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectJsonFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(full);
    }
  }
  return results.sort();
}

async function runMigration() {
  const rootDir = process.cwd();
  const dbPath = path.join(rootDir, 'database.json');
  const backupsDir = path.join(rootDir, 'backups');

  // 1. Migrate active database.json passwords atomically & idempotently
  const summary = await withDbLock(dbPath, () => {
    const existing = readExistingDbSafe(dbPath);
    assert.equal(existing.exists, true, 'Active database.json must exist before migration.');
    const beforeDb = existing.data as DbSchema;

    const beforeSnapshot = beforeDb.accounts.map((acc) => ({
      id: acc.user.id,
      username: acc.user.username,
      xp: acc.user.xp,
      streak: acc.user.streak,
      notesCount: acc.labNotes?.length || 0,
      completedCount: acc.progress?.completedLessonIds?.length || acc.user.verifiedTopics?.length || 0,
      wasScrypt: isScryptHash(acc.passwordHash),
    }));

    const firstPass = migrateAccountPasswordsToScrypt(beforeDb);

    if (firstPass.upgradedCount > 0) {
      saveDbAtomic(firstPass.db, dbPath);
    }

    // Re-read from disk to verify persistence and test idempotency
    const reloaded = readExistingDbSafe(dbPath);
    assert.equal(reloaded.exists, true);
    const afterDb = reloaded.data as DbSchema;

    const secondPass = migrateAccountPasswordsToScrypt(afterDb);
    assert.equal(secondPass.upgradedCount, 0, 'Password migration must be idempotent on second pass.');
    assert.equal(secondPass.skippedCount, 0, 'No active account may have missing/redacted password.');
    assert.equal(
      secondPass.alreadyHashedCount,
      afterDb.accounts.length,
      'Every active account must have a salted scrypt hash.'
    );

    assert.equal(afterDb.accounts.length, beforeDb.accounts.length);
    assert.equal(afterDb.posts.length, beforeDb.posts.length);
    assert.equal(afterDb.timelineEvents.length, beforeDb.timelineEvents.length);
    assert.equal(afterDb.groups.length, beforeDb.groups.length);

    for (let i = 0; i < beforeSnapshot.length; i++) {
      const b = beforeSnapshot[i];
      const a = afterDb.accounts[i];
      assert.equal(a.user.id, b.id);
      assert.equal(a.user.xp, b.xp, `XP preserved for ${b.username}`);
      assert.equal(a.user.streak, b.streak, `Streak preserved for ${b.username}`);
      assert.equal(a.labNotes?.length || 0, b.notesCount, `Notes preserved for ${b.username}`);
      assert.equal(
        a.progress?.completedLessonIds?.length || a.user.verifiedTopics?.length || 0,
        b.completedCount,
        `Completed lessons preserved for ${b.username}`
      );
      assert.equal(isScryptHash(a.passwordHash), true, `Scrypt hash verified for ${b.username}`);
    }

    const migratedHashByUserId = new Map<string, string>();
    for (const acc of afterDb.accounts) {
      migratedHashByUserId.set(acc.user.id, acc.passwordHash);
    }

    return {
      totalAccounts: afterDb.accounts.length,
      upgradedCount: firstPass.upgradedCount,
      alreadyHashedCount: firstPass.alreadyHashedCount,
      upgradedUsers: afterDb.accounts
        .filter((a) => firstPass.upgradedUserIds.includes(a.user.id))
        .map((a) => a.user.username),
      migratedHashByUserId,
    };
  });

  console.log(
    `[DB] Active database.json verified: totalAccounts=${summary.totalAccounts}, upgraded=${summary.upgradedCount}, alreadyHashed=${summary.alreadyHashedCount}`
  );

  // 2. Transform every backup JSON file containing accounts so zero plaintext passwords remain
  const backupJsonFiles = collectJsonFiles(backupsDir);
  const backupReport: Array<{
    relativePath: string;
    accountsChecked: number;
    sanitizedCount: number;
    hasCredentialsField: boolean;
  }> = [];

  for (const filePath of backupJsonFiles) {
    const rel = path.relative(rootDir, filePath);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (parsed && Array.isArray(parsed.accounts)) {
      const { db: sanitized, redactedCount } = sanitizeDbCredentialsForBackup(
        parsed,
        summary.migratedHashByUserId
      );
      if (redactedCount > 0) {
        saveDbAtomic(sanitized, filePath);
      }

      // Verify after write
      const verified = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      for (const acc of verified.accounts) {
        const safe = isScryptHash(acc.passwordHash) || isRedactedCredentialMarker(acc.passwordHash);
        assert.equal(
          safe,
          true,
          `Plaintext password detected after sanitization in ${rel} for user ${acc.user?.username || 'unknown'}`
        );
      }

      backupReport.push({
        relativePath: rel,
        accountsChecked: verified.accounts.length,
        sanitizedCount: redactedCount,
        hasCredentialsField: true,
      });
    } else {
      backupReport.push({
        relativePath: rel,
        accountsChecked: 0,
        sanitizedCount: 0,
        hasCredentialsField: false,
      });
    }
  }

  for (const item of backupReport) {
    console.log(
      `[BACKUP] ${item.relativePath}: hasAccounts=${item.hasCredentialsField}, accounts=${item.accountsChecked}, sanitized=${item.sanitizedCount}`
    );
  }
}

runMigration().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
