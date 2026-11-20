import { LearningExperienceLevel, LearningProfile } from '../types';
import { JOURNEY_STAGES, SPECIALIST_PATHWAYS } from '../data/journeyBlueprint';

export const CANONICAL_PATHWAY_IDS: string[] = SPECIALIST_PATHWAYS.map((p) => p.id);
export const CANONICAL_PATHWAY_ID_SET: Set<string> = new Set(CANONICAL_PATHWAY_IDS);
export const MAX_GOALS_LENGTH = 280;

export const LEARNING_EXPERIENCE_OPTIONS: Array<{
  value: LearningExperienceLevel;
  label: string;
  description: string;
}> = [
  {
    value: 'beginner',
    label: 'Complete beginner',
    description: 'New to IT or cybersecurity. Start with hardware, OS basics, and core networking.',
  },
  {
    value: 'some_experience',
    label: 'Some tech experience',
    description: 'Familiar with general computing, command line, or coding, building security depth.',
  },
  {
    value: 'experienced',
    label: 'Experienced practitioner',
    description: 'Working in IT or security and exploring specific specialist domains.',
  },
];

export interface PathwayOnboardingDetail {
  plainSummary: string;
  whatYouDo: string;
}

export const PATHWAY_ONBOARDING_DETAILS: Record<string, PathwayOnboardingDetail> = {
  'pathway-soc-detection': {
    plainSummary: 'Watch systems for suspicious activity and investigate security alerts.',
    whatYouDo: 'Triage alerts, trace endpoint logs and Sysmon trees, and investigate phishing or intrusions.',
  },
  'pathway-appsec': {
    plainSummary: 'Find and fix security flaws in websites, APIs, and software delivery pipelines.',
    whatYouDo: 'Audit login/session code, prevent OWASP Top 10 flaws, and secure CI/CD build pipelines.',
  },
  'pathway-cloud-sec': {
    plainSummary: 'Keep cloud accounts, storage buckets, and container clusters locked down.',
    whatYouDo: 'Configure AWS/Azure/GCP least-privilege IAM, inspect CloudTrail logs, and harden Kubernetes.',
  },
  'pathway-dfir': {
    plainSummary: 'Reconstruct how an incident happened and preserve digital evidence safely.',
    whatYouDo: 'Collect OS and memory artifacts, build timelines, and coordinate incident containment.',
  },
  'pathway-malware-re': {
    plainSummary: 'Inspect suspicious programs safely to understand how they behave.',
    whatYouDo: 'Examine file hashes, strings, YARA rules, C memory layouts, assembly, and debuggers.',
  },
  'pathway-sec-arch': {
    plainSummary: 'Design systems so identity, encryption, and network boundaries fail safely.',
    whatYouDo: 'Plan Zero Trust controls, TLS/PKI encryption, network segmentation, and defense in depth.',
  },
  'pathway-grc': {
    plainSummary: 'Help organizations manage cyber risk and meet privacy and security standards.',
    whatYouDo: 'Map technical safeguards to NIST CSF, ISO 27001, SOC 2, and privacy regulations.',
  },
  'pathway-pentest': {
    plainSummary: 'Test authorized lab systems like an ethical attacker to expose weak spots early.',
    whatYouDo: 'Run scoped reconnaissance, test web/credential weaknesses, and write remediation guidance.',
  },
};

export interface PathwayTopicPreview {
  stageId: string;
  stageOrder: number;
  topicId: string;
  code: string;
  title: string;
}

