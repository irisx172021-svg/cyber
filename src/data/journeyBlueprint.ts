export type JourneyStageOrder = 1 | 2 | 3 | 4 | 5;

export interface JourneyTopicDefinition {
  id: string;
  code: string;
  title: string;
  description: string;
  learningOutcomes: string[];
  canonicalTopicIds: string[];
  lessonIds: string[];
  prerequisiteNote: string;
  recommendedNextNote: string;
  isOptionalGroup?: boolean;
  authorizedLabNotice?: string;
}

export interface JourneyStageDefinition {
  id: string;
  order: JourneyStageOrder;
  title: string;
  shortTitle: string;
  purpose: string;
  description: string;
  learningOutcomes: string[];
  prerequisiteExplanation: string;
  topics: JourneyTopicDefinition[];
  capstoneIds: string[];
}

export type PathwayReadinessStatus =
  | 'complete'
  | 'substantially_complete'
  | 'partially_complete'
  | 'needs_development';

export interface SpecialistPathwayDefinition {
  id: string;
  title: string;
  roleTitle: string;
  purpose: string;
  readinessStatus: PathwayReadinessStatus;
  readinessSummary: string;
  sharedFoundationLessonIds: string[];
  stage4IntroLessonIds: string[];
  stage5AdvancedLessonIds: string[];
  capstoneIds: string[];
  missingFutureTopics: string[];
  authorizedOnlyNotice?: string;
}

export interface JourneyCapstoneReference {
  id: string;
  code: 'A' | 'B' | 'C' | 'D';
  title: string;
  stageId: string;
  pathwayIds: string[];
  description: string;
}

export const JOURNEY_CAPSTONE_REFERENCES: JourneyCapstoneReference[] = [
  {
    id: 'capstone-soc-investigation',
    code: 'A',
    title: 'Blue-Team SOC Investigation: Multi-Stage Workstation Intrusion',
    stageId: 'stage-4',
    pathwayIds: ['pathway-soc-detection', 'pathway-dfir'],
    description:
      'Correlate authentication logs, Sysmon process trees, DNS TXT beaconing, and host containment controls.',
  },
  {
    id: 'capstone-web-app-review',
    code: 'B',
    title: 'Secure Web Application Review: Auth, Session & Data-Access Audit',
    stageId: 'stage-4',
    pathwayIds: ['pathway-appsec', 'pathway-sec-arch', 'pathway-pentest'],
    description:
      'Audit JWT handling, SQL parameterization, HTTP trust headers, and broken object-level authorization.',
  },
  {
    id: 'capstone-cloud-incident',
    code: 'C',
    title: 'Cloud Security & Incident Reconstruction: IAM & Storage Audit',
    stageId: 'stage-4',
    pathwayIds: ['pathway-cloud-sec', 'pathway-sec-arch'],
    description:
      'Trace exposed IAM credentials, CloudTrail anomalies, public S3 storage policies, and cloud containment.',
  },
  {
    id: 'capstone-forensics-triage',
    code: 'D',
    title: 'Digital Forensics & Malware Triage: Memory & Artifact Acquisition',
    stageId: 'stage-4',
    pathwayIds: ['pathway-dfir', 'pathway-malware-re'],
    description:
      'Review volatile memory indicators, PE imports, strings output, and chain-of-custody artifact preservation.',
  },
];

