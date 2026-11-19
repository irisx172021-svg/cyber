import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Per-file promise mutex queue preventing concurrent read-modify-write races
const dbMutexQueues = new Map<string, Promise<void>>();

export async function withDbLock<T>(dbPath: string, task: () => Promise<T> | T): Promise<T> {
  const resolvedPath = path.resolve(dbPath);
  const previous = dbMutexQueues.get(resolvedPath) || Promise.resolve();

  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });

  // Ensure queue always advances even if previous fails
  const tail = previous.then(() => current, () => current);
  dbMutexQueues.set(resolvedPath, tail);

  await previous.catch(() => {});
  try {
    return await task();
  } finally {
    release();
    if (dbMutexQueues.get(resolvedPath) === tail) {
      dbMutexQueues.delete(resolvedPath);
    }
  }
}

/**
 * Atomic, validated JSON persistence:
 * 1. Serializes & validates JSON parses cleanly before touching disk.
 * 2. Writes to a unique temporary file with fsyncSync.
 * 3. Reads back & verifies byte length and valid JSON parse of the temporary file.
 * 4. Atomically renames temp file over dbPath.
 * 5. Never overwrites existing dbPath on failure and never swallows errors.
 */
export function saveDbAtomic(data: unknown, dbPath: string): void {
  const serialized = JSON.stringify(data, null, 2);
  // Sanity-check serialized output in memory first
  JSON.parse(serialized);

  const dir = path.dirname(dbPath);
  fs.mkdirSync(dir, { recursive: true });

  const nonce = crypto.randomBytes(6).toString('hex');
  const tmpPath = `${dbPath}.tmp.${process.pid}.${Date.now()}.${nonce}`;
  const expectedBytes = Buffer.byteLength(serialized, 'utf-8');

  let fd: number | null = null;
  try {
    fd = fs.openSync(tmpPath, 'w', 0o600);
    fs.writeFileSync(fd, serialized, 'utf-8');
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    fd = null;

    const stat = fs.statSync(tmpPath);
    if (stat.size !== expectedBytes) {
      throw new Error(`Atomic DB write byte mismatch: expected ${expectedBytes}, got ${stat.size}`);
    }

    // Validate written file content before atomic swap
    const writtenText = fs.readFileSync(tmpPath, 'utf-8');
    JSON.parse(writtenText);

    fs.renameSync(tmpPath, dbPath);
  } catch (err) {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        // ignore close error
      }
    }
    try {
      if (fs.existsSync(tmpPath)) {
        fs.unlinkSync(tmpPath);
      }
    } catch {
      // ignore cleanup error
    }
    throw err;
  }
}

/**
 * Reads an existing JSON database safely:
 * - Preserves corrupt database files by copying to `.corrupt.<stamp>.json` and throwing
 *   (never silently resets an existing corrupt file to defaults).
 * - Quarantines/removes stale orphaned `.tmp.` files left behind by interrupted writes without
 *   touching the committed primary database file.
 */
export function readExistingDbSafe(dbPath: string): { exists: true; data: any } | { exists: false } {
  const dir = path.dirname(dbPath);
  const baseName = path.basename(dbPath);

  if (fs.existsSync(dir)) {
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith(`${baseName}.tmp.`)) {
          const orphanTmpPath = path.join(dir, entry);
          try {
            fs.unlinkSync(orphanTmpPath);
          } catch {
            // ignore orphan cleanup errors
          }
        }
      }
    } catch {
      // ignore directory scan issues
    }
  }

  if (!fs.existsSync(dbPath)) {
    return { exists: false };
  }

  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Parsed database payload is not a JSON object.');
    }
    return { exists: true, data: parsed };
  } catch (err) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const corruptBackup = `${dbPath}.corrupt.${stamp}.json`;
    try {
      fs.copyFileSync(dbPath, corruptBackup);
    } catch {
      // ignore copy error
    }
    console.error(`Failed to parse ${dbPath}. Corrupt file backed up to ${corruptBackup}.`, err);
    throw err;
  }
}