export function getRelevantTopicsForPathway(pathwayId: string): PathwayTopicPreview[] {
  const pathway = SPECIALIST_PATHWAYS.find((p) => p.id === pathwayId);
  if (!pathway) return [];

  const targetLessons = new Set([
    ...pathway.stage4IntroLessonIds,
    ...pathway.stage5AdvancedLessonIds,
  ]);

  const seenTopicIds = new Set<string>();
  const matched: PathwayTopicPreview[] = [];

  for (const stage of JOURNEY_STAGES) {
    if (stage.order < 4) continue;
    for (const topic of stage.topics) {
      if (topic.lessonIds.some((id) => targetLessons.has(id)) && !seenTopicIds.has(topic.id)) {
        seenTopicIds.add(topic.id);
        matched.push({
          stageId: stage.id,
          stageOrder: stage.order,
          topicId: topic.id,
          code: topic.code,
          title: topic.title,
        });
      }
    }
  }

  // Fallback to shared foundation topics if a future pathway has no stage 4/5 overlap
  if (matched.length === 0) {
    const sharedSet = new Set(pathway.sharedFoundationLessonIds);
    for (const stage of JOURNEY_STAGES) {
      for (const topic of stage.topics) {
        if (topic.lessonIds.some((id) => sharedSet.has(id)) && !seenTopicIds.has(topic.id)) {
          seenTopicIds.add(topic.id);
          matched.push({
            stageId: stage.id,
            stageOrder: stage.order,
            topicId: topic.id,
            code: topic.code,
            title: topic.title,
          });
        }
      }
    }
  }

  return matched;
}

export function isValidExperienceLevel(value: unknown): value is LearningExperienceLevel {
  return value === 'beginner' || value === 'some_experience' || value === 'experienced';
}

export function createDefaultLearningProfile(): LearningProfile {
  return {
    interests: [],
    experienceLevel: 'beginner',
    goals: '',
    onboardingCompleted: false,
    updatedAt: null,
  };
}

export function normalizeLearningProfile(raw: unknown): LearningProfile {
  const def = createDefaultLearningProfile();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return def;
  }

  const record = raw as Record<string, unknown>;
  const seen = new Set<string>();
  const interests: string[] = [];

  if (Array.isArray(record.interests)) {
    for (const item of record.interests) {
      if (
        typeof item === 'string' &&
        CANONICAL_PATHWAY_ID_SET.has(item) &&
        !seen.has(item)
      ) {
        seen.add(item);
        interests.push(item);
      }
    }
  }

  const experienceLevel: LearningExperienceLevel = isValidExperienceLevel(record.experienceLevel)
    ? record.experienceLevel
    : 'beginner';

  const goals =
    typeof record.goals === 'string'
      ? record.goals.trim().slice(0, MAX_GOALS_LENGTH)
      : '';

  const onboardingCompleted =
    typeof record.onboardingCompleted === 'boolean' ? record.onboardingCompleted : false;

  const updatedAt =
    typeof record.updatedAt === 'string' && record.updatedAt.trim()
      ? record.updatedAt
      : null;

  return {
    interests,
    experienceLevel,
    goals,
    onboardingCompleted,
    updatedAt,
  };
}

const FORBIDDEN_PROGRESS_AND_AUTH_KEYS = new Set([
  'xp',
  'xpEarned',
  'streak',
  'level',
  'rank',
  'completion',
  'completedLessonIds',
  'completedExerciseIds',
  'completedQuizLessonIds',
  'completedHomeworkLessonIds',
  'legacyCompletedLessonIds',
  'awardedXpEventIds',
  'verifiedTopics',
  'capstoneProgress',
  'labExploration',
  'tokenVersion',
  'passwordHash',
  'password',
  'id',
  'email',
  'username',
]);

const ALLOWED_UPDATE_KEYS = new Set([
  'action',
  'interests',
  'experienceLevel',
  'goals',
  'onboardingCompleted',
]);

export interface LearningProfileUpdateInput {
  action?: 'save' | 'skip' | 'clear';
  interests?: string[];
  experienceLevel?: LearningExperienceLevel;
  goals?: string;
  onboardingCompleted?: boolean;
}

export type LearningProfileValidationResult =
  | { ok: true; profile: LearningProfile }
  | { ok: false; status: number; error: string };

