import {
  User,
  PublicDirectoryUser,
  LabNote,
  CommunityPost,
  TimelineEvent,
  UserProgress,
  Group,
  GroupInvitation,
  GroupMessage,
  GroupVisibility,
  TutorRequest,
  TutorResponse,
  EngageSubmissionPayload,
  PublicCurriculumPayload,
  EngageApiResponse,
  LogVerifyApiResponse,
} from '../types';

const CSRF_HEADER_NAME = 'X-CSRF-Token';
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Kept strictly in memory (never written to localStorage/sessionStorage and never contains session token)
let inMemoryCsrfToken = '';
let onUnauthorizedCallback: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorizedCallback = handler;
}

export function clearClientAuthMemory(): void {
  inMemoryCsrfToken = '';
}

export class ApiError extends Error {
  status: number;
  payload?: Record<string, any>;
  constructor(message: string, status: number, payload?: Record<string, any>) {
    super(message);
    this.status = status;
    this.payload = payload;
    this.name = 'ApiError';
  }
}

async function handleError(
  res: Response,
  defaultMessage: string,
  options?: { notifyUnauthorized?: boolean }
): Promise<never> {
  let message = defaultMessage;
  let payload: Record<string, any> | undefined;
  try {
    const err = await res.json();
    if (err && typeof err === 'object') {
      payload = err;
      if (err.error) {
        message = err.error;
      }
    }
  } catch {
    // Falls back to defaultMessage if JSON parsing fails
  }
  if (res.status === 401 && options?.notifyUnauthorized !== false) {
    inMemoryCsrfToken = '';
    onUnauthorizedCallback?.();
  }
  throw new ApiError(message, res.status, payload);
}

export async function apiInitCsrf(): Promise<{ csrfToken: string; authenticated: boolean }> {
  const res = await fetch('/api/auth/csrf', {
    method: 'GET',
    credentials: 'same-origin',
  });
  if (!res.ok) {
    await handleError(res, 'Failed to initialize CSRF verification', { notifyUnauthorized: false });
  }
  const data = await res.json();
  if (typeof data?.csrfToken === 'string') {
    inMemoryCsrfToken = data.csrfToken;
  }
  return data;
}

async function ensureCsrfToken(): Promise<string> {
  if (inMemoryCsrfToken) {
    return inMemoryCsrfToken;
  }
  const init = await apiInitCsrf();
  return init.csrfToken;
}

async function apiFetch(
  url: string,
  init: RequestInit = {},
  options?: { notifyUnauthorized?: boolean }
): Promise<Response> {
  const method = (init.method || 'GET').toUpperCase();
  const headers = new Headers(init.headers);

  if (STATE_CHANGING_METHODS.has(method)) {
    const csrf = await ensureCsrfToken();
    if (csrf) {
      headers.set(CSRF_HEADER_NAME, csrf);
    }
    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  return fetch(url, {
    ...init,
    method,
    headers,
    credentials: 'same-origin',
  });
}

export async function apiGetMe(): Promise<{ user: User; progress: UserProgress } | null> {
  const res = await fetch('/api/auth/me', {
    method: 'GET',
    credentials: 'same-origin',
  });
  if (res.status === 401) {
    inMemoryCsrfToken = '';
    return null;
  }
  if (!res.ok) {
    await handleError(res, 'Failed to verify current session', { notifyUnauthorized: false });
  }
  const data = await res.json();
  if (typeof data?.csrfToken === 'string') {
    inMemoryCsrfToken = data.csrfToken;
  }
  return {
    user: data.user,
    progress: data.progress,
  };
}

export async function apiGetCurriculum(): Promise<PublicCurriculumPayload> {
  const res = await apiFetch('/api/curriculum', {}, { notifyUnauthorized: false });
  if (!res.ok) {
    await handleError(res, 'Failed to load curriculum', { notifyUnauthorized: false });
  }
  return res.json();
}

export async function apiVerifyLogEntry(
  lessonId: string,
  labId: string,
  entryId: string
): Promise<LogVerifyApiResponse> {
  const res = await apiFetch('/api/assessments/verify-log', {
    method: 'POST',
    body: JSON.stringify({ lessonId, labId, entryId }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to verify log entry');
  }
  return res.json();
}

export async function apiRegister(
  email: string,
  password: string,
  username: string
): Promise<{ expiresAt: number; user: User; progress: UserProgress }> {
  const res = await apiFetch(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({ email, password, username }),
    },
    { notifyUnauthorized: false }
  );

  if (!res.ok) {
    await handleError(res, 'Registration failed', { notifyUnauthorized: false });
  }

  const data = await res.json();
  inMemoryCsrfToken = typeof data?.csrfToken === 'string' ? data.csrfToken : '';
  return {
    expiresAt: data.expiresAt,
    user: data.user,
    progress: data.progress,
  };
}

export async function apiLogin(
  email: string,
  password: string
): Promise<{ expiresAt: number; user: User; progress: UserProgress; labNotes: LabNote[] }> {
  const res = await apiFetch(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    },
    { notifyUnauthorized: false }
  );

  if (!res.ok) {
    await handleError(res, 'Login failed', { notifyUnauthorized: false });
  }

  const data = await res.json();
  inMemoryCsrfToken = typeof data?.csrfToken === 'string' ? data.csrfToken : '';
  return {
    expiresAt: data.expiresAt,
    user: data.user,
    progress: data.progress,
    labNotes: data.labNotes || [],
  };
}

export async function apiLogout(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' }, { notifyUnauthorized: false });
  } finally {
    inMemoryCsrfToken = '';
  }
}

