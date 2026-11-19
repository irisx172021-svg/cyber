import {
  Group,
  GroupInvitation,
  GroupJoinRequest,
  GroupMessage,
  GroupVisibility,
  User,
} from '../types';
import { AccountRecord } from './migration';

export const MAX_GROUP_NAME_LENGTH = 100;
export const MAX_GROUP_DESCRIPTION_LENGTH = 500;
export const MAX_GROUP_MESSAGE_LENGTH = 2000;
export const DEFAULT_INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const MAX_PENDING_INVITATIONS_PER_GROUP = 50;
export const MAX_PENDING_REQUESTS_PER_GROUP = 50;

export function normalizeHandle(raw: string): string {
  const cleaned = raw.trim().replace(/^@+/, '');
  return `@${cleaned}`.toLowerCase();
}

export function formatCanonicalHandle(raw: string): string {
  const cleaned = raw.trim().replace(/\s+/g, '_').replace(/^@+/, '');
  return `@${cleaned}`;
}

export function pruneExpiredInvitations(
  invitations: GroupInvitation[] | undefined,
  nowMs = Date.now()
): GroupInvitation[] {
  if (!Array.isArray(invitations)) return [];
  return invitations.filter((inv) => {
    if (!inv || typeof inv.username !== 'string' || typeof inv.expiresAt !== 'string') {
      return false;
    }
    const expMs = Date.parse(inv.expiresAt);
    return Number.isFinite(expMs) && expMs > nowMs;
  });
}

export function isGroupOwner(group: Group, user: User): boolean {
  if (typeof group.ownerId === 'string' && group.ownerId.trim().length > 0) {
    return group.ownerId === user.id;
  }
  if (typeof group.ownerHandle === 'string' && group.ownerHandle.trim().length > 0) {
    return normalizeHandle(group.ownerHandle) === normalizeHandle(user.username);
  }
  return false;
}

export function isGroupMember(group: Group, user: User): boolean {
  if (isGroupOwner(group, user)) {
    return true;
  }
  const userNorm = normalizeHandle(user.username);
  return (group.members || []).some(
    (m) => typeof m === 'string' && (normalizeHandle(m) === userNorm || m === user.id)
  );
}

export function sanitizeGroupMessage(msg: GroupMessage): GroupMessage {
  return {
    id: msg.id,
    senderUsername: msg.senderUsername,
    senderRole: msg.senderRole,
    content: msg.content,
    createdAt: msg.createdAt,
  };
}

/**
 * Produces a privacy-enforced, client-safe Group projection:
 * - Never exposes `ownerId` or `messages[*].senderId`
 * - Never exposes `messages` or `members` to non-members
 * - Never exposes `memberCount` of private groups to non-members
 * - Exposes `invitations` and `joinRequests` strictly to the group owner
 * - Exposes only boolean `hasPendingInvite` / `hasPendingRequest` for the requesting user
 */
export function sanitizeGroupForUser(
  group: Group,
  requesterUser: User,
  nowMs = Date.now()
): Group {
  const visibility: GroupVisibility = group.visibility === 'public' ? 'public' : 'private';
  const owner = isGroupOwner(group, requesterUser);
  const member = isGroupMember(group, requesterUser);
  const requesterNorm = normalizeHandle(requesterUser.username);
  const activeInvitations = pruneExpiredInvitations(group.invitations, nowMs);
  const pendingRequests = Array.isArray(group.joinRequests) ? group.joinRequests : [];

  const hasPendingInvite =
    !member && activeInvitations.some((inv) => normalizeHandle(inv.username) === requesterNorm);
  const hasPendingRequest =
    !member && pendingRequests.some((req) => normalizeHandle(req.username) === requesterNorm);

  const sanitizedMessages = member ? (group.messages || []).map(sanitizeGroupMessage) : [];
  const sanitizedMembers = member ? [...(group.members || [])] : [];
  const memberCount =
    member || visibility === 'public' ? (group.members || []).length : undefined;

  const result: Group = {
    id: group.id,
    name: group.name,
    description: group.description,
    avatar: group.avatar,
    visibility,
    ownerHandle: group.ownerHandle,
    members: sanitizedMembers,
    ...(memberCount !== undefined ? { memberCount } : {}),
    messages: sanitizedMessages,
    isMember: member,
    isOwner: owner,
    hasPendingInvite,
    hasPendingRequest,
    createdAt: group.createdAt,
  };

  if (owner) {
    result.invitations = activeInvitations.map((inv) => ({ ...inv }));
    result.joinRequests = pendingRequests.map((req) => ({ ...req }));
  }

  return result;
}