export const JOURNEY_STAGES: JourneyStageDefinition[] = [
  {
    id: 'stage-1',
    order: 1,
    title: 'Understand Computers',
    shortTitle: 'Computers & OS',
    purpose:
      'Build a reliable mental model of how hardware executes code and how Windows and Linux operating systems manage files, permissions, processes, and logs.',
    description:
      'Start from zero with CPU/RAM/storage architecture, boot sequences, Windows registries and event logs, and essential Linux administration.',
    learningOutcomes: [
      'Explain how CPU, RAM, storage, and firmware cooperate during system boot and program execution.',
      'Navigate Linux and Windows file systems, ownership, permissions, services, and administrative shells safely.',
      'Inspect system services, host firewalls, and local OS logs for operational anomalies.',
    ],
    prerequisiteExplanation:
      'Open to everyone starting from zero. Begins with Computer Hardware, CPU, RAM & Storage (no prior prerequisites).',
    capstoneIds: [],
    topics: [
      {
        id: 'journey-hardware-os',
        code: '1.1',
        title: 'Hardware & Operating System Internals',
        description:
          'Understand physical compute resources, firmware initialization, and how kernels isolate user-space applications.',
        learningOutcomes: [
          'Differentiate CPU registers, cache, RAM, and persistent storage roles.',
          'Trace UEFI/BIOS boot, bootloader verification, and kernel-space vs. user-space separation.',
        ],
        canonicalTopicIds: ['computer-fundamentals'],
        lessonIds: ['comp-hardware', 'boot-os'],
        prerequisiteNote: 'No prior prerequisites required—begin here.',
        recommendedNextNote:
          'Continue into Windows and Linux OS administration once boot concepts are clear.',
      },
      {
        id: 'journey-windows-os',
        code: '1.2',
        title: 'Windows Architecture, Shells & Auditing',
        description:
          'Learn Windows internals, CMD/PowerShell operations, Active Directory concepts, event logs, and host firewall controls.',
        learningOutcomes: [
          'Navigate Windows system directories, Registry hives, and PowerShell administrative cmdlets.',
          'Interpret foundational Active Directory identity boundaries, Windows Event Logs, and defender firewall controls.',
        ],
        canonicalTopicIds: ['windows-mastery'],
        lessonIds: ['win-arch', 'win-shells', 'win-ad-logs', 'win-services-firewall'],
        prerequisiteNote:
          'Unlocks after System Boot & OS Architecture. Note: Active Directory & Event Logs introduces enterprise identity concepts that pay off later in SOC detection.',
        recommendedNextNote:
          'Pair Windows literacy with Linux administration in Topic 1.3.',
      },
      {
        id: 'journey-linux-cli',
        code: '1.3',
        title: 'Linux File System, Permissions & Operations',
        description:
          'Build command-line fluency across the Linux filesystem, POSIX permissions, systemd services, bash scripting, log filtering, and SSH.',
        learningOutcomes: [
          'Manage Linux files, users, groups, chmod/chown permissions, and sudo privileges.',
          'Automate routine tasks with Bash, filter logs with grep/awk/sed, manage services, and administer hosts remotely via SSH.',
        ],
        canonicalTopicIds: ['linux-mastery'],
        lessonIds: [
          'lin-fs',
          'lin-permissions',
          'lin-services',
          'bash-scripting',
          'lin-logfiltering',
          'lin-remote',
        ],
        prerequisiteNote:
          'Unlocks after System Boot & OS Architecture. Stream Editing (grep, find, awk, sed) introduces intermediate regex pipelines—take your time practicing.',
        recommendedNextNote:
          'Once comfortable in OS shells, move to Stage 2 to see how machines communicate and run applications.',
      },
    ],
  },
  {
    id: 'stage-2',
    order: 2,
    title: 'Understand Technology',
    shortTitle: 'Core Technology',
    purpose:
      'Learn the networking, web, database, scripting, and virtualization technologies that every modern application and cloud platform relies on.',
    description:
      'Connect standalone computers into networked systems: TCP/IP routing, HTTP web architecture, Git workflows, SQL databases, Python scripting, and containers.',
    learningOutcomes: [
      'Trace packets across OSI/TCP-IP layers, IPv4 subnets, DNS/DHCP, ports, switches, and routers.',
      'Explain how browsers talk to web servers over HTTP, store data via SQL, and structure configs in JSON/YAML.',
      'Write foundational Python scripts and package isolated workloads with VMs and Docker containers.',
    ],
    prerequisiteExplanation:
      'Requires Stage 1 hardware, boot, and Linux filesystem milestones (`comp-hardware`, `boot-os`, `lin-fs`) for networking, virtualization, and container lessons.',
    capstoneIds: [],
    topics: [
      {
        id: 'journey-networking-core',
        code: '2.1',
        title: 'Networking Core, Addressing & Protocols',
        description:
          'Master OSI and TCP/IP layers, IPv4 subnetting, core infrastructure protocols, TCP/UDP ports, and L2/L3 switching and routing.',
        learningOutcomes: [
          'Diagnose connectivity across DNS, DHCP, NAT, ARP, ICMP, and TCP/UDP socket states.',
          'Calculate IPv4 CIDR subnets and understand VLAN segmentation and routing paths.',
        ],
        canonicalTopicIds: ['networking'],
        lessonIds: [
          'net-osi-tcp',
          'ip-subnetting',
          'infra-protocols',
          'transport-protocols',
          'switching-routing',
        ],
        prerequisiteNote:
          'Begins immediately after Computer Hardware (`comp-hardware`), then progresses sequentially through subnetting and routing.',
        recommendedNextNote:
          'Apply networking concepts to developer workflows, HTTP web architecture, and Python.',
      },
      {
        id: 'journey-dev-python',
        code: '2.2',
        title: 'Developer Workflows, Structured Data & Python',
        description:
          'Use Git version control, read JSON/YAML configuration files, and build practical Python and regular-expression parsing skills.',
        learningOutcomes: [
          'Track code and configuration changes safely with Git commits and branches.',
          'Parse structured JSON/YAML data and write Python file/regex utilities.',
        ],
        canonicalTopicIds: ['git-dev', 'python-cyber'],
        lessonIds: ['git-workflows', 'markup-formats', 'py-basics', 'py-file-regex'],
        prerequisiteNote:
          'Starts after `comp-hardware`. Structured Formats (`markup-formats`) unlocks both Python Basics and Databases/SQL.',
        recommendedNextNote:
          'Advance to Web, APIs & Databases to connect structured formats with client-server data access.',
      },
      {
        id: 'journey-web-databases',
        code: '2.3',
        title: 'Web Architecture, HTTP & SQL Databases',
        description:
          'Explore how HTTP requests, responses, cookies, and browser trust interact with relational databases and SQL queries.',
        learningOutcomes: [
          'Inspect HTTP methods, status codes, headers, and same-origin/cookie foundations.',
          'Read and write foundational SQL queries and understand relational data access paths.',
        ],
        canonicalTopicIds: ['networking', 'git-dev'],
        lessonIds: ['http-web-arch', 'db-sql-foundations'],
        prerequisiteNote:
          'HTTP requires Infrastructure & Transport Protocols; Databases & SQL requires Structured Formats (`markup-formats`).',
        recommendedNextNote:
          'Finish Stage 2 with Virtualization & Containers before entering shared cybersecurity principles.',
      },
      {
        id: 'journey-virtualization-containers',
        code: '2.4',
        title: 'Virtualization, Hypervisors & Docker Containers',
        description:
          'Understand cloud abstractions, Type 1/Type 2 hypervisors, and container isolation with Docker images and Compose.',
        learningOutcomes: [
          'Compare virtual machines against shared-kernel Linux containers.',
          'Build and manage safe isolated lab environments using hypervisors and Docker.',
        ],
        canonicalTopicIds: ['computer-fundamentals', 'virt-containers'],
        lessonIds: ['virt-cloud-basics', 'hyp-compare', 'docker-basics'],
        prerequisiteNote:
          'Builds on `boot-os` and `lin-fs`. Kubernetes orchestration is intentionally placed in Stage 4 alongside Cloud Security.',
        recommendedNextNote:
          'With computing and technology foundations complete, move into Stage 3 shared cybersecurity core.',
      },
    ],
  },
  {
    id: 'stage-3',
    order: 3,
    title: 'Understand Cybersecurity',
    shortTitle: 'Security Core',
    purpose:
      'Establish the universal security concepts—confidentiality, risk, identity, cryptography, perimeter controls, phishing defense, and triage—that every cybersecurity role depends on.',
    description:
      'Bridge technical knowledge into core security thinking before choosing a specialization: CIA/AAA, threat modeling, OAuth/JWTs, CVEs, AES/RSA/PKI/TLS, firewalls, IDS/IPS, and SOC triage.',
    learningOutcomes: [
      'Apply CIA triad, AAA, least privilege, STRIDE threat modeling, and CVSS vulnerability prioritization.',
      'Explain modern authentication, session tokens, symmetric/asymmetric encryption, digital signatures, PKI, and TLS 1.3.',
      'Interpret perimeter firewalls, IDS/IPS packet alerts, SPF/DKIM/DMARC email security, and initial SOC alert triage.',
    ],
    prerequisiteExplanation:
      'Unlocks once Stage 1 Linux permissions (`lin-permissions`) and Stage 2 networking/web (`net-osi-tcp`, `http-web-arch`, `transport-protocols`, `switching-routing`) are complete.',
    capstoneIds: [],
    topics: [
      {
        id: 'journey-sec-principles',
        code: '3.1',
        title: 'Security Principles, Risk & Threat Modeling',
        description:
          'Learn how organizations define confidentiality, integrity, availability, accountability, and structured threat models.',
        learningOutcomes: [
          'Evaluate systems using CIA/AAA principles and defense-in-depth.',
          'Identify trust boundaries, threats, and mitigations using STRIDE and risk scoring.',
        ],
        canonicalTopicIds: ['sec-fundamentals'],
        lessonIds: ['def-aaa-cia', 'risk-threat-model'],
        prerequisiteNote:
          'Requires `net-osi-tcp` and `lin-permissions`. Forms the gateway to almost all Stage 3–5 security lessons.',
        recommendedNextNote:
          'Proceed to Identity, Authentication & Vulnerability Management.',
      },
      {
        id: 'journey-identity-vuln',
        code: '3.2',
        title: 'Identity, Sessions & Vulnerability Management',
        description:
          'Understand how authentication protocols protect user sessions and how teams prioritize software vulnerabilities.',
        learningOutcomes: [
          'Contrast session cookies, JWTs, MFA, OAuth 2.0, OIDC, and SAML trust flows.',
          'Prioritize CVEs using CVSS context, asset criticality, and remediation SLAs.',
        ],
        canonicalTopicIds: ['sec-fundamentals'],
        lessonIds: ['auth-sessions-id', 'vuln-management'],
        prerequisiteNote:
          'Builds directly on Defensive Frameworks (`def-aaa-cia`), Risk Modeling (`risk-threat-model`), and HTTP Web Architecture.',
        recommendedNextNote:
          'Explore how cryptography secures data in transit and at rest in Topic 3.3.',
      },
      {
        id: 'journey-cryptography-tls',
        code: '3.3',
        title: 'Applied Cryptography, PKI & TLS',
        description:
          'Demystify AES, RSA/ECC, cryptographic hashing, HMACs, certificate authorities, and TLS 1.3 handshakes.',
        learningOutcomes: [
          'Choose appropriate encryption vs. cryptographic hashing mechanisms.',
          'Verify digital signatures, PKI certificate chains, and TLS forward secrecy.',
        ],
        canonicalTopicIds: ['cryptography-foundations'],
        lessonIds: ['sym-asym-enc', 'hash-sig-pki', 'tls-handshake'],
        prerequisiteNote:
          'Requires `net-osi-tcp`, `def-aaa-cia`, and `transport-protocols`. Surfaced here from Tier 7 so every cloud, web, and SOC learner masters TLS early.',
        recommendedNextNote:
          'Connect cryptographic and identity principles to perimeter and monitoring controls in Topic 3.4.',
      },
      {
        id: 'journey-monitoring-defense',
        code: '3.4',
        title: 'Perimeter Defense, Email Security & Alert Triage',
        description:
          'Protect networks and users with firewalls, VPNs, IDS/IPS packet analysis, anti-phishing authentication, and alert triage.',
        learningOutcomes: [
          'Audit firewall/VPN rules and interpret Wireshark, Snort, and Suricata traffic alerts.',
          'Investigate phishing headers (SPF/DKIM/DMARC) and execute structured Tier 1 alert triage.',
        ],
        canonicalTopicIds: ['networking', 'defense-tech', 'soc-detection'],
        lessonIds: ['vpn-firewalls', 'network-defense', 'email-security', 'soc-triage'],
        prerequisiteNote:
          'Connects Stage 2 routing/protocols with Stage 3 defensive foundations (`def-aaa-cia`).',
        recommendedNextNote:
          'Ready to branch out: open Stage 4 to sample all major cybersecurity domains and complete Guided Capstones.',
      },
    ],
  },
  {
    id: 'stage-4',
    order: 4,
    title: 'Explore Cybersecurity Domains',
    shortTitle: 'Cyber Domains',
    purpose:
      'Sample major cybersecurity career domains—Blue Team/SOC, DFIR, Malware Intro, Authorized Pentesting, AppSec/DevSecOps, Security Engineering, Cloud, and GRC—through safe, introductory modules and real capstones.',
    description:
      'Discover how different cybersecurity roles operate day-to-day, build cross-domain fluency, and test your synthesis across Guided Capstones A–D.',
    learningOutcomes: [
      'Compare the daily workflows of SOC analysts, DFIR responders, AppSec engineers, cloud defenders, ethical pentesters, and GRC specialists.',
      'Execute safe introductory practicals spanning Sysmon triage, Nmap lab recon, OWASP Top 10, CI/CD audits, multi-cloud IAM, and regulatory frameworks.',
      'Synthesize foundational findings in multi-stage Guided Capstones (SOC, Web AppSec, Cloud, DFIR).',
    ],
    prerequisiteExplanation:
      'Requires Stages 1–3 foundations. Optional practice topics (`4.9`) unlock early and never block core Stage 4 progress.',
    capstoneIds: [
      'capstone-soc-investigation',
      'capstone-web-app-review',
      'capstone-cloud-incident',
      'capstone-forensics-triage',
    ],
    topics: [
      {
        id: 'journey-blue-team-soc',
        code: '4.1',
        title: 'Blue Team & SOC Operations',
        description:
          'Investigate endpoint telemetry with Sysmon, design SIEM ingestion pipelines, and compare AV/EDR/XDR host defense.',
        learningOutcomes: [
          'Trace suspicious process parent-child trees using Sysmon and Windows Event Logs.',
          'Understand SIEM log normalization, correlation rules, and EDR containment actions.',
        ],
        canonicalTopicIds: ['soc-detection', 'defense-tech'],
        lessonIds: ['endpoint-audit', 'siem-pipelines', 'endpoint-defense'],
        prerequisiteNote:
          'Requires `soc-triage`, `win-ad-logs`, and `lin-logfiltering`. Unlocks Blue-Team Capstone A.',
        recommendedNextNote:
          'Try Guided Capstone A (SOC Workstation Intrusion) or continue to DFIR in Topic 4.2.',
      },
      {
        id: 'journey-dfir-foundations',
        code: '4.2',
        title: 'Digital Forensics & Incident Response',
        description:
          'Learn forensic acquisition principles, evidence integrity, and the end-to-end NIST Incident Response lifecycle.',
        learningOutcomes: [
          'Preserve digital evidence hashes and reconstruct artifact timelines safely.',
          'Coordinate Preparation, Detection, Containment, Eradication, Recovery, and Lessons Learned.',
        ],
        canonicalTopicIds: ['ir-forensics'],
        lessonIds: ['dig-forensics', 'incident-response'],
        prerequisiteNote:
          'Digital Forensics starts after `boot-os` + `lin-logfiltering`; Incident Response connects SOC triage, DFIR, and Email Security.',
        recommendedNextNote:
          'Pair DFIR with safe Static Malware Triage in Topic 4.3 to unlock Capstone D.',
      },
      {
        id: 'journey-malware-intro',
        code: '4.3',
        title: 'Malware Analysis Introduction (Safe Static Triage)',
        description:
          'Classify common malware families and perform non-executing hash, string, and PE header triage safely.',
        learningOutcomes: [
          'Identify ransomware, infostealers, RATs, and rootkits by operational behavior.',
          'Extract SHA-256 hashes, printable strings, and PE import tables without running untrusted binaries.',
        ],
        canonicalTopicIds: ['malware-foundations'],
        lessonIds: ['malware-triage'],
        prerequisiteNote:
          'Requires `boot-os` and `dig-forensics`. Gateway into Capstone D and Stage 5 Reverse Engineering.',
        recommendedNextNote:
          'Explore DFIR/Malware Capstone D or sample offensive testing methodologies next.',
      },
      {
        id: 'journey-pentest-intro',
        code: '4.4',
        title: 'Authorized Penetration Testing Introduction',
        description:
          'Learn rules of engagement, passive OSINT reconnaissance, and authorized service enumeration in simulated lab networks.',
        learningOutcomes: [
          'Define strict legal scope, authorization boundaries, and PTES engagement phases.',
          'Gather passive OSINT indicators and interpret Nmap service scans against authorized lab targets.',
        ],
        canonicalTopicIds: ['recon-scanning'],
        lessonIds: ['pentest-method', 'osint-passive', 'active-recon'],
        prerequisiteNote:
          'Begins after `def-aaa-cia` and `net-osi-tcp`. All practical scanning stays inside simulated/authorized documentation ranges.',
        recommendedNextNote:
          'Completing Active Recon unlocks Web Application Security in Topic 4.5.',
        authorizedLabNotice:
          'Authorized Environment Only: Reconnaissance labs run against simulated synthetic lab ranges (`192.0.2.40`) under explicit learning scope.',
      },
      {
        id: 'journey-appsec-devsecops',
        code: '4.5',
        title: 'Application Security & DevSecOps Foundations',
        description:
          'Understand OWASP Top 10 web application risks alongside shift-left SAST, DAST, SCA, and CI/CD pipeline security.',
        learningOutcomes: [
          'Identify injection, broken access control, XSS, and SSRF flaws in web application flows.',
          'Audit CI/CD workflows for pinned dependencies, OIDC federation, SBOMs, and secrets safety.',
        ],
        canonicalTopicIds: ['web-security', 'k8s-security'],
        lessonIds: ['web-owasp-top-10', 'devsecops-cicd'],
        prerequisiteNote:
          'OWASP Top 10 requires `active-recon`, `http-web-arch`, `db-sql-foundations`, and `auth-sessions-id`; DevSecOps requires `git-workflows`, `docker-basics`, `vuln-management`, and `auth-sessions-id`.',
        recommendedNextNote:
          'Complete Guided Capstone B (Web Application Review) or explore Security Tooling in Topic 4.6.',
      },
      {
        id: 'journey-seceng-tooling',
        code: '4.6',
        title: 'Security Engineering & Network Tooling',
        description:
          'Apply Python `requests` and Scapy read-only packet dissection to automate security verification and traffic inspection.',
        learningOutcomes: [
          'Automate safe HTTP/TLS header checks using Python.',
          'Dissect saved `.pcap` captures and construct controlled L3 lab probes with Scapy.',
        ],
        canonicalTopicIds: ['python-cyber'],
        lessonIds: ['py-automation'],
        prerequisiteNote:
          'Requires `py-file-regex` and `net-osi-tcp`. Surfaced in Stage 4 to keep Stage 2 Python accessible for beginners.',
        recommendedNextNote:
          'Continue to Multi-Cloud & Kubernetes Intro in Topic 4.7.',
      },
      {
        id: 'journey-cloud-intro',
        code: '4.7',
        title: 'Cloud & Kubernetes Platform Security Intro',
        description:
          'Compare AWS, Azure, and GCP identity, logging, and storage controls alongside core Kubernetes cluster architecture.',
        learningOutcomes: [
          'Audit AWS IAM/S3, CloudTrail/GuardDuty, Azure Entra/Defender, and GCP IAM/SCC postures.',
          'Explain Kubernetes control-plane components (`kube-apiserver`, `etcd`, `kubelet`) and Pod/Service inspection.',
        ],
        canonicalTopicIds: ['aws-defense', 'azure-gcp-defense', 'virt-containers'],
        lessonIds: ['aws-iam-s3', 'aws-logging', 'azure-security', 'gcp-security', 'k8s-basics'],
        prerequisiteNote:
          '`aws-logging` requires `aws-iam-s3` + `siem-pipelines` (Topic 4.1); `k8s-basics` requires `docker-basics` (Stage 2).',
        recommendedNextNote:
          'Apply AWS IAM and CloudTrail skills in Guided Capstone C, or inspect GRC frameworks next.',
      },
      {
        id: 'journey-grc-foundations',
        code: '4.8',
        title: 'Governance, Risk & Compliance (GRC)',
        description:
          'Map organizational security controls across NIST CSF, ISO 27001, SOC 2, and GDPR/HIPAA/PCI-DSS regulations.',
        learningOutcomes: [
          'Align technical security controls to NIST CSF functions and SOC 2/ISO 27001 trust criteria.',
          'Identify regulatory obligations and scope boundaries for privacy, healthcare, and payment data.',
        ],
        canonicalTopicIds: ['grc-frameworks'],
        lessonIds: ['infosec-frameworks', 'compliance-standards'],
        prerequisiteNote:
          'Frameworks require only `def-aaa-cia`; Regulatory Compliance builds on `infosec-frameworks` and `vuln-management`.',
        recommendedNextNote:
          'Explore optional practice formats in Topic 4.9 or advance into Stage 5 specialist pathways.',
      },
      {
        id: 'journey-practice-orientation',
        code: '4.9',
        title: 'Practice Competitions & Certification Orientation',
        description:
          'Optional orientation covering CTF challenge formats and entry-level industry certifications (Security+, Network+, eJPT).',
        learningOutcomes: [
          'Understand Jeopardy vs. Attack-Defense CTF competition structures.',
          'Evaluate beginner certification pathways aligned with your career interests.',
        ],
        canonicalTopicIds: ['ctf-strategies', 'cert-pathways'],
        lessonIds: ['ctf-formats', 'entry-certs'],
        prerequisiteNote:
          'Optional modules (`required: false`): completing them earns XP without blocking core Stage 4 completion.',
        recommendedNextNote:
          'Choose a deep role specialization in Stage 5.',
        isOptionalGroup: true,
      },
    ],
  },
  {
    id: 'stage-5',
    order: 5,
    title: 'Advanced Learning Paths',
    shortTitle: 'Specialist Paths',
    purpose:
      'Develop role-ready technical depth in Application Security, Cloud/Kubernetes Hardening, Malware Reverse Engineering, Authorized Penetration Testing, and Cybersecurity Career Transition.',
    description:
      'Deep specialist labs, binary & assembly internals, privilege escalation and Active Directory defense/offense, and portfolio/interview preparation.',
    learningOutcomes: [
      'Execute intercepting web proxy tampering workflows, Kubernetes RBAC/NetworkPolicy hardening, and binary/debugger analysis.',
      'Analyze authorized exploitation chains, privilege escalation paths, and Active Directory attack defenses in controlled sandboxes.',
      'Translate verified labs and Guided Capstones into a technical cybersecurity portfolio and interview readiness.',
    ],
    prerequisiteExplanation:
      'Advanced topics depend on Stage 4 domain foundations. A few modules (`c-memory-foundations`, `password-attacks`, `portfolio-resumes`) unlock earlier if their Stage 1–3 prerequisites are already satisfied.',
    capstoneIds: [],
    topics: [
      {
        id: 'journey-appsec-eng',
        code: '5.1',
        title: 'Application Security Engineering',
        description:
          'Master intercepting web proxy workflows—Proxy, Repeater, Intruder, Decoder, and Sequencer—for deep HTTP testing.',
        learningOutcomes: [
          'Configure a local intercepting proxy (`127.0.0.1:8080`) and replay manipulated requests safely.',
          'Assess session token entropy and parameter fuzzing risks in web applications.',
        ],
        canonicalTopicIds: ['web-security'],
        lessonIds: ['burpsuite-mastery'],
        prerequisiteNote: 'Requires Stage 4 `web-owasp-top-10`.',
        recommendedNextNote:
          'Apply deep HTTP review skills alongside Guided Capstone B.',
        authorizedLabNotice:
          'Authorized Environment Only: Intercepting proxy testing must only be conducted against local loopback labs or explicitly authorized scopes.',
      },
      {
        id: 'journey-cloud-k8s-eng',
        code: '5.2',
        title: 'Cloud & Kubernetes Security Engineering',
        description:
          'Harden multi-tenant Kubernetes clusters with scoped RBAC, pod NetworkPolicies, Secrets handling, and non-root admission.',
        learningOutcomes: [
          'Enforce least-privilege `Role`/`ClusterRole` bindings and segmented NetworkPolicy ingress/egress.',
          'Eliminate privileged container defaults and enforce immutable read-only root filesystems.',
        ],
        canonicalTopicIds: ['k8s-security'],
        lessonIds: ['k8s-hardening'],
        prerequisiteNote:
          'Requires Stage 4 `k8s-basics`, `aws-iam-s3`, and `devsecops-cicd`.',
        recommendedNextNote:
          'Pair cluster hardening with Guided Capstone C for full cloud incident mastery.',
      },
      {
        id: 'journey-malware-re',
        code: '5.3',
        title: 'Malware Analysis & Reverse Engineering',
        description:
          'Progress from static YARA/disassembly and sandboxed dynamic analysis through C memory layouts, x86-64 assembly, stack frames, and GDB/decompilers.',
        learningOutcomes: [
          'Author YARA rules and trace dynamic API/registry/network telemetry in isolated sandboxes.',
          'Read C memory segments, x86-64 calling conventions, stack/heap layouts, and debugger register states.',
        ],
        canonicalTopicIds: ['malware-foundations', 'reverse-assembly'],
        lessonIds: [
          'static-analysis',
          'dynamic-analysis',
          'c-memory-foundations',
          'assembly-foundations',
          'stack-heap-ops',
          'debugger-tools',
        ],
        prerequisiteNote:
          'Note: `c-memory-foundations` unlocks early once `comp-hardware`, `boot-os`, and `py-basics` are complete; full Assembly & Debugger topics build sequentially from `static-analysis`.',
        recommendedNextNote:
          'Revisit Guided Capstone D with deeper static/dynamic analysis context.',
      },
      {
        id: 'journey-pentest-advanced',
        code: '5.4',
        title: 'Authorized Penetration Testing & Exploitation',
        description:
          'Study controlled exploitation, credential auditing, wireless vectors, privilege escalation, Active Directory attack paths, and post-exploitation mechanics.',
        learningOutcomes: [
          'Understand exploitation verification, password policy auditing, and WPA2/WPA3 enterprise controls.',
          'Identify Linux/Windows privilege escalation paths, Kerberoasting/AD tiering gaps, and persistence indicators.',
        ],
        canonicalTopicIds: ['exploitation-tech', 'post-exploit-privesc'],
        lessonIds: [
          'net-infiltration',
          'password-attacks',
          'wireless-security',
          'priv-esc',
          'ad-exploitation',
          'post-exploit',
        ],
        prerequisiteNote:
          'Builds from Stage 4 `active-recon` (`password-attacks` unlocks earlier from `lin-permissions` + `win-ad-logs`). Strictly scoped to authorized simulation environments.',
        recommendedNextNote:
          'Synthesize remediation reports in Career Readiness (`5.5`) once complete.',
        authorizedLabNotice:
          'Authorized Environments Only: All exploitation, credential auditing, and Active Directory attack concepts are restricted to simulated academy labs and authorized penetration testing scopes.',
      },
      {
        id: 'journey-career-readiness',
        code: '5.5',
        title: 'Role Specialization, CTF Practice & Career Readiness',
        description:
          'Bridge technical mastery into role readiness with hands-on CTF category drills, advanced certification planning, resumes/portfolios, and technical interviews.',
        learningOutcomes: [
          'Package practical labs and Guided Capstones into verifiable portfolio projects and resumes.',
          'Navigate scenario-based technical interviews and align advanced certifications (OSCP, CISSP) to target roles.',
        ],
        canonicalTopicIds: ['ctf-strategies', 'cert-pathways', 'career-landing'],
        lessonIds: ['ctf-skills', 'advanced-certs', 'portfolio-resumes', 'interviews-networks'],
        prerequisiteNote:
          '`ctf-skills` and `advanced-certs` are optional practice guides; `portfolio-resumes` unlocks after `git-workflows` + `def-aaa-cia` and leads to `interviews-networks`.',
        recommendedNextNote:
          'Ensure all 4 Guided Capstones and your target Specialist Pathway are complete!',
      },
    ],
  },
];

