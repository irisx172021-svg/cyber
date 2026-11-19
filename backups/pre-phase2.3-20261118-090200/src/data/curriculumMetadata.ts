import { CompletionRequirements, DifficultyLevel } from '../types';

export const CURRENT_PROGRESS_SCHEMA_VERSION = 2;

/**
 * Explicit migration map from legacy or malformed lesson IDs to canonical IDs.
 * Progress migration MUST use explicit mappings here and never match by title.
 */
export const LEGACY_LESSON_ID_MAP: Record<string, string> = {
  'net- OSI-tcp': 'net-osi-tcp',
  'osi-layered-model': 'net-osi-tcp',
  'linux-cli': 'lin-permissions',
  'linux-permissions': 'lin-permissions',
  'cryptography-fundamentals': 'sym-asym-enc',
  'dns-resolution': 'infra-protocols',
  'nmap-exploration': 'active-recon',
  'wireshark-sniffing': 'network-defense',
};

/**
 * Explicit migration map from legacy or malformed practical exercise IDs to canonical IDs.
 */
export const LEGACY_EXERCISE_ID_MAP: Record<string, string> = {
  'lab-net- OSI-tcp': 'lab-net-osi-tcp',
  'lab-osi-layered-model': 'lab-net-osi-tcp',
  'lab-linux-cli': 'lab-lin-permissions',
  'lab-cryptography-fundamentals': 'lab-sym-asym-enc',
};

export function resolveCanonicalLessonId(lessonId: string): string {
  return LEGACY_LESSON_ID_MAP[lessonId] || lessonId;
}

export function resolveCanonicalExerciseId(exerciseId: string): string {
  return LEGACY_EXERCISE_ID_MAP[exerciseId] || exerciseId;
}

export type DomainGuideKey =
  | 'hardware'
  | 'boot'
  | 'networking'
  | 'protocols'
  | 'perimeter_security'
  | 'linux'
  | 'windows'
  | 'containers'
  | 'dev_workflows'
  | 'python'
  | 'defensive_soc'
  | 'offensive'
  | 'cloud'
  | 'malware_assembly'
  | 'cryptography'
  | 'grc_ctf_career';

/**
 * Deterministic explicit lessonId -> domain guide mapping.
 * Replaces fragile substring matching in curriculumEnhancer.ts.
 * Unknown lesson IDs are intentionally NOT mapped and receive no arbitrary fallback guide.
 */
export const EXPLICIT_LESSON_DOMAIN_MAP: Record<string, DomainGuideKey> = {
  // Tier 1: Foundations
  'comp-hardware': 'hardware',
  'boot-os': 'boot',
  'virt-cloud-basics': 'cloud',
  'net-osi-tcp': 'networking',
  'ip-subnetting': 'networking',
  'infra-protocols': 'protocols',
  'transport-protocols': 'protocols',
  'switching-routing': 'networking',
  'vpn-firewalls': 'perimeter_security',
  'lin-fs': 'linux',
  'lin-permissions': 'linux',
  'bash-scripting': 'linux',
  'lin-logfiltering': 'linux',
  'lin-services': 'linux',
  'lin-remote': 'linux',
  'win-arch': 'windows',
  'win-shells': 'windows',
  'win-ad-logs': 'windows',
  'win-services-firewall': 'windows',
  'hyp-compare': 'containers',
  'docker-basics': 'containers',
  'k8s-basics': 'containers',
  'git-workflows': 'dev_workflows',
  'markup-formats': 'dev_workflows',
  'py-basics': 'python',
  'py-file-regex': 'python',
  'py-automation': 'python',

  // Tier 2: Defensive Security
  'def-aaa-cia': 'defensive_soc',
  'risk-threat-model': 'defensive_soc',
  'soc-triage': 'defensive_soc',
  'endpoint-audit': 'defensive_soc',
  'siem-pipelines': 'defensive_soc',
  'endpoint-defense': 'defensive_soc',
  'network-defense': 'perimeter_security',
  'dig-forensics': 'defensive_soc',
  'incident-response': 'defensive_soc',

  // Tier 3: Offensive Security
  'pentest-method': 'offensive',
  'osint-passive': 'offensive',
  'active-recon': 'offensive',
  'web-owasp-top-10': 'offensive',
  'burpsuite-mastery': 'offensive',
  'net-infiltration': 'offensive',
  'password-attacks': 'offensive',
  'wireless-security': 'offensive',
  'priv-esc': 'offensive',
  'ad-exploitation': 'offensive',
  'post-exploit': 'offensive',

  // Tier 4: Cloud Security
  'aws-iam-s3': 'cloud',
  'aws-logging': 'cloud',
  'azure-security': 'cloud',
  'gcp-security': 'cloud',
  'k8s-hardening': 'containers',

  // Tier 5: Malware Analysis
  'malware-triage': 'malware_assembly',
  'static-analysis': 'malware_assembly',
  'dynamic-analysis': 'malware_assembly',

  // Tier 6: Reverse Engineering
  'assembly-foundations': 'malware_assembly',
  'stack-heap-ops': 'malware_assembly',
  'debugger-tools': 'malware_assembly',

  // Tier 7: Cryptography
  'sym-asym-enc': 'cryptography',
  'hash-sig-pki': 'cryptography',
  'tls-handshake': 'cryptography',

  // Tier 8: GRC
  'infosec-frameworks': 'grc_ctf_career',
  'compliance-standards': 'grc_ctf_career',

  // Tier 9: CTF
  'ctf-formats': 'grc_ctf_career',
  'ctf-skills': 'grc_ctf_career',

  // Tier 10: Certifications
  'entry-certs': 'grc_ctf_career',
  'advanced-certs': 'grc_ctf_career',

  // Tier 11: Career Preparation
  'portfolio-resumes': 'grc_ctf_career',
  'interviews-networks': 'grc_ctf_career',
};