export function validateLearningProfileUpdate(
  body: unknown,
  currentRaw?: unknown,
  nowIso: string = new Date().toISOString()
): LearningProfileValidationResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      error: 'Request payload must be a JSON object.',
    };
  }

  const raw = body as Record<string, unknown>;
  const keys = Object.keys(raw);

  for (const key of keys) {
    if (FORBIDDEN_PROGRESS_AND_AUTH_KEYS.has(key)) {
      return {
        ok: false,
        status: 403,
        error: `Field "${key}" cannot be modified via learning preferences.`,
      };
    }
    if (!ALLOWED_UPDATE_KEYS.has(key)) {
      return {
        ok: false,
        status: 400,
        error: `Unsupported field "${key}" in learning profile update. Personal profile data (PII) is not collected.`,
      };
    }
  }

  const current = normalizeLearningProfile(currentRaw);
  const action = raw.action;

  if (action !== undefined && action !== 'save' && action !== 'skip' && action !== 'clear') {
    return {
      ok: false,
      status: 400,
      error: 'action must be "save", "skip", or "clear".',
    };
  }

  if (raw.experienceLevel !== undefined && !isValidExperienceLevel(raw.experienceLevel)) {
    return {
      ok: false,
      status: 400,
      error: 'experienceLevel must be "beginner", "some_experience", or "experienced".',
    };
  }

  if (raw.goals !== undefined && typeof raw.goals !== 'string') {
    return {
      ok: false,
      status: 400,
      error: 'goals must be a text string.',
    };
  }

  if (typeof raw.goals === 'string' && raw.goals.trim().length > MAX_GOALS_LENGTH) {
    return {
      ok: false,
      status: 400,
      error: `goals must not exceed ${MAX_GOALS_LENGTH} characters.`,
    };
  }

  if (raw.onboardingCompleted !== undefined && typeof raw.onboardingCompleted !== 'boolean') {
    return {
      ok: false,
      status: 400,
      error: 'onboardingCompleted must be a boolean.',
    };
  }

  if (action === 'skip') {
    return {
      ok: true,
      profile: {
        interests: [],
        experienceLevel: isValidExperienceLevel(raw.experienceLevel)
          ? raw.experienceLevel
          : current.experienceLevel,
        goals: '',
        onboardingCompleted: true,
        updatedAt: nowIso,
      },
    };
  }

  if (action === 'clear') {
    return {
      ok: true,
      profile: {
        interests: [],
        experienceLevel: isValidExperienceLevel(raw.experienceLevel)
          ? raw.experienceLevel
          : current.experienceLevel,
        goals: '',
        onboardingCompleted:
          typeof raw.onboardingCompleted === 'boolean' ? raw.onboardingCompleted : true,
        updatedAt: nowIso,
      },
    };
  }

  let nextInterests = [...current.interests];
  if (raw.interests !== undefined) {
    if (!Array.isArray(raw.interests)) {
      return {
        ok: false,
        status: 400,
        error: 'interests must be an array of canonical pathway IDs.',
      };
    }
    if (raw.interests.length > CANONICAL_PATHWAY_IDS.length) {
      return {
        ok: false,
        status: 400,
        error: `Select at most ${CANONICAL_PATHWAY_IDS.length} interest pathways.`,
      };
    }

    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const item of raw.interests) {
      if (typeof item !== 'string' || !CANONICAL_PATHWAY_ID_SET.has(item)) {
        return {
          ok: false,
          status: 400,
          error: `Unknown pathway ID "${String(item)}". Only canonical academy pathways are allowed.`,
        };
      }
      if (!seen.has(item)) {
        seen.add(item);
        deduped.push(item);
      }
    }
    nextInterests = deduped;
  }

  const nextExperienceLevel = isValidExperienceLevel(raw.experienceLevel)
    ? raw.experienceLevel
    : current.experienceLevel;

  const nextGoals =
    typeof raw.goals === 'string' ? raw.goals.trim() : current.goals ?? '';

  const nextOnboardingCompleted =
    typeof raw.onboardingCompleted === 'boolean' ? raw.onboardingCompleted : true;

  return {
    ok: true,
    profile: {
      interests: nextInterests,
      experienceLevel: nextExperienceLevel,
      goals: nextGoals,
      onboardingCompleted: nextOnboardingCompleted,
      updatedAt: nowIso,
    },
  };
}
