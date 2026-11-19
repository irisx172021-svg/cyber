import { User, LabNote, CommunityPost, UserProgress, TimelineEvent } from '../types';

export const DEFAULT_USER: User = {
  id: 'usr-001',
  username: 'NetRunner_Zero',
  email: 'operator@cyberfoundations.io',
  streak: 5,
  lastActiveDate: '2026-07-15', // Yesterday in ISO string format
  xp: 1250,
  rank: 'System Operator',
  level: 3,
  completion: 15,
  verifiedTopics: ['net-osi-tcp'],
  following: []
};

export const DEFAULT_PROGRESS: UserProgress = {
  schemaVersion: 2,
  completedLessonIds: ['net-osi-tcp'],
  completedExerciseIds: [],
  completedQuizLessonIds: ['net-osi-tcp'],
  completedHomeworkLessonIds: [],
  legacyCompletedLessonIds: [],
  awardedXpEventIds: ['submit_quiz:net-osi-tcp'],
  xp: 1250,
  streak: 5,
  lastActiveDate: '2026-07-15'
};

export const DEFAULT_LAB_NOTES: LabNote[] = [
  {
    id: 'note-001',
    moduleId: 'net-osi-tcp',
    moduleTitle: 'The 7-Layer OSI Model vs TCP/IP Suite',
    title: 'OSI Reference Configurations',
    content: `# Personal Lab Notes - OSI & TCP/IP Model

## Port Bindings Checklist
- HTTP: 80 (TCP)
- HTTPS: 443 (TCP)
- SSH: 22 (TCP)
- DNS: 53 (UDP/TCP)
- DHCP: 67, 68 (UDP)

## Packet Analysis Syntax
To dump hex payload of network cards:
\`\`\`bash
sudo tcpdump -i any -c 10 -XX
\`\`\`

## Notes to remember:
* Bridges and switches operate at Layer 2 (Data Link) using MAC addresses.
* Routers and Layer 3 switches route packets using IP addresses (Layer 3).
* End-to-end checksums are validated at Layer 4 (Transport).
`,
    lastSaved: '2026-07-15T18:30:00.000Z'
  },
  {
    id: 'note-002',
    moduleId: 'lin-permissions',
    moduleTitle: 'Linux CLI Operators, Permissions & Logs',
    title: 'Linux Privilege Esc & Auditing',
    content: `# Linux Privilege Escalation & Audit Notes

## Quick Sudo Audit command
\`\`\`bash
sudo -l
\`\`\`
Enables checking if there are binaries that run with NOPASSWD.

## Key Permissions octal mappings:
- \`chmod 755\` -> \`rwxr-xr-x\` (common for executable scripts)
- \`chmod 600\` -> \`rw-------\` (standard private keys configuration)
- \`chmod 644\` -> \`rw-r--r--\` (standard readable document config)

Always grep for /var/log/auth.log when hunting intrusion vectors.
`,
    lastSaved: '2026-07-16T09:12:00.000Z'
  }
];