export interface TierMetadataEntry {
  order: number;
  defaultRequired: boolean;
}

export const TIER_METADATA: Record<string, TierMetadataEntry> = {
  'tier-1': { order: 1, defaultRequired: true },
  'tier-2': { order: 2, defaultRequired: true },
  'tier-3': { order: 3, defaultRequired: true },
  'tier-4': { order: 4, defaultRequired: true },
  'tier-5': { order: 5, defaultRequired: true },
  'tier-6': { order: 6, defaultRequired: true },
  'tier-7': { order: 7, defaultRequired: true },
  'tier-8': { order: 8, defaultRequired: true },
  'tier-9': { order: 9, defaultRequired: false },
  'tier-10': { order: 10, defaultRequired: false },
  'tier-11': { order: 11, defaultRequired: true },
};

export interface TopicMetadataEntry {
  order: number;
  tierId: string;
}

export const TOPIC_METADATA: Record<string, TopicMetadataEntry> = {
  // Tier 1
  'computer-fundamentals': { order: 1, tierId: 'tier-1' },
  'networking': { order: 2, tierId: 'tier-1' },
  'linux-mastery': { order: 3, tierId: 'tier-1' },
  'windows-mastery': { order: 4, tierId: 'tier-1' },
  'virt-containers': { order: 5, tierId: 'tier-1' },
  'git-dev': { order: 6, tierId: 'tier-1' },
  'python-cyber': { order: 7, tierId: 'tier-1' },
  // Tier 2
  'sec-fundamentals': { order: 1, tierId: 'tier-2' },
  'soc-detection': { order: 2, tierId: 'tier-2' },
  'defense-tech': { order: 3, tierId: 'tier-2' },
  'ir-forensics': { order: 4, tierId: 'tier-2' },
  // Tier 3
  'recon-scanning': { order: 1, tierId: 'tier-3' },
  'web-security': { order: 2, tierId: 'tier-3' },
  'exploitation-tech': { order: 3, tierId: 'tier-3' },
  'post-exploit-privesc': { order: 4, tierId: 'tier-3' },
  // Tier 4
  'aws-defense': { order: 1, tierId: 'tier-4' },
  'azure-gcp-defense': { order: 2, tierId: 'tier-4' },
  'k8s-security': { order: 3, tierId: 'tier-4' },
  // Tier 5
  'malware-foundations': { order: 1, tierId: 'tier-5' },
  // Tier 6
  'reverse-assembly': { order: 1, tierId: 'tier-6' },
  // Tier 7
  'cryptography-foundations': { order: 1, tierId: 'tier-7' },
  // Tier 8
  'grc-frameworks': { order: 1, tierId: 'tier-8' },
  // Tier 9
  'ctf-strategies': { order: 1, tierId: 'tier-9' },
  // Tier 10
  'cert-pathways': { order: 1, tierId: 'tier-10' },
  // Tier 11
  'career-landing': { order: 1, tierId: 'tier-11' },
};

export interface LessonMetadataEntry {
  order: number;
  tierId: string;
  topicId: string;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
  required: boolean;
  prerequisites: string[];
  recommendedPrerequisites?: string[];
  completionRequirements: CompletionRequirements;
}

const DEFAULT_COMPLETION: CompletionRequirements = {
  requireQuiz: true,
  requirePracticalLab: false,
  requireHomework: false,
  minQuizScorePercent: 100,
};