export function findAccountByHandle(
  accounts: AccountRecord[],
  rawUsername: string
): AccountRecord | undefined {
  const targetNorm = normalizeHandle(rawUsername);
  return accounts.find((acc) => normalizeHandle(acc.user.username) === targetNorm);
}

export function addMemberDeduplicated(group: Group, canonicalUsername: string): boolean {
  const norm = normalizeHandle(canonicalUsername);
  const exists = (group.members || []).some((m) => normalizeHandle(m) === norm);
  if (exists) {
    return false;
  }
  if (!Array.isArray(group.members)) {
    group.members = [];
  }
  group.members.push(canonicalUsername);
  return true;
}

export function createGroupInvitationRecord(
  group: Group,
  ownerUser: User,
  targetAccount: AccountRecord,
  nowMs = Date.now(),
  ttlMs = DEFAULT_INVITATION_TTL_MS
): { ok: true; invitation: GroupInvitation } | { ok: false; status: number; error: string } {
  const targetHandle = targetAccount.user.username;
  const targetNorm = normalizeHandle(targetHandle);

  if (
    isGroupOwner(group, targetAccount.user) ||
    (group.members || []).some((m) => normalizeHandle(m) === targetNorm)
  ) {
    return {
      ok: false,
      status: 409,
      error: `${targetHandle} is already a member of this group.`,
    };
  }

  group.invitations = pruneExpiredInvitations(group.invitations, nowMs);

  const duplicate = group.invitations.some((inv) => normalizeHandle(inv.username) === targetNorm);
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      error: `${targetHandle} already has an active invitation to this group.`,
    };
  }

  if (group.invitations.length >= MAX_PENDING_INVITATIONS_PER_GROUP) {
    return {
      ok: false,
      status: 400,
      error: 'Maximum pending invitations reached for this group.',
    };
  }

  const invitation: GroupInvitation = {
    id: `inv-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
    username: targetHandle,
    invitedBy: ownerUser.username,
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + ttlMs).toISOString(),
  };

  group.invitations.push(invitation);
  return { ok: true, invitation };
}

export function createJoinRequestRecord(
  group: Group,
  requesterUser: User,
  nowMs = Date.now()
): { ok: true; request: GroupJoinRequest } | { ok: false; status: number; error: string } {
  if (isGroupMember(group, requesterUser)) {
    return { ok: false, status: 409, error: 'You are already a member of this group.' };
  }

  if (group.visibility === 'public') {
    return {
      ok: false,
      status: 400,
      error: 'Public groups do not require owner approval and can be joined directly.',
    };
  }

  const requesterNorm = normalizeHandle(requesterUser.username);
  if (!Array.isArray(group.joinRequests)) {
    group.joinRequests = [];
  }

  if (group.joinRequests.some((r) => normalizeHandle(r.username) === requesterNorm)) {
    return {
      ok: false,
      status: 409,
      error: 'You already have a pending access request for this group.',
    };
  }

  group.invitations = pruneExpiredInvitations(group.invitations, nowMs);
  if (group.invitations.some((inv) => normalizeHandle(inv.username) === requesterNorm)) {
    return {
      ok: false,
      status: 409,
      error: 'You already have an active invitation for this group. Accept your invitation to join.',
    };
  }

  if (group.joinRequests.length >= MAX_PENDING_REQUESTS_PER_GROUP) {
    return {
      ok: false,
      status: 400,
      error: 'This group currently has too many pending join requests.',
    };
  }

  const request: GroupJoinRequest = {
    id: `req-${nowMs}-${Math.random().toString(36).slice(2, 7)}`,
    username: requesterUser.username,
    requestedAt: new Date(nowMs).toISOString(),
  };
  group.joinRequests.push(request);
  return { ok: true, request };
}