export const SPECIALIST_PATHWAYS: SpecialistPathwayDefinition[] = [
  {
    id: 'pathway-soc-detection',
    title: 'SOC & Detection Engineering',
    roleTitle: 'SOC Analyst / Detection Engineer',
    purpose:
      'Monitor enterprise Windows, Linux, and network telemetry, triage suspicious alerts, isolate endpoints, and construct detection pipelines.',
    readinessStatus: 'substantially_complete',
    readinessSummary: 'Strong triage, Sysmon, SIEM, EDR, and SOC Capstone coverage.',
    sharedFoundationLessonIds: [
      'win-ad-logs',
      'lin-logfiltering',
      'net-osi-tcp',
      'def-aaa-cia',
      'network-defense',
      'email-security',
      'soc-triage',
    ],
    stage4IntroLessonIds: ['endpoint-audit', 'siem-pipelines', 'endpoint-defense', 'incident-response'],
    stage5AdvancedLessonIds: [],
    capstoneIds: ['capstone-soc-investigation'],
    missingFutureTopics: [
      'Planned Phase 2.6: Detection Engineering Rules (Sigma/KQL authoring & MITRE ATT&CK tuning)',
    ],
  },
  {
    id: 'pathway-appsec',
    title: 'Application Security',
    roleTitle: 'Application Security Engineer',
    purpose:
      'Secure web applications, authentication flows, relational queries, and CI/CD delivery pipelines from code commit to production.',
    readinessStatus: 'substantially_complete',
    readinessSummary: 'Covers HTTP, SQL, Auth/JWTs, OWASP Top 10, DevSecOps, Burp Suite, and Capstone B.',
    sharedFoundationLessonIds: [
      'http-web-arch',
      'db-sql-foundations',
      'git-workflows',
      'auth-sessions-id',
      'tls-handshake',
      'vuln-management',
    ],
    stage4IntroLessonIds: ['web-owasp-top-10', 'devsecops-cicd'],
    stage5AdvancedLessonIds: ['burpsuite-mastery'],
    capstoneIds: ['capstone-web-app-review'],
    missingFutureTopics: [
      'Planned Phase 2.6: API Security Foundations (REST/GraphQL, BOLA, rate limiting & source audit)',
    ],
    authorizedOnlyNotice:
      'Interactive proxy tampering techniques in Burp Suite Mastery apply strictly to authorized test targets.',
  },
  {
    id: 'pathway-cloud-sec',
    title: 'Cloud Security',
    roleTitle: 'Cloud Security Engineer',
    purpose:
      'Protect multi-cloud identities, object storage, audit telemetry, CI/CD OIDC pipelines, and production Kubernetes clusters.',
    readinessStatus: 'substantially_complete',
    readinessSummary: 'Covers AWS, Azure, GCP, Kubernetes architecture/hardening, DevSecOps, and Capstone C.',
    sharedFoundationLessonIds: [
      'virt-cloud-basics',
      'docker-basics',
      'def-aaa-cia',
      'auth-sessions-id',
      'vpn-firewalls',
    ],
    stage4IntroLessonIds: ['aws-iam-s3', 'aws-logging', 'azure-security', 'gcp-security', 'k8s-basics', 'devsecops-cicd'],
    stage5AdvancedLessonIds: ['k8s-hardening'],
    capstoneIds: ['capstone-cloud-incident'],
    missingFutureTopics: [
      'Planned Phase 2.6: Cloud Architecture & IaC Security (Terraform/policy-as-code scanning)',
    ],
  },
  {
    id: 'pathway-dfir',
    title: 'Digital Forensics & Incident Response',
    roleTitle: 'DFIR Investigator',
    purpose:
      'Acquire forensic artifacts with chain of custody, reconstruct intrusion timelines, coordinate containment, and triage suspicious samples.',
    readinessStatus: 'partially_complete',
    readinessSummary: 'Covers DFIR fundamentals, IR lifecycle, OS logs, Malware Triage, and Capstones A & D.',
    sharedFoundationLessonIds: ['boot-os', 'win-arch', 'win-ad-logs', 'lin-services', 'lin-logfiltering', 'soc-triage'],
    stage4IntroLessonIds: ['dig-forensics', 'incident-response', 'malware-triage'],
    stage5AdvancedLessonIds: ['static-analysis', 'dynamic-analysis'],
    capstoneIds: ['capstone-forensics-triage', 'capstone-soc-investigation'],
    missingFutureTopics: [
      'Planned Phase 2.6: DFIR Memory & Persistence Artifacts (RAM dump analysis & Windows persistence)',
    ],
  },
  {
    id: 'pathway-malware-re',
    title: 'Malware Analysis & Reverse Engineering',
    roleTitle: 'Malware Analyst / Reverse Engineer',
    purpose:
      'Dissect compiled binaries safely across static triage, YARA signatures, dynamic sandboxes, C memory layout, x86-64 assembly, and debuggers.',
    readinessStatus: 'complete',
    readinessSummary: 'Complete end-to-end technical track with 7 dedicated lessons plus Capstone D.',
    sharedFoundationLessonIds: ['comp-hardware', 'boot-os', 'py-basics', 'py-file-regex', 'hyp-compare'],
    stage4IntroLessonIds: ['dig-forensics', 'malware-triage'],
    stage5AdvancedLessonIds: [
      'static-analysis',
      'dynamic-analysis',
      'c-memory-foundations',
      'assembly-foundations',
      'stack-heap-ops',
      'debugger-tools',
    ],
    capstoneIds: ['capstone-forensics-triage'],
    missingFutureTopics: [],
  },
  {
    id: 'pathway-sec-arch',
    title: 'Security Architecture',
    roleTitle: 'Security Architect',
    purpose:
      'Design defense-in-depth systems integrating trust boundaries, Zero Trust identity, cryptography, network segmentation, and cloud hardening.',
    readinessStatus: 'needs_development',
    readinessSummary: 'Synthesizes existing cross-domain architecture modules while awaiting a dedicated design course.',
    sharedFoundationLessonIds: [
      'net-osi-tcp',
      'switching-routing',
      'def-aaa-cia',
      'risk-threat-model',
      'auth-sessions-id',
      'vpn-firewalls',
      'tls-handshake',
    ],
    stage4IntroLessonIds: ['devsecops-cicd', 'aws-iam-s3', 'infosec-frameworks'],
    stage5AdvancedLessonIds: ['k8s-hardening'],
    capstoneIds: ['capstone-web-app-review', 'capstone-cloud-incident'],
    missingFutureTopics: [
      'Planned Phase 2.6: Security Architecture Design (Zero Trust, micro-segmentation & trust boundaries)',
    ],
  },
  {
    id: 'pathway-grc',
    title: 'GRC & Risk Management',
    roleTitle: 'Security GRC & Risk Analyst',
    purpose:
      'Align engineering controls to NIST CSF, ISO 27001, SOC 2, privacy regulations, and organizational risk priorities.',
    readinessStatus: 'partially_complete',
    readinessSummary: 'Covers core risk modeling, vulnerability triage, InfoSec frameworks, and regulatory compliance.',
    sharedFoundationLessonIds: ['def-aaa-cia', 'risk-threat-model', 'vuln-management', 'auth-sessions-id'],
    stage4IntroLessonIds: ['infosec-frameworks', 'compliance-standards'],
    stage5AdvancedLessonIds: ['advanced-certs', 'portfolio-resumes'],
    capstoneIds: [],
    missingFutureTopics: [
      'Planned Phase 2.6: GRC Risk Auditing & Third-Party Risk Management (risk registers & audit sampling)',
    ],
  },
  {
    id: 'pathway-pentest',
    title: 'Authorized Penetration Testing',
    roleTitle: 'Penetration Tester (Authorized Scope)',
    purpose:
      'Conduct scoped, legal vulnerability discovery, reconnaissance, web/credential auditing, privilege escalation, and remediation reporting in controlled labs.',
    readinessStatus: 'complete',
    readinessSummary: 'Complete 11-lesson offensive methodology sequence plus Capstone B web review.',
    sharedFoundationLessonIds: [
      'lin-permissions',
      'lin-remote',
      'win-shells',
      'win-ad-logs',
      'net-osi-tcp',
      'transport-protocols',
      'http-web-arch',
      'auth-sessions-id',
    ],
    stage4IntroLessonIds: ['pentest-method', 'osint-passive', 'active-recon', 'web-owasp-top-10'],
    stage5AdvancedLessonIds: [
      'burpsuite-mastery',
      'net-infiltration',
      'password-attacks',
      'wireless-security',
      'priv-esc',
      'ad-exploitation',
      'post-exploit',
    ],
    capstoneIds: ['capstone-web-app-review'],
    missingFutureTopics: [],
    authorizedOnlyNotice:
      'Authorized Testing Policy: All scanning, credential auditing, and post-exploitation training is restricted strictly to authorized, simulated lab environments.',
  },
];