export const LESSON_METADATA: Record<string, LessonMetadataEntry> = {
  // Tier 1: Computer Fundamentals
  'comp-hardware': {
    order: 1,
    tierId: 'tier-1',
    topicId: 'computer-fundamentals',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: [],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'boot-os': {
    order: 2,
    tierId: 'tier-1',
    topicId: 'computer-fundamentals',
    difficulty: 'beginner',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['comp-hardware'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'virt-cloud-basics': {
    order: 3,
    tierId: 'tier-1',
    topicId: 'computer-fundamentals',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['boot-os'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 1: Networking Fundamentals
  'net-osi-tcp': {
    order: 1,
    tierId: 'tier-1',
    topicId: 'networking',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['comp-hardware'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'ip-subnetting': {
    order: 2,
    tierId: 'tier-1',
    topicId: 'networking',
    difficulty: 'beginner',
    estimatedMinutes: 20,
    required: true,
    prerequisites: ['net-osi-tcp'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'infra-protocols': {
    order: 3,
    tierId: 'tier-1',
    topicId: 'networking',
    difficulty: 'beginner',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['ip-subnetting'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'transport-protocols': {
    order: 4,
    tierId: 'tier-1',
    topicId: 'networking',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['net-osi-tcp'],
    recommendedPrerequisites: ['ip-subnetting'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'switching-routing': {
    order: 5,
    tierId: 'tier-1',
    topicId: 'networking',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['ip-subnetting', 'infra-protocols'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'vpn-firewalls': {
    order: 6,
    tierId: 'tier-1',
    topicId: 'networking',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['transport-protocols', 'switching-routing'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 1: Linux Administration
  'lin-fs': {
    order: 1,
    tierId: 'tier-1',
    topicId: 'linux-mastery',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['boot-os'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'lin-permissions': {
    order: 2,
    tierId: 'tier-1',
    topicId: 'linux-mastery',
    difficulty: 'beginner',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['lin-fs'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'bash-scripting': {
    order: 3,
    tierId: 'tier-1',
    topicId: 'linux-mastery',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    required: true,
    prerequisites: ['lin-permissions'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'lin-logfiltering': {
    order: 4,
    tierId: 'tier-1',
    topicId: 'linux-mastery',
    difficulty: 'intermediate',
    estimatedMinutes: 22,
    required: true,
    prerequisites: ['lin-permissions'],
    recommendedPrerequisites: ['bash-scripting'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'lin-services': {
    order: 5,
    tierId: 'tier-1',
    topicId: 'linux-mastery',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['lin-permissions'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'lin-remote': {
    order: 6,
    tierId: 'tier-1',
    topicId: 'linux-mastery',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['lin-services'],
    recommendedPrerequisites: ['net-osi-tcp'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 1: Windows Administration
  'win-arch': {
    order: 1,
    tierId: 'tier-1',
    topicId: 'windows-mastery',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['boot-os'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'win-shells': {
    order: 2,
    tierId: 'tier-1',
    topicId: 'windows-mastery',
    difficulty: 'beginner',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['win-arch'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'win-ad-logs': {
    order: 3,
    tierId: 'tier-1',
    topicId: 'windows-mastery',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    required: true,
    prerequisites: ['win-shells'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'win-services-firewall': {
    order: 4,
    tierId: 'tier-1',
    topicId: 'windows-mastery',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['win-ad-logs'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 1: Virtualization & Containers
  'hyp-compare': {
    order: 1,
    tierId: 'tier-1',
    topicId: 'virt-containers',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['virt-cloud-basics'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'docker-basics': {
    order: 2,
    tierId: 'tier-1',
    topicId: 'virt-containers',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['hyp-compare', 'lin-fs'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'k8s-basics': {
    order: 3,
    tierId: 'tier-1',
    topicId: 'virt-containers',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['docker-basics'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 1: Git & Development
  'git-workflows': {
    order: 1,
    tierId: 'tier-1',
    topicId: 'git-dev',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['comp-hardware'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'markup-formats': {
    order: 2,
    tierId: 'tier-1',
    topicId: 'git-dev',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['git-workflows'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 1: Python for Cybersecurity
  'py-basics': {
    order: 1,
    tierId: 'tier-1',
    topicId: 'python-cyber',
    difficulty: 'beginner',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['markup-formats'],
    recommendedPrerequisites: ['bash-scripting'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'py-file-regex': {
    order: 2,
    tierId: 'tier-1',
    topicId: 'python-cyber',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['py-basics'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'py-automation': {
    order: 3,
    tierId: 'tier-1',
    topicId: 'python-cyber',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    required: true,
    prerequisites: ['py-file-regex', 'net-osi-tcp'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 2: Defensive Security
  'def-aaa-cia': {
    order: 1,
    tierId: 'tier-2',
    topicId: 'sec-fundamentals',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['net-osi-tcp', 'lin-permissions'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'risk-threat-model': {
    order: 2,
    tierId: 'tier-2',
    topicId: 'sec-fundamentals',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['def-aaa-cia'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'soc-triage': {
    order: 1,
    tierId: 'tier-2',
    topicId: 'soc-detection',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['def-aaa-cia'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'endpoint-audit': {
    order: 2,
    tierId: 'tier-2',
    topicId: 'soc-detection',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    required: true,
    prerequisites: ['soc-triage', 'win-ad-logs'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'siem-pipelines': {
    order: 3,
    tierId: 'tier-2',
    topicId: 'soc-detection',
    difficulty: 'intermediate',
    estimatedMinutes: 22,
    required: true,
    prerequisites: ['endpoint-audit', 'lin-logfiltering'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'endpoint-defense': {
    order: 1,
    tierId: 'tier-2',
    topicId: 'defense-tech',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['endpoint-audit'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'network-defense': {
    order: 2,
    tierId: 'tier-2',
    topicId: 'defense-tech',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['vpn-firewalls', 'infra-protocols'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'dig-forensics': {
    order: 1,
    tierId: 'tier-2',
    topicId: 'ir-forensics',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    required: true,
    prerequisites: ['boot-os', 'lin-logfiltering'],
    recommendedPrerequisites: ['endpoint-audit'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'incident-response': {
    order: 2,
    tierId: 'tier-2',
    topicId: 'ir-forensics',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['soc-triage', 'dig-forensics'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 3: Offensive Security
  'pentest-method': {
    order: 1,
    tierId: 'tier-3',
    topicId: 'recon-scanning',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['def-aaa-cia', 'net-osi-tcp'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'osint-passive': {
    order: 2,
    tierId: 'tier-3',
    topicId: 'recon-scanning',
    difficulty: 'beginner',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['pentest-method', 'infra-protocols'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'active-recon': {
    order: 3,
    tierId: 'tier-3',
    topicId: 'recon-scanning',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['osint-passive', 'transport-protocols'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'web-owasp-top-10': {
    order: 1,
    tierId: 'tier-3',
    topicId: 'web-security',
    difficulty: 'intermediate',
    estimatedMinutes: 22,
    required: true,
    prerequisites: ['active-recon'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'burpsuite-mastery': {
    order: 2,
    tierId: 'tier-3',
    topicId: 'web-security',
    difficulty: 'intermediate',
    estimatedMinutes: 20,
    required: true,
    prerequisites: ['web-owasp-top-10'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'net-infiltration': {
    order: 1,
    tierId: 'tier-3',
    topicId: 'exploitation-tech',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['active-recon', 'lin-remote'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'password-attacks': {
    order: 2,
    tierId: 'tier-3',
    topicId: 'exploitation-tech',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['lin-permissions', 'win-ad-logs'],
    recommendedPrerequisites: ['net-infiltration'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'wireless-security': {
    order: 3,
    tierId: 'tier-3',
    topicId: 'exploitation-tech',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['net-osi-tcp', 'password-attacks'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'priv-esc': {
    order: 1,
    tierId: 'tier-3',
    topicId: 'post-exploit-privesc',
    difficulty: 'advanced',
    estimatedMinutes: 22,
    required: true,
    prerequisites: ['net-infiltration', 'lin-permissions'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'ad-exploitation': {
    order: 2,
    tierId: 'tier-3',
    topicId: 'post-exploit-privesc',
    difficulty: 'advanced',
    estimatedMinutes: 22,
    required: true,
    prerequisites: ['priv-esc', 'win-ad-logs'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'post-exploit': {
    order: 3,
    tierId: 'tier-3',
    topicId: 'post-exploit-privesc',
    difficulty: 'advanced',
    estimatedMinutes: 20,
    required: true,
    prerequisites: ['priv-esc'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 4: Cloud Security
  'aws-iam-s3': {
    order: 1,
    tierId: 'tier-4',
    topicId: 'aws-defense',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['virt-cloud-basics', 'def-aaa-cia'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'aws-logging': {
    order: 2,
    tierId: 'tier-4',
    topicId: 'aws-defense',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['aws-iam-s3', 'siem-pipelines'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'azure-security': {
    order: 1,
    tierId: 'tier-4',
    topicId: 'azure-gcp-defense',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['virt-cloud-basics', 'def-aaa-cia'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'gcp-security': {
    order: 2,
    tierId: 'tier-4',
    topicId: 'azure-gcp-defense',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['virt-cloud-basics', 'def-aaa-cia'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'k8s-hardening': {
    order: 1,
    tierId: 'tier-4',
    topicId: 'k8s-security',
    difficulty: 'advanced',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['k8s-basics', 'aws-iam-s3'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 5: Malware Analysis
  'malware-triage': {
    order: 1,
    tierId: 'tier-5',
    topicId: 'malware-foundations',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['boot-os', 'dig-forensics'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'static-analysis': {
    order: 2,
    tierId: 'tier-5',
    topicId: 'malware-foundations',
    difficulty: 'advanced',
    estimatedMinutes: 20,
    required: true,
    prerequisites: ['malware-triage', 'py-file-regex'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'dynamic-analysis': {
    order: 3,
    tierId: 'tier-5',
    topicId: 'malware-foundations',
    difficulty: 'advanced',
    estimatedMinutes: 22,
    required: true,
    prerequisites: ['static-analysis', 'hyp-compare'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 6: Reverse Engineering
  'assembly-foundations': {
    order: 1,
    tierId: 'tier-6',
    topicId: 'reverse-assembly',
    difficulty: 'advanced',
    estimatedMinutes: 20,
    required: true,
    prerequisites: ['comp-hardware', 'static-analysis'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'stack-heap-ops': {
    order: 2,
    tierId: 'tier-6',
    topicId: 'reverse-assembly',
    difficulty: 'advanced',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['assembly-foundations'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'debugger-tools': {
    order: 3,
    tierId: 'tier-6',
    topicId: 'reverse-assembly',
    difficulty: 'advanced',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['stack-heap-ops', 'dynamic-analysis'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 7: Cryptography
  'sym-asym-enc': {
    order: 1,
    tierId: 'tier-7',
    topicId: 'cryptography-foundations',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['net-osi-tcp', 'def-aaa-cia'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'hash-sig-pki': {
    order: 2,
    tierId: 'tier-7',
    topicId: 'cryptography-foundations',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: true,
    prerequisites: ['sym-asym-enc'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'tls-handshake': {
    order: 3,
    tierId: 'tier-7',
    topicId: 'cryptography-foundations',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['hash-sig-pki', 'transport-protocols'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 8: GRC
  'infosec-frameworks': {
    order: 1,
    tierId: 'tier-8',
    topicId: 'grc-frameworks',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['def-aaa-cia'],
    recommendedPrerequisites: ['risk-threat-model'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'compliance-standards': {
    order: 2,
    tierId: 'tier-8',
    topicId: 'grc-frameworks',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['infosec-frameworks'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 9: Capture The Flag (Elective / Optional)
  'ctf-formats': {
    order: 1,
    tierId: 'tier-9',
    topicId: 'ctf-strategies',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: false,
    prerequisites: ['comp-hardware'],
    recommendedPrerequisites: ['pentest-method', 'sym-asym-enc'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'ctf-skills': {
    order: 2,
    tierId: 'tier-9',
    topicId: 'ctf-strategies',
    difficulty: 'intermediate',
    estimatedMinutes: 18,
    required: false,
    prerequisites: ['ctf-formats'],
    recommendedPrerequisites: ['web-owasp-top-10'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 10: Certifications (Elective / Optional)
  'entry-certs': {
    order: 1,
    tierId: 'tier-10',
    topicId: 'cert-pathways',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: false,
    prerequisites: ['def-aaa-cia'],
    recommendedPrerequisites: ['net-osi-tcp'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'advanced-certs': {
    order: 2,
    tierId: 'tier-10',
    topicId: 'cert-pathways',
    difficulty: 'intermediate',
    estimatedMinutes: 15,
    required: false,
    prerequisites: ['entry-certs'],
    recommendedPrerequisites: ['incident-response', 'pentest-method'],
    completionRequirements: DEFAULT_COMPLETION,
  },

  // Tier 11: Career Preparation
  'portfolio-resumes': {
    order: 1,
    tierId: 'tier-11',
    topicId: 'career-landing',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['git-workflows', 'def-aaa-cia'],
    recommendedPrerequisites: ['ctf-skills'],
    completionRequirements: DEFAULT_COMPLETION,
  },
  'interviews-networks': {
    order: 2,
    tierId: 'tier-11',
    topicId: 'career-landing',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    required: true,
    prerequisites: ['portfolio-resumes'],
    completionRequirements: DEFAULT_COMPLETION,
  },
};