export const DEFAULT_COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'post-001',
    title: 'How to bypass Windows Defender on customized CTF challenges?',
    author: 'Infiltrator_X',
    authorRole: 'Infiltrator',
    content: 'For customized labs, compiling payloads directly inside memory (using custom C# runners with reflection) bypasses standard static signature matching. Has anyone successfully loaded Golang-based shells into Win64 without triggering telemetry? Appreciate recommendations!',
    category: 'Offensive',
    upvotes: 42,
    userVote: null,
    createdAt: '2026-07-15T14:22:00.000Z',
    commentsCount: 12
  },
  {
    id: 'post-002',
    title: 'NIST Framework 2.0 - Core updates you need to know for Security+ exam',
    author: 'AuditMaster',
    authorRole: 'Instructor',
    content: 'NIST CSF 2.0 has officially added the "GOVERN" function to the previous five functions (Identify, Protect, Detect, Respond, Recover). It emphasizes cybersecurity risk management as a corporate governance priority. Make sure to remember this for GRC audits and the latest CompTIA updates!',
    category: 'Certifications',
    upvotes: 29,
    userVote: 'up', // Starts with upvoted state
    createdAt: '2026-07-16T02:15:00.000Z',
    commentsCount: 4
  },
  {
    id: 'post-003',
    title: 'Recommended SIEM filter patterns for SSH password spraying',
    author: 'BlueTeam_Lover',
    authorRole: 'Operator',
    content: 'To catch spray attacks across hosts, build a multi-host correlation alert. Group failed logins by source IP (src_ip) but count distinct destination users (count(distinct user) > 5) within a 3-minute window. This successfully catches spraying while filtering out standard single-user lockouts.',
    category: 'Defensive',
    upvotes: 18,
    userVote: null,
    createdAt: '2026-07-16T08:05:00.000Z',
    commentsCount: 3
  },
  {
    id: 'post-004',
    title: 'Are there hypervisor-level escapes we should worry about in Docker container audits?',
    author: 'DockerNoob',
    authorRole: 'Cadet',
    content: 'I am auditing containers running with privileged flags. Does that allow escape to the host root file system? Also, what are standard namespaces audit methods?',
    category: 'Help',
    upvotes: 8,
    userVote: null,
    createdAt: '2026-07-16T09:40:00.000Z',
    commentsCount: 7
  }
];

export const DEFAULT_OPERATOR_DIRECTORY: User[] = [
  {
    id: 'usr-001',
    username: 'NetRunner_Zero',
    email: 'operator@cyberfoundations.io',
    streak: 5,
    lastActiveDate: '2026-07-15',
    xp: 1250,
    rank: 'System Operator',
    level: 3,
    completion: 15,
    verifiedTopics: ['net-osi-tcp'],
    following: []
  },
  {
    id: 'usr-002',
    username: 'Infiltrator_X',
    email: 'infx@cyberfoundations.io',
    streak: 12,
    lastActiveDate: '2026-07-16',
    xp: 1850,
    rank: 'Elite Operator',
    level: 4,
    completion: 4,
    verifiedTopics: ['net-osi-tcp', 'lin-permissions', 'sym-asym-enc'],
    following: ['AuditMaster']
  },
  {
    id: 'usr-003',
    username: 'AuditMaster',
    email: 'audit@cyberfoundations.io',
    streak: 28,
    lastActiveDate: '2026-07-16',
    xp: 3400,
    rank: 'Senior Cyber Infiltrator',
    level: 7,
    completion: 6,
    verifiedTopics: ['net-osi-tcp', 'lin-permissions', 'azure-security', 'sym-asym-enc'],
    following: ['Infiltrator_X']
  },
  {
    id: 'usr-004',
    username: 'BlueTeam_Lover',
    email: 'blueteam@cyberfoundations.io',
    streak: 4,
    lastActiveDate: '2026-07-16',
    xp: 1100,
    rank: 'System Operator',
    level: 2,
    completion: 1,
    verifiedTopics: ['net-osi-tcp'],
    following: []
  },
  {
    id: 'usr-005',
    username: 'DockerNoob',
    email: 'dockernoob@cyberfoundations.io',
    streak: 1,
    lastActiveDate: '2026-07-15',
    xp: 350,
    rank: 'Cadet',
    level: 1,
    completion: 5,
    verifiedTopics: [],
    following: ['Infiltrator_X']
  }
];

export const DEFAULT_TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: 'ev-001',
    username: 'Infiltrator_X',
    action: 'completed Linux Privilege Esc & Auditing',
    xpReward: 300,
    timestamp: '2026-07-16T18:45:00.000Z'
  },
  {
    id: 'ev-002',
    username: 'AuditMaster',
    action: 'certified NIST Framework 2.0',
    xpReward: 500,
    timestamp: '2026-07-16T20:10:00.000Z'
  },
  {
    id: 'ev-003',
    username: 'BlueTeam_Lover',
    action: 'completed The 7-Layer OSI Model vs TCP/IP Suite',
    xpReward: 400,
    timestamp: '2026-07-17T02:30:00.000Z'
  }
];