export async function apiGetUsers(): Promise<PublicDirectoryUser[]> {
  const res = await apiFetch('/api/users', {}, { notifyUnauthorized: false });
  if (!res.ok) {
    await handleError(res, 'Failed to load users', { notifyUnauthorized: false });
  }
  return res.json();
}

export async function apiFollowUser(targetUsername: string): Promise<string[]> {
  const res = await apiFetch('/api/users/follow', {
    method: 'POST',
    body: JSON.stringify({ targetUsername }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to update follow state');
  }
  const data = await res.json();
  return data.following;
}

export async function apiSyncProgress(): Promise<{
  user: User;
  progress: UserProgress;
  staleOverwritePrevented?: boolean;
}> {
  const res = await apiFetch('/api/user/sync', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to synchronize metrics');
  }
  return res.json();
}

export async function apiActiveEngage(
  engagementType: 'open_lesson' | 'submit_quiz' | 'verify_homework' | 'complete_exercise',
  lessonId: string,
  payload?: EngageSubmissionPayload
): Promise<EngageApiResponse> {
  const res = await apiFetch('/api/user/engage', {
    method: 'POST',
    body: JSON.stringify({
      engagementType,
      lessonId,
      ...(payload || {}),
    }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to register active engagement');
  }
  return res.json();
}

export async function apiGetPosts(): Promise<CommunityPost[]> {
  const res = await apiFetch('/api/posts', {}, { notifyUnauthorized: false });
  if (!res.ok) {
    await handleError(res, 'Failed to load forum posts', { notifyUnauthorized: false });
  }
  return res.json();
}

export async function apiCreatePost(post: {
  title: string;
  content: string;
  category: string;
  authorRole?: string;
}): Promise<CommunityPost & { user?: User; progress?: UserProgress }> {
  const res = await apiFetch('/api/posts', {
    method: 'POST',
    body: JSON.stringify(post),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to publish post');
  }
  return res.json();
}

export async function apiVotePost(postId: string, voteType: 'up' | 'down' | null): Promise<CommunityPost> {
  const res = await apiFetch(`/api/posts/${postId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ voteType }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to vote');
  }
  return res.json();
}

export async function apiGetLabNotes(): Promise<LabNote[]> {
  const res = await apiFetch('/api/labnotes');
  if (!res.ok) {
    await handleError(res, 'Failed to load lab notes');
  }
  return res.json();
}

export async function apiSaveLabNote(note: LabNote): Promise<LabNote[]> {
  const res = await apiFetch('/api/labnotes', {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to save lab note');
  }
  return res.json();
}

export async function apiDeleteLabNote(id: string): Promise<boolean> {
  const res = await apiFetch(`/api/labnotes/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    await handleError(res, 'Failed to delete lab note');
  }
  const data = await res.json();
  return data.success;
}

export async function apiGetTimeline(): Promise<TimelineEvent[]> {
  const res = await apiFetch('/api/timeline', {}, { notifyUnauthorized: false });
  if (!res.ok) {
    await handleError(res, 'Failed to load timeline', { notifyUnauthorized: false });
  }
  return res.json();
}

export async function apiGetGroups(): Promise<Group[]> {
  const res = await apiFetch('/api/groups');
  if (!res.ok) {
    await handleError(res, 'Failed to fetch community groups');
  }
  return res.json();
}

export async function apiGetGroup(groupId: string): Promise<Group> {
  const res = await apiFetch(`/api/groups/${encodeURIComponent(groupId)}`);
  if (!res.ok) {
    await handleError(res, 'Failed to fetch community group details');
  }
  return res.json();
}

export async function apiGetGroupMessages(groupId: string): Promise<GroupMessage[]> {
  const res = await apiFetch(`/api/groups/${encodeURIComponent(groupId)}/messages`);
  if (!res.ok) {
    await handleError(res, 'Failed to fetch group messages');
  }
  return res.json();
}

export async function apiCreateGroup(group: {
  name: string;
  description: string;
  avatar?: string;
  visibility?: GroupVisibility;
}): Promise<Group> {
  const res = await apiFetch('/api/groups', {
    method: 'POST',
    body: JSON.stringify(group),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to construct team group');
  }
  return res.json();
}

export async function apiJoinGroup(groupId: string): Promise<Group> {
  const res = await apiFetch(`/api/groups/${encodeURIComponent(groupId)}/join`, {
    method: 'POST',
  });
  if (!res.ok) {
    await handleError(res, 'Failed to join public group');
  }
  return res.json();
}

export async function apiRequestJoinGroup(groupId: string): Promise<Group> {
  const res = await apiFetch(`/api/groups/${encodeURIComponent(groupId)}/requests`, {
    method: 'POST',
  });
  if (!res.ok) {
    await handleError(res, 'Failed to submit group access request');
  }
  return res.json();
}

export async function apiRespondToJoinRequest(
  groupId: string,
  username: string,
  action: 'approve' | 'reject'
): Promise<Group> {
  const res = await apiFetch(`/api/groups/${encodeURIComponent(groupId)}/requests/respond`, {
    method: 'POST',
    body: JSON.stringify({ username, action }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to process join request');
  }
  return res.json();
}

export async function apiInviteGroupMember(
  groupId: string,
  username: string
): Promise<{ invitation: GroupInvitation; group: Group }> {
  const res = await apiFetch(`/api/groups/${encodeURIComponent(groupId)}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to issue group invitation');
  }
  return res.json();
}

export async function apiRespondToGroupInvitation(
  groupId: string,
  action: 'accept' | 'decline'
): Promise<{ accepted: boolean; group: Group }> {
  const res = await apiFetch(`/api/groups/${encodeURIComponent(groupId)}/invitations/respond`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to respond to group invitation');
  }
  return res.json();
}

export async function apiAddGroupMember(groupId: string, username: string): Promise<Group> {
  const res = await apiFetch(`/api/groups/${encodeURIComponent(groupId)}/members`, {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to update group membership');
  }
  return res.json();
}

export async function apiSendGroupMessage(groupId: string, content: string): Promise<GroupMessage> {
  const res = await apiFetch(`/api/groups/${encodeURIComponent(groupId)}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to dispatch data packet message');
  }
  return res.json();
}

// AI Tutor API (Groq)
export async function apiAskTutor(request: TutorRequest): Promise<TutorResponse> {
  const res = await apiFetch('/api/ai/tutor', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    await handleError(res, 'AI Tutor service request failed');
  }

  return res.json();
}

export async function apiGetTutorStatus(): Promise<{ configured: boolean; provider: string; model: string }> {
  const res = await apiFetch('/api/ai/tutor/status', {}, { notifyUnauthorized: false });
  if (!res.ok) {
    return { configured: false, provider: 'groq', model: 'openai/gpt-oss-120b' };
  }
  return res.json();
}
