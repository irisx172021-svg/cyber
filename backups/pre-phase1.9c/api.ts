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

const TOKEN_STORAGE_KEY = 'cfa_auth_token';

export function getStoredAuthToken(): string {
  return localStorage.getItem(TOKEN_STORAGE_KEY) || '';
}

export function setStoredAuthToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getStoredAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

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

async function handleError(res: Response, defaultMessage: string): Promise<never> {
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
  throw new ApiError(message, res.status, payload);
}

export async function apiGetCurriculum(): Promise<PublicCurriculumPayload> {
  const res = await fetch('/api/curriculum', {
    headers: getHeaders(),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to load curriculum');
  }
  return res.json();
}

export async function apiVerifyLogEntry(
  lessonId: string,
  labId: string,
  entryId: string
): Promise<LogVerifyApiResponse> {
  const res = await fetch('/api/assessments/verify-log', {
    method: 'POST',
    headers: getHeaders(),
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
): Promise<{ token: string; expiresAt: number; user: User; progress: UserProgress }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, username }),
  });

  if (!res.ok) {
    await handleError(res, 'Registration failed');
  }

  const data = await res.json();
  if (data.token) {
    setStoredAuthToken(data.token);
  }
  return data;
}

export async function apiLogin(
  email: string,
  password: string
): Promise<{ token: string; expiresAt: number; user: User; progress: UserProgress; labNotes: LabNote[] }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    await handleError(res, 'Login failed');
  }

  const data = await res.json();
  if (data.token) {
    setStoredAuthToken(data.token);
  }
  return data;
}

export async function apiLogout(): Promise<void> {
  const token = getStoredAuthToken();
  try {
    if (token) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getHeaders(),
      });
    }
  } finally {
    setStoredAuthToken(null);
    localStorage.removeItem('cfa_user');
    localStorage.removeItem('cfa_user_id');
  }
}

export async function apiGetUsers(): Promise<PublicDirectoryUser[]> {
  const res = await fetch('/api/users', {
    headers: getHeaders(),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to load users');
  }
  return res.json();
}

export async function apiFollowUser(targetUsername: string): Promise<string[]> {
  const res = await fetch('/api/users/follow', {
    method: 'POST',
    headers: getHeaders(),
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
  const res = await fetch('/api/user/sync', {
    method: 'POST',
    headers: getHeaders(),
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
  const res = await fetch('/api/user/engage', {
    method: 'POST',
    headers: getHeaders(),
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
  const res = await fetch('/api/posts', {
    headers: getHeaders(),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to load forum posts');
  }
  return res.json();
}

export async function apiCreatePost(post: {
  title: string;
  content: string;
  category: string;
  authorRole?: string;
}): Promise<CommunityPost & { user?: User; progress?: UserProgress }> {
  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(post),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to publish post');
  }
  return res.json();
}

export async function apiVotePost(postId: string, voteType: 'up' | 'down' | null): Promise<CommunityPost> {
  const res = await fetch(`/api/posts/${postId}/vote`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ voteType }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to vote');
  }
  return res.json();
}

export async function apiGetLabNotes(): Promise<LabNote[]> {
  const res = await fetch('/api/labnotes', {
    headers: getHeaders(),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to load lab notes');
  }
  return res.json();
}

export async function apiSaveLabNote(note: LabNote): Promise<LabNote[]> {
  const res = await fetch('/api/labnotes', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ note }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to save lab note');
  }
  return res.json();
}

export async function apiDeleteLabNote(id: string): Promise<boolean> {
  const res = await fetch(`/api/labnotes/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to delete lab note');
  }
  const data = await res.json();
  return data.success;
}

export async function apiGetTimeline(): Promise<TimelineEvent[]> {
  const res = await fetch('/api/timeline', {
    headers: getHeaders(),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to load timeline');
  }
  return res.json();
}

export async function apiGetGroups(): Promise<Group[]> {
  const res = await fetch('/api/groups', {
    headers: getHeaders(),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to fetch community groups');
  }
  return res.json();
}

export async function apiGetGroup(groupId: string): Promise<Group> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}`, {
    headers: getHeaders(),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to fetch community group details');
  }
  return res.json();
}

export async function apiGetGroupMessages(groupId: string): Promise<GroupMessage[]> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/messages`, {
    headers: getHeaders(),
  });
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
  const res = await fetch('/api/groups', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(group),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to construct team group');
  }
  return res.json();
}

export async function apiJoinGroup(groupId: string): Promise<Group> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/join`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to join public group');
  }
  return res.json();
}

export async function apiRequestJoinGroup(groupId: string): Promise<Group> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/requests`, {
    method: 'POST',
    headers: getHeaders(),
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
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/requests/respond`, {
    method: 'POST',
    headers: getHeaders(),
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
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/invitations`, {
    method: 'POST',
    headers: getHeaders(),
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
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/invitations/respond`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to respond to group invitation');
  }
  return res.json();
}

export async function apiAddGroupMember(groupId: string, username: string): Promise<Group> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/members`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to update group membership');
  }
  return res.json();
}

export async function apiSendGroupMessage(groupId: string, content: string): Promise<GroupMessage> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/messages`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!res.ok) {
    await handleError(res, 'Failed to dispatch data packet message');
  }
  return res.json();
}

// AI Tutor API (Groq)
export async function apiAskTutor(request: TutorRequest): Promise<TutorResponse> {
  const res = await fetch('/api/ai/tutor', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    await handleError(res, 'AI Tutor service request failed');
  }

  return res.json();
}

export async function apiGetTutorStatus(): Promise<{ configured: boolean; provider: string; model: string }> {
  const res = await fetch('/api/ai/tutor/status', {
    headers: getHeaders(),
  });
  if (!res.ok) {
    return { configured: false, provider: 'groq', model: 'openai/gpt-oss-120b' };
  }
  return res.json();
}
