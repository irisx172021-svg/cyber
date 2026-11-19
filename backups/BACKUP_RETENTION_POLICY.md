# CyberFoundations Academy — Backup & Credential Hygiene Policy

## 1. Policy Overview
- **Zero Plaintext Credentials at Rest**: Neither active `database.json` nor any historical or auto-generated JSON backup under `backups/` may store plaintext user passcodes. All credentials are stored as salted `scrypt` hashes (`scrypt$<saltHex>$<derivedKeyHex>`) or `[REDACTED_PLAINTEXT_REMOVED]` markers when an account cannot be matched to a migrated hash.
- **Preservation of Learner Recoverability**: Historical pre-Phase 1 and auto-migration snapshots are preserved intact for learner data recovery (accounts, XP, streaks, completed modules, lab notes, posts, timeline events, and study groups).
- **Pre-Migration Sanitization**: Whenever `ensureMigrationBackup()` creates a pre-migration snapshot in `backups/auto-migrations/`, `sanitizeDbCredentialsForBackup()` scrubs any plaintext password fields before writing to disk with `0600` file permissions.

## 2. Retention Rules
| Directory | Contents | Retention Rule |
| :--- | :--- | :--- |
| `backups/pre-phase1/` | `database.pre-phase1.json`, `database.test-copy.json`, `curriculum/*` | Retained permanently as baseline pre-migration recovery & verification fixtures (credentials sanitized). |
| `backups/auto-migrations/` | `database.pre-v<N>.<timestamp>.json` | Bounded retention: keeps at most **5** (`MAX_AUTO_MIGRATION_BACKUPS`) most recent snapshots; oldest snapshots are rotated out automatically. |
| Root (`database.json.corrupt.<timestamp>.json`) | Created only if `database.json` fails JSON parsing | Preserved on disk and startup halts (`readExistingDbSafe` throws) so administrators can inspect/recover without silent data loss. |

## 3. Phase 1.5 Historical Backup Audit & Disposition
All backup files under `backups/` were inspected and processed during Phase 1.5:
1. `backups/pre-phase1/database.pre-phase1.json` — **Retained & Transformed**: 6 legacy plaintext `passwordHash` fields replaced atomically with each account's migrated `scrypt$` hash. All learner progress, notes, posts, timeline, and groups preserved.
2. `backups/pre-phase1/database.test-copy.json` — **Retained & Transformed**: 6 legacy plaintext `passwordHash` fields replaced atomically with each account's migrated `scrypt$` hash. v1 schema structure preserved for migration & test suites.
3. `backups/auto-migrations/database.pre-v2.2026-11-14T15-31-18-350Z.json` — **Retained & Transformed**: 6 plaintext `passwordHash` fields replaced atomically with migrated `scrypt$` hashes.
4. `backups/auto-migrations/database.pre-v2.2026-11-14T15-35-21-376Z.json` — **Retained & Transformed**: 6 plaintext `passwordHash` fields replaced atomically with migrated `scrypt$` hashes.
5. `backups/auto-migrations/database.pre-v2.2026-11-14T15-40-59-866Z.json` — **Retained & Transformed**: 6 plaintext `passwordHash` fields replaced atomically with migrated `scrypt$` hashes.
6. `backups/pre-phase1/curriculum/*` — **Retained Unmodified**: Static TypeScript curriculum backup files; contain no user records or credentials.
