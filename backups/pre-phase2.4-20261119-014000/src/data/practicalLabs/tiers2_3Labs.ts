import { PracticalLab } from '../../types';

export const TIERS_2_3_LABS: PracticalLab[] = [
  // ==========================================
  // TIER 2: DEFENSIVE SECURITY (12 LESSONS)
  // ==========================================
  {
    id: 'lab-def-aaa-cia',
    lessonId: 'def-aaa-cia',
    kind: 'scenario',
    title: 'Access Control & CIA Triad Policy Audit',
    objective: 'Audit a fictional internal HR file-share policy against Confidentiality, Integrity, Availability, and AAA least-privilege principles.',
    shortExplanation: 'When permissions are too broad or logging is missing, an organization violates both Least Privilege and Accounting. Inspect the highlighted policy lines below to find the most critical flaw.',
    expectedOutcome: 'Identify the policy statement that breaks Least Privilege and AAA Accounting.',
    xpReward: 75,
    artifactTitle: 'hr-share-access-policy.yaml',
    artifactLanguage: 'yaml',
    artifactHighlightLines: [6, 7, 10],
    artifactContent: `service: hr-records-share.example.internal
authentication:
  require_sso: true
  require_mfa: true
authorization:
  group: "All-Company-Staff"
  permissions: ["read", "write", "delete"]
  folder: "/payroll-and-tax-records"
accounting:
  audit_log_destination: "none"
  log_retention_days: 0`,
    challenge: {
      prompt: 'Which two flaws in `hr-share-access-policy.yaml` represent the highest risk to Confidentiality, Integrity, and Accountability?',
      options: [
        'SSO and MFA are enabled together, creating excessive login friction for HR staff.',
        'The internal hostname uses `.internal` instead of a public `.com` DNS domain.',
        'Permissions are written as a YAML array rather than a numeric Unix chmod mask.',
        'All-Company-Staff can modify payroll files AND audit logging is turned off.'
      ],
      correctIndex: 3,
      hint: 'Check lines 6–7 under authorization and lines 10–11 under accounting.',
      explanation: 'Granting every employee write/delete permissions on payroll violates Confidentiality, Integrity, and Least Privilege, while setting `audit_log_destination: "none"` disables AAA Accounting so changes cannot be traced.'
    }
  },
  {
    id: 'lab-auth-sessions-id',
    lessonId: 'auth-sessions-id',
    kind: 'diagram',
    diagramMode: 'sequence',
    title: 'OAuth 2.1 PKCE & Cookie Session Flow',
    objective: 'Trace how Authorization Code + PKCE prevents authorization code interception and how HttpOnly cookies protect browser sessions.',
    shortExplanation: 'Modern authentication separates proof-of-possession during OAuth 2.1 redirects from hardened server session storage. Inspect each stage in the sequence below.',
    expectedOutcome: 'Explore at least 3 authentication flow stages and determine how PKCE blocks stolen authorization codes.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'pkce-verifier',
        label: '1. PKCE Verifier & Challenge',
        role: 'Client Cryptographic Binding',
        summary: 'The client creates a high-entropy `code_verifier` secret in memory and derives a SHA-256 `code_challenge` before redirecting the user.',
        details: [
          'Only the hashed `code_challenge` travels on the front-channel URL redirect',
          'Mandatory in OAuth 2.1 alongside exact `redirect_uri` matching'
        ],
        securityRelevance: 'Even if an attacker intercepts the redirect code, they lack the secret `code_verifier`.',
        sampleMetric: 'Hash: S256 (SHA-256)'
      },
      {
        id: 'auth-code-grant',
        label: '2. Authorization Code & State',
        role: 'Redirect Verification',
        summary: 'After user login and MFA, the Identity Provider issues a short-lived single-use authorization code plus the CSRF `state` token.',
        details: [
          'Client verifies `state` matches its browser session to stop Login CSRF',
          'Deprecated OAuth Implicit Flow (`response_type=token`) is avoided in OAuth 2.1'
        ],
        securityRelevance: 'Keeps access tokens out of browser history, Referer headers, and server access logs.',
        sampleMetric: 'Flow: Code + State'
      },
      {
        id: 'token-exchange',
        label: '3. Back-Channel Token Exchange',
        role: 'Verifier Proof Check',
        summary: 'The client submits both the authorization `code` and raw `code_verifier` directly to the `/token` endpoint over TLS.',
        details: [
          'Authorization server hashes `code_verifier` and checks it equals stored `code_challenge`',
          'Password hashes on the IdP use Argon2id/scrypt/bcrypt with unique per-user salts'
        ],
        securityRelevance: 'Blocks unauthorized code replay from malicious browser extensions or rogue apps.',
        sampleMetric: 'Channel: Direct TLS POST'
      },
      {
        id: 'httponly-cookie',
        label: '4. HttpOnly Session & Rotation',
        role: 'Browser Session Hardening',
        summary: 'Backend issues a rotated high-entropy session ID in an `HttpOnly; Secure; SameSite=Lax` cookie paired with server revocation.',
        details: [
          '`HttpOnly` prevents `document.cookie` theft via XSS payloads',
          'Session identifier rotates immediately upon login or privilege change'
        ],
        securityRelevance: 'Neutralizes session fixation and blocks client-side scripts from stealing session cookies.',
        sampleMetric: 'Flags: HttpOnly + Secure'
      }
    ],
    challenge: {
      prompt: 'An attacker intercepts a valid OAuth 2.1 authorization code from a browser redirect, but lacks the client session’s `code_verifier`. What happens when the attacker tries to redeem that code at `/token`?',
      options: [
        'The token endpoint upgrades the request to the legacy Implicit grant automatically.',
        'The token endpoint rejects the exchange because the SHA-256 PKCE proof fails.',
        'The Identity Provider issues an unsigned JWT with read-only scopes for 24 hours.',
        'The browser still sets an HttpOnly session cookie even if `/token` rejects it.'
      ],
      correctIndex: 1,
      hint: 'Check stage 3: what does the authorization server compare against the stored `code_challenge`?',
      explanation: 'Under PKCE, the authorization server hashes the submitted `code_verifier` and compares it with the original `code_challenge`. Without the secret verifier, the intercepted authorization code cannot be exchanged for tokens.'
    }
  },
  {
    id: 'lab-risk-threat-model',
    lessonId: 'risk-threat-model',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'STRIDE Threat Modeling Matrix',
    objective: 'Map common system weaknesses to the six STRIDE threat categories and pair each threat with its primary defensive control.',
    shortExplanation: 'STRIDE helps engineers think systematically about how an application can be attacked before deployment. Select each STRIDE category to examine its attack vector and mitigation.',
    expectedOutcome: 'Explore at least 3 STRIDE categories and correctly match an unlogged financial transfer dispute to its STRIDE class.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'spoofing',
        label: 'S — Spoofing Identity',
        role: 'Breaks Authentication',
        summary: 'Pretending to be another user, service, or host by stealing tokens, forging emails, or guessing weak credentials.',
        details: [
          'Example: Logging into an API with a stolen session cookie',
          'Mitigated by MFA, mutual TLS, and cryptographic identity tokens'
        ],
        securityRelevance: 'Strong Authentication ensures actors are genuinely who they claim to be.',
        sampleMetric: 'Property: Authentication'
      },
      {
        id: 'tampering',
        label: 'T — Tampering Data',
        role: 'Breaks Integrity',
        summary: 'Modifying stored records, configuration files, or network payloads in transit without authorization.',
        details: [
          'Example: Changing an invoice amount inside an unverified HTTP request',
          'Mitigated by digital signatures, HMACs, TLS, and input validation'
        ],
        securityRelevance: 'Protects Integrity across storage, memory, and transport channels.',
        sampleMetric: 'Property: Integrity'
      },
      {
        id: 'repudiation',
        label: 'R — Repudiation',
        role: 'Breaks Non-Repudiation / Accounting',
        summary: 'A user or attacker denies performing a sensitive action because the system lacks tamper-proof proof.',
        details: [
          'Example: Deleting a production record when audit logs are stored locally and can be cleared',
          'Mitigated by immutable centralized audit logs and signed transactions'
        ],
        securityRelevance: 'Without centralized logging, investigations cannot prove who initiated an action.',
        sampleMetric: 'Property: Accounting'
      },
      {
        id: 'info-disclosure',
        label: 'I — Information Disclosure',
        role: 'Breaks Confidentiality',
        summary: 'Exposing private records, stack traces, or secrets to unauthorized parties.',
        details: [
          'Example: Returning full SQL error traces or exposing an unencrypted backup bucket',
          'Mitigated by encryption at rest/transit, RBAC, and sanitized error messages'
        ],
        securityRelevance: 'Direct Confidentiality failure often caused by overly broad permissions or missing encryption.',
        sampleMetric: 'Property: Confidentiality'
      }
    ],
    challenge: {
      prompt: 'A user claims they never approved a wire transfer, and the application only writes logs to a mutable local text file that was wiped. Which STRIDE category describes this security gap?',
      options: [
        'Denial of Service — memory exhaustion interrupted transfer verification',
        'Repudiation — the system cannot prove who executed the transfer',
        'Spoofing — the application server IP address rotated mid-session',
        'Tampering — the user forgot their corporate login password'
      ],
      correctIndex: 1,
      hint: 'Think about which STRIDE letter addresses denying an action due to missing audit accountability.',
      explanation: 'Repudiation occurs when a system cannot reliably prove or disprove who performed an action. Centralized, append-only audit logs mitigate repudiation.'
    }
  },
  {
    id: 'lab-vuln-management',
    lessonId: 'vuln-management',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'Risk-Based Vulnerability Triage (CVSS v4.0, EPSS & KEV)',
    objective: 'Compare CVE/CWE classification, CVSS v4.0 severity vectors, EPSS exploit probabilities, and CISA KEV status to prioritize patching.',
    shortExplanation: 'Teams cannot patch thousands of scanner findings overnight. Combine technical severity with real-world threat signals to patch exploited exposures first. Inspect each signal below.',
    expectedOutcome: 'Explore at least 3 prioritization components and select which finding demands immediate SLA patching.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'cve-cwe',
        label: 'CVE & CWE Classification',
        role: 'Identity & Root Weakness',
        summary: 'CVE identifies a specific tracked vulnerability in a product (e.g., CVE-2025-1042), while CWE labels the underlying bug class (e.g., CWE-89 SQL Injection).',
        details: [
          'CWE helps engineering teams fix systemic code flaws across repositories',
          'CVE tracks affected versions and vendor patch advisories consistently'
        ],
        securityRelevance: 'Prevents repeated bugs by linking individual patches back to root secure-coding patterns.',
        sampleMetric: 'Taxonomies: MITRE CVE/CWE'
      },
      {
        id: 'cvss-v4',
        label: 'CVSS v4.0 Base & Threat Vectors',
        role: 'Technical Severity Scoring',
        summary: 'Measures intrinsic exploitability (Attack Vector, Attack Complexity, Privileges Required, User Interaction) alongside Confidentiality/Integrity/Availability impact.',
        details: [
          'CVSS v4.0 distinguishes Vulnerable vs. Subsequent system impacts and adds Threat/Supplemental metrics',
          'A CVSS 9.8 internal-only lab bug may still carry lower real risk than an internet-facing CVSS 7.8 flaw'
        ],
        securityRelevance: 'Quantifies technical blast radius consistently, but Base Score alone ignores active exploitation.',
        sampleMetric: 'Scale: 0.0 – 10.0'
      },
      {
        id: 'epss-score',
        label: 'EPSS (Exploit Prediction Scoring System)',
        role: '30-Day Exploitation Probability',
        summary: 'Data-driven probability model estimating how likely a CVE is to be exploited in the wild over the next 30 days.',
        details: [
          'Values range from 0.0 to 1.0 (0% to 100%) alongside percentile ranking',
          'Helps teams avoid wasting emergency sprints on theoretical CVEs with < 1% exploit likelihood'
        ],
        securityRelevance: 'Focuses engineering bandwidth on vulnerabilities likely to face automated weaponization.',
        sampleMetric: 'Metric: 30-Day Probability'
      },
      {
        id: 'cisa-kev',
        label: 'CISA KEV (Known Exploited Vulnerabilities)',
        role: 'Confirmed Active Exploitation',
        summary: 'Authoritative catalog of vulnerabilities actively exploited by threat actors in real environments—mandatory top priority.',
        details: [
          'Any exposed asset listed in KEV triggers urgent patching or emergency compensating controls',
          'Overrides low CVSS Base scores when attackers already chain that flaw in the wild'
        ],
        securityRelevance: 'Separates confirmed active breaches from purely theoretical scanner alerts.',
        sampleMetric: 'Signal: Active In-Wild'
      }
    ],
    challenge: {
      prompt: 'Your scanner reports two flaws: Finding A has CVSS Base 9.1 on an air-gapped printer (not in KEV, EPSS 0.8%), while Finding B has CVSS 7.8 on your public VPN gateway (listed in CISA KEV, EPSS 94%). Which one gets the emergency patch SLA first?',
      options: [
        'Finding A, because CVSS Base score 9.1 automatically overrides network exposure.',
        'Neither, because CWE classifications must be resolved before patching any CVE.',
        'Finding B, because CISA KEV active exploitation and exposure pose urgent risk.',
        'Defer both until the next quarterly maintenance window for batch deployment.'
      ],
      correctIndex: 2,
      hint: 'Compare an unexposed CVE without active exploits against a public-facing CVE listed in CISA KEV with 94% EPSS.',
      explanation: 'Risk-based vulnerability management combines exposure, CISA KEV confirmation, and EPSS likelihood with CVSS. An internet-facing CVE actively exploited in the wild (KEV) poses immediate danger even with a lower Base score than an isolated host.'
    }
  },
  {
    id: 'lab-soc-triage',
    lessonId: 'soc-triage',
    kind: 'log_investigation',
    title: 'SOC Alert Queue Triage',
    objective: 'Review four incoming SOC alerts, distinguish benign scheduled activity from a true security incident, and flag the True Positive.',
    shortExplanation: 'Tier 1 SOC analysts face dozens of alerts each shift. Inspect the metadata of each alert—parent process, user role, source IP, and ticket context—to decide which one requires immediate escalation.',
    expectedOutcome: 'Inspect the alert details, flag the single True Positive alert, and confirm the right triage decision.',
    xpReward: 75,
    logContextTitle: 'SOC Queue · Morning Shift Triage Feed',
    suspiciousEntryId: 'soc-3',
    logEntries: [
      {
        id: 'soc-1',
        timestamp: '08:12:04 UTC',
        source: 'EDR-Agent',
        severity: 'WARN',
        message: 'Scheduled backup script invoked `robocopy.exe` on `file-srv-02`',
        details: 'User: svc_backup | Parent: TaskScheduler | Change Ticket: CHG-4410 (Approved daily 08:10 UTC backup). Known benign baseline.'
      },
      {
        id: 'soc-2',
        timestamp: '08:19:45 UTC',
        source: 'VPN-Gateway',
        severity: 'INFO',
        message: 'Successful MFA login from familiar corporate ISP for user `m.patel`',
        details: 'Source: 198.51.100.14 | Device: Managed Laptop | Risk Score: Low.'
      },
      {
        id: 'soc-3',
        timestamp: '08:27:11 UTC',
        source: 'EDR-Agent',
        severity: 'ALERT',
        message: '`WINWORD.EXE` spawned `powershell.exe -EncodedCommand` on `lab-ws-12`',
        details: 'User: accounting_user | Parent: WINWORD.EXE (Invoice_Q4.docm) | Child attempted outbound HTTPS to 203.0.113.88. No approved change ticket.',
        isSuspicious: true
      },
      {
        id: 'soc-4',
        timestamp: '08:31:02 UTC',
        source: 'VulnScanner',
        severity: 'WARN',
        message: 'Port scan detected from authorized internal scanner `192.0.2.50`',
        details: 'Maintenance Window: Weekly vulnerability assessment scheduled 08:00–09:00 UTC.'
      }
    ],
    challenge: {
      prompt: 'Why is alert `soc-3` classified as a True Positive requiring immediate containment?',
      options: [
        'Word (`WINWORD.EXE`) spawned encoded PowerShell contacting an external IP.',
        'Any endpoint log recorded after 08:20 UTC is automatically escalated as high risk.',
        'The VPN login from `m.patel` succeeded via corporate multi-factor authentication.',
        'The authorized internal vulnerability scanner ran inside its scheduled window.'
      ],
      correctIndex: 0,
      hint: 'Look closely at the parent-child process tree in the flagged alert (`WINWORD.EXE` -> `powershell.exe`).',
      explanation: 'Office applications spawning encoded PowerShell commands and contacting unfamiliar external IPs are classic indicators of macro-based execution (MITRE ATT&CK T1059 / T1566), whereas the other alerts correspond to authorized maintenance or normal logins.'
    }
  },
  {
    id: 'lab-endpoint-audit',
    lessonId: 'endpoint-audit',
    kind: 'log_investigation',
    title: 'Sysmon Process & Network Telemetry Hunt',
    objective: 'Correlate Sysmon Event ID 1 (Process Creation) and Event ID 3 (Network Connection) records to trace a suspicious host beacon.',
    shortExplanation: 'Sysmon gives defenders rich parent-child process lineage and socket telemetry. Inspect the endpoint events below and flag the anomalous Sysmon event.',
    expectedOutcome: 'Flag the suspicious Sysmon record and identify which Sysmon Event ID captures outbound network sockets.',
    xpReward: 75,
    logContextTitle: 'Microsoft-Windows-Sysmon/Operational · Host `lab-ws-09`',
    suspiciousEntryId: 'sys-3',
    logEntries: [
      {
        id: 'sys-1',
        timestamp: '10:02:11 UTC',
        source: 'Sysmon Event ID 1',
        severity: 'INFO',
        message: 'Process Create: `C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe`',
        details: 'Parent: explorer.exe | User: j.kim | IntegrityLevel: Medium | Signed: Google LLC.'
      },
      {
        id: 'sys-2',
        timestamp: '10:04:00 UTC',
        source: 'Sysmon Event ID 11',
        severity: 'INFO',
        message: 'FileCreate: `C:\\Users\\j.kim\\Downloads\\q3-summary.pdf`',
        details: 'TargetProcess: chrome.exe | Normal user browser download.'
      },
      {
        id: 'sys-3',
        timestamp: '10:05:38 UTC',
        source: 'Sysmon Event ID 3',
        severity: 'ALERT',
        message: 'NetworkConnect: `C:\\Users\\Public\\updater.exe` -> `198.51.100.77:8443`',
        details: 'ProcessId: 4812 | Signed: False | Initiated outbound TCP beacon from `C:\\Users\\Public\\` immediately after execution.',
        isSuspicious: true
      },
      {
        id: 'sys-4',
        timestamp: '10:06:15 UTC',
        source: 'Sysmon Event ID 1',
        severity: 'INFO',
        message: 'Process Create: `C:\\Windows\\System32\\svchost.exe -k netsvcs`',
        details: 'Parent: services.exe | User: NT AUTHORITY\\SYSTEM | Signed: Microsoft Windows.'
      }
    ],
    challenge: {
      prompt: 'Which two clues in `sys-3` make it stand out during an endpoint audit, and what does Event ID 3 record?',
      options: [
        'Event ID 3 logs registry key deletions while Chrome saved a PDF download.',
        'Event ID 3 tracks disk formatting after `svchost.exe` launched from `services.exe`.',
        'Event ID 3 logs network sockets; unsigned `updater.exe` beacons out of `Public`.',
        'Event ID 3 captures motherboard UEFI firmware modifications during startup.'
      ],
      correctIndex: 2,
      hint: 'Check both the Sysmon Event ID definition and the file path/signature status in `sys-3`.',
      explanation: 'Sysmon Event ID 3 logs network connections initiated by processes. Legitimate OS updaters do not run unsigned out of `C:\\Users\\Public\\` opening connections to arbitrary external endpoints.'
    }
  },
  {
    id: 'lab-siem-pipelines',
    lessonId: 'siem-pipelines',
    kind: 'terminal',
    title: 'SIEM Search & Correlation Query Console',
    objective: 'Run simulated Splunk SPL queries to aggregate failed Windows logins (`event_id=4625`) and identify a brute-force source IP.',
    shortExplanation: 'A SIEM correlates millions of raw events into actionable insights. Execute the SPL pipeline commands in order to filter failed logins, aggregate counts by IP, and inspect the threshold match.',
    expectedOutcome: 'Run the two SIEM query commands and diagnose which source IP crossed the brute-force alert threshold.',
    xpReward: 75,
    terminalPromptPrefix: 'splunk-cli> ',
    requiredCommands: [
      'search index=windows event_id=4625 | stats count by src_ip',
      'search index=windows event_id=4625 | stats count by src_ip | where count > 10'
    ],
    terminalCommands: [
      {
        command: 'search index=windows event_id=4625 | stats count by src_ip',
        aliases: ['stats', 'event_id=4625'],
        description: 'Aggregate Windows failed logon events (Event ID 4625) by source IP.',
        flagsSummary: 'stats count by src_ip — groups matching records and counts occurrences per IP',
        output: `src_ip           count
---------------  -----
192.0.2.12           2
198.51.100.44       87
203.0.113.19         1`,
        interpretation: '`198.51.100.44` generated 87 failed authentication attempts compared to normal user typos (1–2 failures).'
      },
      {
        command: 'search index=windows event_id=4625 | stats count by src_ip | where count > 10',
        aliases: ['where count > 10', 'correlate'],
        description: 'Apply correlation alert filter to isolate only high-volume brute-force candidates.',
        flagsSummary: 'where count > 10 — keeps only groups exceeding the 10-failure threshold',
        output: `[ALERT MATCH]
src_ip           count   target_user
---------------  -----   -----------
198.51.100.44       87   administrator`,
        interpretation: 'This filtered result is ready to trigger a SOC correlation alert for credential brute forcing.'
      }
    ],
    challenge: {
      prompt: 'What role does `| stats count by src_ip | where count > 10` play in a SIEM correlation rule?',
      options: [
        'It automatically wipes the Windows system volume on the targeted domain host.',
        'It disables Windows Event ID 4625 logging across all domain controllers.',
        'It decrypts TLS inspection sessions traversing the perimeter enterprise firewall.',
        'It groups failed logins per IP and alerts when counts exceed normal typo noise.'
      ],
      correctIndex: 3,
      hint: 'Think about why raw single login failures are noisy, and how grouping + thresholding turns noise into signal.',
      explanation: 'Single failed logins happen constantly from typos. Grouping with `stats count by src_ip` and filtering with `where count > 10` isolates automated brute-force or password-guessing campaigns.'
    }
  },
  {
    id: 'lab-endpoint-defense',
    lessonId: 'endpoint-defense',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'AV vs. EDR vs. XDR Detection Layering',
    objective: 'Compare how Traditional Antivirus, EDR, and XDR inspect threats across static files, live host behavior, and cross-domain telemetry.',
    shortExplanation: 'Attackers routinely evade simple file-hash scanning by running commands purely in RAM. Explore each endpoint protection tier to understand its visibility boundaries.',
    expectedOutcome: 'Inspect all 3 defense tiers and choose the right response capability for a fileless PowerShell incident.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'av',
        label: 'Traditional Antivirus (AV)',
        role: 'Static Signature & Hash Scanning',
        summary: 'Matches files written to disk against known malware hashes and byte signatures.',
        details: [
          'Fast and lightweight for known commodity malware',
          'Blind to novel fileless scripts executing purely in memory via built-in OS tools'
        ],
        securityRelevance: 'Necessary baseline hygiene, but insufficient on its own against modern Living-off-the-Land techniques.',
        sampleMetric: 'Scope: Disk Files'
      },
      {
        id: 'edr',
        label: 'EDR (Endpoint Detection & Response)',
        role: 'Behavioral Host Telemetry & Isolation',
        summary: 'Continuously records process trees, memory injections, registry edits, and socket activity—and supports instant host network isolation.',
        details: [
          'Detects suspicious PowerShell, WMI, and LSASS access even with zero files dropped',
          'Allows responders to isolate a compromised workstation while keeping forensic access'
        ],
        securityRelevance: 'Stops lateral spread rapidly when paired with SOC playbooks.',
        sampleMetric: 'Scope: Live Host Behavior'
      },
      {
        id: 'xdr',
        label: 'XDR (Extended Detection & Response)',
        role: 'Cross-Domain Correlation',
        summary: 'Correlates endpoint EDR signals with email gateways, identity providers, firewalls, and cloud audit trails in one timeline.',
        details: [
          'Links a phishing email arrival -> endpoint execution -> anomalous cloud login',
          'Reduces investigation time across disconnected security tools'
        ],
        securityRelevance: 'Gives defenders full visibility when attacks cross from endpoint to identity or cloud.',
        sampleMetric: 'Scope: Endpoint + Network + Cloud'
      }
    ],
    challenge: {
      prompt: 'A compromised workstation is running a memory-only PowerShell beacon. Which EDR action stops lateral spread immediately without shutting down the computer or wiping RAM?',
      options: [
        'Host Network Isolation — blocks lateral spread while keeping forensic access.',
        'Uninstalling the endpoint agent cleanly and powering off the workstation.',
        'Deleting non-essential Windows `System32` system drivers before capturing logs.',
        'Switching the workstation adapter from wired Ethernet to guest public Wi-Fi.'
      ],
      correctIndex: 0,
      hint: 'Rebooting erases volatile RAM evidence. Look at how EDR contains a host safely.',
      explanation: 'EDR Network Isolation severs network connections to peers and C2 servers while keeping the management channel open for analysts to collect memory/process artifacts safely.'
    }
  },
  {
    id: 'lab-network-defense',
    lessonId: 'network-defense',
    kind: 'scenario',
    title: 'Snort IDS/IPS Rule Anatomy Inspector',
    objective: 'Read a custom Snort rule header and options block to determine how it detects or blocks anomalous traffic.',
    shortExplanation: 'Network defenders write Snort and Suricata rules to inspect packet headers and payload bytes in real time. Examine the rule below carefully.',
    expectedOutcome: 'Identify what action, protocol, direction, and payload pattern the Snort rule enforces.',
    xpReward: 75,
    artifactTitle: 'local.rules (Snort 3 Configuration)',
    artifactLanguage: 'text',
    artifactHighlightLines: [2, 3],
    artifactContent: `# Detect outbound cleartext credential submission over HTTP
alert tcp $HOME_NET any -> $EXTERNAL_NET 80 (
    msg:"POLICY Cleartext HTTP Login Attempt";
    content:"password="; nocase;
    sid:1000421; rev:2;
)`,
    challenge: {
      prompt: 'If a security team wants Snort (running inline as an IPS) to actively block matching cleartext login packets instead of only generating an alert, what should replace `alert` on line 2?',
      options: [
        'ping',
        'follow',
        'drop',
        'pcap'
      ],
      correctIndex: 2,
      hint: 'An IPS sits inline and discards matching packets when the rule action changes from alerting to dropping.',
      explanation: 'Changing the rule action from `alert` to `drop` instructs an inline IPS to discard the matching packet and log the event, preventing cleartext traffic from completing.'
    }
  },
  {
    id: 'lab-email-security',
    lessonId: 'email-security',
    kind: 'log_investigation',
    title: 'Email Authentication & Phishing Header Triage',
    objective: 'Examine inbound SMTP gateway logs containing SPF, DKIM, and DMARC verdicts to isolate a spoofed executive Business Email Compromise (BEC) lure.',
    shortExplanation: 'Attackers often spoof the visible Display Name or `Header.From` domain of company executives. Inspect the four gateway records below—pay close attention to SPF, DKIM, DMARC alignment, and `Reply-To` headers.',
    expectedOutcome: 'Flag the spoofed inbound message that fails authentication and alignment checks, then select the right gateway defense.',
    xpReward: 75,
    logContextTitle: 'Secure Email Gateway · Inbound Authentication Feed',
    suspiciousEntryId: 'mail-3',
    logEntries: [
      {
        id: 'mail-1',
        timestamp: '09:04:12 UTC',
        source: 'MX-Gateway-01',
        severity: 'INFO',
        message: 'From: billing@payroll-partner.example -> To: ap@acme.example | Subject: "Monthly Invoice #882"',
        details: 'SPF=pass (smtp.mailfrom=payroll-partner.example) | DKIM=pass (d=payroll-partner.example) | DMARC=pass (p=reject). Matches known vendor domain.'
      },
      {
        id: 'mail-2',
        timestamp: '09:11:39 UTC',
        source: 'MX-Gateway-01',
        severity: 'INFO',
        message: 'From: alerts@github-updates.example -> To: devops@acme.example | Subject: "Weekly Dependabot Summary"',
        details: 'SPF=pass (smtp.mailfrom=bounces.github-updates.example) | DKIM=pass (d=github-updates.example) | DMARC=pass (alignment: relaxed).'
      },
      {
        id: 'mail-3',
        timestamp: '09:18:54 UTC',
        source: 'MX-Gateway-01',
        severity: 'ALERT',
        message: 'From: "CEO Jordan Blake" <j.blake@acme.example> -> To: finance@acme.example | Subject: "Urgent Wire Today"',
        details: 'Source IP: 203.0.113.210 (unlisted external relay) | Return-Path: bounce@promo-relay.example | Reply-To: ceo-urgent@external-drop.example | SPF=fail | DKIM=none | DMARC=fail (observed p=none).',
        isSuspicious: true
      },
      {
        id: 'mail-4',
        timestamp: '09:24:05 UTC',
        source: 'MX-Gateway-01',
        severity: 'INFO',
        message: 'From: hr@acme.example -> To: all-staff@acme.example | Subject: "Q4 Benefits Enrollment Reminder"',
        details: 'SPF=pass (internal corporate relay 198.51.100.20) | DKIM=pass (d=acme.example) | DMARC=pass.'
      }
    ],
    challenge: {
      prompt: 'Look at `mail-3`. The message spoofed `acme.example` and failed both SPF and DKIM, yet reached the user inbox because `acme.example` published `DMARC p=none`. What DMARC policy stops unauthorized relays from delivering spoofed `@acme.example` mail?',
      options: [
        'Publishing a validated DMARC policy with `p=reject` (or `p=quarantine`) after audit.',
        'Disabling TLS opportunistic STARTTLS on outbound corporate SMTP relay servers.',
        'Replacing DKIM cryptographic signatures with plain-text Subject line prefixes.',
        'Adding `+all` at the end of the company TXT SPF record for every mail server.'
      ],
      correctIndex: 0,
      hint: 'Compare monitoring-only `p=none` against enforcing DMARC policies that quarantine or reject unaligned spoofs.',
      explanation: 'DMARC `p=none` only sends telemetry reports while still delivering unauthenticated mail. Once legitimate senders pass SPF/DKIM alignment, upgrading DMARC to `p=quarantine` or `p=reject` blocks direct-domain spoofing.'
    }
  },
  {
    id: 'lab-dig-forensics',
    lessonId: 'dig-forensics',
    kind: 'terminal',
    title: 'Volatility 3 Memory Forensics Lab',
    objective: 'Analyze a simulated RAM capture (`lab-ws-04.mem`) using Volatility 3 commands to uncover a rogue hidden process and its network socket.',
    shortExplanation: 'Before powering down an infected machine, forensics teams acquire a memory image. Run Volatility 3 inspection commands below to list active processes and network connections.',
    expectedOutcome: 'Execute both `windows.pslist` and `windows.netscan` in the simulator and pinpoint the suspicious process.',
    xpReward: 75,
    terminalPromptPrefix: 'forensics@sift:~$ ',
    requiredCommands: [
      'vol -f lab-ws-04.mem windows.pslist',
      'vol -f lab-ws-04.mem windows.netscan'
    ],
    terminalCommands: [
      {
        command: 'vol -f lab-ws-04.mem windows.pslist',
        aliases: ['pslist', 'volatility -f lab-ws-04.mem windows.pslist'],
        description: 'List active processes recorded in the memory dump (Volatility 3 auto-resolves symbols).',
        flagsSummary: '-f <file> selects memory image; windows.pslist walks the active process list',
        output: `PID    PPID   ImageFileName     Offset
4      0      System            0xfa800192
512    4      smss.exe          0xfa800880
1840   512    explorer.exe      0xfa8019a0
3912   1840   svch0st_upd.exe   0xfa804c10`,
        interpretation: 'Notice PID 3912 `svch0st_upd.exe` (spelled with a zero `0`, child of `explorer.exe`, not `services.exe`).'
      },
      {
        command: 'vol -f lab-ws-04.mem windows.netscan',
        aliases: ['netscan', 'volatility -f lab-ws-04.mem windows.netscan'],
        description: 'Recover TCP/UDP network sockets linked to processes in RAM.',
        flagsSummary: 'windows.netscan scans memory pools for active and closed network sockets',
        output: `Proto  LocalAddr         ForeignAddr          State        PID   Owner
TCPv4  192.0.2.25:49712  198.51.100.99:443    ESTABLISHED  3912  svch0st_upd.exe`,
        interpretation: 'PID 3912 holds an active ESTABLISHED session to external IP `198.51.100.99` on port 443.'
      }
    ],
    challenge: {
      prompt: 'Which forensic evidence confirms PID 3912 (`svch0st_upd.exe`) is masquerading rather than a legitimate Windows service?',
      options: [
        'Legitimate Windows services always receive numeric PIDs above 1000.',
        'Typosquatted name (`0`), parent `explorer.exe`, and external `netscan` socket.',
        '`explorer.exe` is prohibited from spawning child processes in user sessions.',
        'HTTPS port 443 is reserved exclusively for Linux kernels and firewalls.'
      ],
      correctIndex: 1,
      hint: 'Check the spelling of the binary name, its PPID (parent PID 1840 = `explorer.exe`), and the `netscan` output.',
      explanation: 'Legitimate `svchost.exe` is spelled with an `o`, lives in `System32`, and is spawned by `services.exe`. Typosquatting (`svch0st_upd.exe`) launched from `explorer.exe` with an external socket is a classic indicator of compromise.'
    }
  },
  {
    id: 'lab-incident-response',
    lessonId: 'incident-response',
    kind: 'diagram',
    diagramMode: 'sequence',
    title: 'NIST SP 800-61 Incident Response Playbook',
    objective: 'Walk through the four sequential NIST SP 800-61 operational phases (aligned with NIST SP 800-61 Rev. 3 & CSF 2.0 governance) during a simulated phishing-to-workstation incident.',
    shortExplanation: 'Effective incident response avoids panic and preserves evidence. Step through all four operational phases in sequence to see what actions belong at each stage and how lessons feed ongoing CSF 2.0 risk management.',
    expectedOutcome: 'Step through Phases 1–4 and determine the right order between Containment, Eradication, and Recovery.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'ir-1-prep',
        label: '1. Preparation',
        role: 'Before Any Incident Occurs',
        summary: 'Establish IR playbooks, contact trees, backups, EDR tooling, and forensic collection kits before an attack starts.',
        details: [
          'Verify immutable backups and test restoration speed',
          'Pre-deploy Sysmon, SIEM logging, and host isolation capabilities'
        ],
        securityRelevance: 'Teams that skip preparation lose hours searching for logs or permissions during a crisis.',
        sampleMetric: 'Phase 1 · Proactive'
      },
      {
        id: 'ir-2-detect',
        label: '2. Detection & Analysis',
        role: 'Verify Scope & Timeline',
        summary: 'Confirm the alert is a True Positive, identify affected accounts/hosts, and determine the initial entry vector.',
        details: [
          'Correlate EDR process trees, authentication logs, and firewall flows',
          'Document an accurate timeline and preserve forensic images'
        ],
        securityRelevance: 'Incomplete scoping leaves attacker backdoors undetected during cleanup.',
        sampleMetric: 'Phase 2 · Triage'
      },
      {
        id: 'ir-3-contain',
        label: '3. Containment, Eradication & Recovery',
        role: 'Stop Spread, Remove Root Cause, Restore Safely',
        summary: 'Isolate affected hosts first (Containment), remove malware/revoke credentials/patch the entry flaw (Eradication), then restore clean systems and monitor closely (Recovery).',
        details: [
          'Containment: EDR isolate `lab-ws-12` and revoke compromised tokens',
          'Eradication & Recovery: Remove persistence, reset passwords, rebuild from trusted image'
        ],
        securityRelevance: 'Rebuilding before revoking stolen credentials allows immediate re-compromise.',
        sampleMetric: 'Phase 3 · Action'
      },
      {
        id: 'ir-4-lessons',
        label: '4. Post-Incident Activity',
        role: 'Lessons Learned & Detection Tuning',
        summary: 'Hold a blameless review to measure response gaps, write new SIEM rules, and close architectural weaknesses.',
        details: [
          'Add macro execution blocks or MFA hardening discovered during the incident',
          'Update playbooks based on real bottlenecks'
        ],
        securityRelevance: 'Turns every security incident into permanent defensive resilience.',
        sampleMetric: 'Phase 4 · Improvement'
      }
    ],
    challenge: {
      prompt: 'During an active ransomware containment, why should analysts isolate the workstation FIRST rather than immediately restoring files from backup onto the live host?',
      options: [
        'Immutable cloud backups only function reliably during the Preparation phase.',
        'Restoring clean backup files automatically purges correlated SIEM alert logs.',
        'NIST SP 800-61 prohibits touching backups during the Recovery phase.',
        'Live malware or active sessions will re-encrypt restored files unless contained.'
      ],
      correctIndex: 3,
      hint: 'Think about what happens if you put clean data back onto a still-compromised machine.',
      explanation: 'Containment halts spread and Eradication removes persistence and attacker access. Restoring data before removing the threat simply gives the attacker fresh files to compromise.'
    }
  },

  // ==========================================
  // TIER 3: OFFENSIVE SECURITY (11 LESSONS)
  // ==========================================
  {
    id: 'lab-pentest-method',
    lessonId: 'pentest-method',
    kind: 'scenario',
    title: 'Rules of Engagement (RoE) Scope Checker',
    objective: 'Verify authorized IP ranges, maintenance windows, and prohibited test actions inside a simulated Rules of Engagement contract.',
    shortExplanation: 'Authorized penetration testers operate strictly within written legal scope. Review the RoE snippet below before running any simulated assessment command.',
    expectedOutcome: 'Audit the RoE lines and decide which target/action must NOT be tested.',
    xpReward: 75,
    artifactTitle: 'engagement-roe-2025.txt',
    artifactLanguage: 'text',
    artifactHighlightLines: [4, 5, 8],
    artifactContent: `CLIENT: Example Corp Lab Environment
ASSESSMENT TYPE: Grey-Box Web & External Perimeter Test
AUTHORIZED IN-SCOPE SUBNETS:
  - 198.51.100.0/28 (Staging Web Cluster)
  - staging-portal.example.internal
TESTING WINDOW: Mon–Fri 01:00–05:00 UTC
EXCLUSIONS (STRICTLY OUT OF SCOPE):
  - 203.0.113.0/24 (Third-Party Payment Processor)
  - Denial-of-Service / volumetric stress testing`,
    challenge: {
      prompt: 'During reconnaissance, you discover a subdomain pointing to `203.0.113.22`. According to the Rules of Engagement, what is the ONLY legal and ethical action?',
      options: [
        'Avoid scanning `203.0.113.22`; log it as out of scope and alert the client.',
        'Run an aggressive port scan first to verify whether the subdomain is vulnerable.',
        'Schedule a Denial-of-Service stress test inside the 01:00–05:00 UTC window.',
        'Treat every newly discovered company subdomain as implicitly authorized in scope.'
      ],
      correctIndex: 0,
      hint: 'Compare `203.0.113.22` against the `EXCLUSIONS` section of the RoE.',
      explanation: '`203.0.113.22` falls inside `203.0.113.0/24`, which is explicitly excluded (third-party infrastructure). Testing out-of-scope systems violates written authorization and carries severe legal risk.'
    }
  },
  {
    id: 'lab-osint-passive',
    lessonId: 'osint-passive',
    kind: 'terminal',
    title: 'Passive Reconnaissance & OSINT Workbench',
    objective: 'Use passive DNS/WHOIS lookups and search-operator queries to map public footprint information without touching target ports.',
    shortExplanation: 'Passive reconnaissance gathers clues from public registries and search engines without sending attack packets to the target server. Run the safe OSINT commands below.',
    expectedOutcome: 'Execute both passive lookup commands and distinguish passive OSINT from active probing.',
    xpReward: 75,
    terminalPromptPrefix: 'osint@lab:~$ ',
    requiredCommands: [
      'whois example.internal',
      'dig TXT example.internal +short'
    ],
    terminalCommands: [
      {
        command: 'whois example.internal',
        aliases: ['whois'],
        description: 'Query public domain registration metadata.',
        flagsSummary: 'Reads registrar records without sending packets to the target web host',
        output: `Domain Name: EXAMPLE.INTERNAL
Registrar: Lab Registry Services
Name Server: ns1.example.internal
Registrant Organization: Example Lab Org`,
        interpretation: 'Reveals authoritative name servers and organizational contacts passively.'
      },
      {
        command: 'dig TXT example.internal +short',
        aliases: ['dig', 'nslookup'],
        description: 'Inspect public DNS TXT records (SPF/verification strings) via resolver cache.',
        flagsSummary: 'TXT records often reveal cloud email providers and SaaS integrations',
        output: `"v=spf1 include:_spf.mail-provider.example ~all"
"status-check-token=lab-verified-01"`,
        interpretation: 'Shows third-party mail services used by the organization without scanning their servers.'
      }
    ],
    challenge: {
      prompt: 'Why does querying public WHOIS, certificate transparency logs, or cached Google search dorks qualify as PASSIVE reconnaissance?',
      options: [
        'It automatically strips weak TLS cipher suites from the target web portal.',
        'It uses public third-party sources without probing target servers directly.',
        'It transmits half-open TCP SYN probes across target ports 1 through 1024.',
        'It performs offline password hash cracking locally on dedicated GPUs.'
      ],
      correctIndex: 1,
      hint: 'Consider which systems actually receive network packets during a WHOIS or search engine query.',
      explanation: 'Passive recon interacts only with public third-party repositories (DNS resolvers, WHOIS registries, search engines, Shodan caches), leaving no direct probing footprint on the target.'
    }
  },
  {
    id: 'lab-active-recon',
    lessonId: 'active-recon',
    kind: 'terminal',
    title: 'Nmap Service Enumeration Simulator',
    objective: 'Practice reading simulated Nmap ping sweeps and SYN/version scan outputs against an authorized lab target (`192.0.2.40`).',
    shortExplanation: 'Active reconnaissance probes live hosts to map open TCP/UDP ports and running software versions. Execute the simulated Nmap commands to discover exposed services.',
    expectedOutcome: 'Run both Nmap scans in the terminal and interpret what `-sS -sV` reveals.',
    xpReward: 75,
    terminalPromptPrefix: 'tester@kali-lab:~$ ',
    requiredCommands: [
      'nmap -sn 192.0.2.0/28',
      'nmap -sS -sV -p 22,80,445 192.0.2.40'
    ],
    terminalCommands: [
      {
        command: 'nmap -sn 192.0.2.0/28',
        aliases: ['nmap -sn'],
        description: 'Host discovery sweep (no port scan) across authorized lab subnet.',
        flagsSummary: '-sn disables port scanning and only checks which hosts respond',
        output: `Starting Nmap 7.94
Nmap scan report for 192.0.2.40
Host is up (0.0021s latency).
Nmap done: 16 IP addresses (1 host up)`,
        interpretation: 'Confirms `192.0.2.40` is online inside the authorized subnet.'
      },
      {
        command: 'nmap -sS -sV -p 22,80,445 192.0.2.40',
        aliases: ['nmap -sS', 'nmap'],
        description: 'TCP SYN stealth scan with service version detection on key ports.',
        flagsSummary: '-sS = half-open SYN scan; -sV = banner/version detection; -p = target ports',
        output: `PORT    STATE  SERVICE     VERSION
22/tcp  open   ssh         OpenSSH 8.9p1
80/tcp  open   http        nginx 1.24.0
445/tcp closed microsoft-ds`,
        interpretation: 'Ports 22 (SSH) and 80 (HTTP) are open with identified versions; port 445 (SMB) is closed.'
      }
    ],
    challenge: {
      prompt: 'In `nmap -sS -sV -p 22,80,445 192.0.2.40`, what do `-sS` and `-sV` instruct Nmap to do?',
      options: [
        '`-sS` launches SQL injection checks, and `-sV` disables VPN split-tunnel routing.',
        '`-sS` scans only UDP services, and `-sV` exports output in structured XML.',
        '`-sS` runs half-open TCP SYN probes, and `-sV` detects open service versions.',
        '`-sS` modifies remote host firewall rules while `-sV` validates local DNS.'
      ],
      correctIndex: 2,
      hint: 'Review the `flagsSummary` shown for the second Nmap command.',
      explanation: '`-sS` sends SYN and resets upon SYN-ACK (half-open scan), while `-sV` sends service probes to determine software names and version numbers.'
    }
  },
  {
    id: 'lab-web-owasp-top-10',
    lessonId: 'web-owasp-top-10',
    kind: 'scenario',
    title: 'OWASP SQL Injection Code Audit & Fix',
    objective: 'Compare an unsafe string-concatenated login query against parameterized execution to understand why SQL Injection occurs and how to eliminate it.',
    shortExplanation: 'SQL Injection happens when untrusted user text alters the syntax of a SQL command. Inspect the highlighted backend query snippet below and diagnose the safe fix.',
    expectedOutcome: 'Spot the vulnerable string concatenation line and select the parameterized defense.',
    xpReward: 75,
    artifactTitle: 'authController.ts (Lab Code Review)',
    artifactLanguage: 'typescript',
    artifactHighlightLines: [3, 4],
    artifactContent: `async function findUserByEmail(db: Database, userEmail: string) {
  // VULNERABLE: directly interpolates user input into SQL syntax
  const query = "SELECT id, role FROM users WHERE email = '" + userEmail + "'";
  return db.executeRaw(query);
}

// SAFE ALTERNATIVE:
// const query = "SELECT id, role FROM users WHERE email = ?";
// return db.executePrepared(query, [userEmail]);`,
    challenge: {
      prompt: 'Why does a parameterized query (`WHERE email = ?` with `[userEmail]`) completely stop SQL Injection even if `userEmail` contains quotes or SQL keywords?',
      options: [
        'It converts the entire relational SQL database into read-only CSV text tables.',
        'It rejects all registration requests whose email addresses contain an `@` sign.',
        'It strips database syntax errors only from the rendered browser response UI.',
        'The database treats bound inputs strictly as literal data, never SQL syntax.'
      ],
      correctIndex: 3,
      hint: 'Think about how the database separates SQL command structure from user-supplied parameter values.',
      explanation: 'Prepared statements separate code from data at the database protocol level. Any special characters inside `userEmail` are bound purely as data literals and cannot modify the SQL syntax tree.'
    }
  },
  {
    id: 'lab-burpsuite-mastery',
    lessonId: 'burpsuite-mastery',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'Intercepting Web Proxy Workflow Explorer',
    objective: 'Explore the specialized modules inside an intercepting HTTP proxy (Proxy, Repeater, Intruder, Decoder, Sequencer) and choose the right tool for each testing task.',
    shortExplanation: 'Web testers rarely guess vulnerabilities blindly in a browser bar—they inspect and replay raw HTTP requests. Click each proxy tool module below to examine its role.',
    expectedOutcome: 'Inspect at least 3 modules and pick the right module for testing an authorization flaw on a single HTTP request.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'proxy',
        label: 'Proxy (127.0.0.1:8080)',
        role: 'Live Traffic Interception',
        summary: 'Sits between the browser and web server to pause, inspect, and edit HTTP/HTTPS requests and responses in real time.',
        details: [
          'Captures hidden fields, headers, cookies, and JSON payloads',
          'Populates the target Site Map automatically as you browse'
        ],
        securityRelevance: 'Proves client-side JavaScript validation can be bypassed after leaving the browser.',
        sampleMetric: 'Listener: 127.0.0.1:8080'
      },
      {
        id: 'repeater',
        label: 'Repeater',
        role: 'Manual Request Modification & Replay',
        summary: 'Sends a single captured HTTP request repeatedly while letting you edit parameters, headers, or user IDs and compare responses side by side.',
        details: [
          'Ideal for testing IDOR (`/api/orders/101` -> `/api/orders/102`)',
          'Shows exact HTTP status codes, headers, and response timing'
        ],
        securityRelevance: 'Core manual workbench for verifying access-control and logic flaws cleanly.',
        sampleMetric: 'Mode: Single-Request Tuning'
      },
      {
        id: 'intruder',
        label: 'Intruder',
        role: 'Automated Parameter Fuzzing',
        summary: 'Replays a request across a wordlist of payloads to test input handling, missing rate limits, or enumeration.',
        details: [
          'Marks insertion positions for automated payload substitution',
          'Flags anomalies by response length or status code'
        ],
        securityRelevance: 'Tests whether endpoints enforce rate limits and handle unexpected boundary inputs.',
        sampleMetric: 'Mode: Wordlist Automation'
      },
      {
        id: 'sequencer',
        label: 'Sequencer & Decoder',
        role: 'Token Entropy & Format Analysis',
        summary: 'Sequencer tests whether session/CSRF tokens are truly random; Decoder converts Base64, URL, and Hex encodings.',
        details: [
          'Reveals predictable sequential session IDs or weak PRNG patterns',
          'Quickly inspects Base64-encoded JWT headers and payloads'
        ],
        securityRelevance: 'Predictable session tokens allow attackers to hijack accounts without guessing passwords.',
        sampleMetric: 'Mode: Entropy & Encoding'
      }
    ],
    challenge: {
      prompt: 'You intercept a `GET /api/invoices/1042` request and want to manually change `1042` to `1041` several times to test for Broken Object Level Authorization (IDOR). Which tool is built specifically for this?',
      options: [
        'Repeater (manual request replay)',
        'Sequencer (token randomness audit)',
        'Decoder (Base64 and hex transform)',
        'Nmap (network service port scanner)'
      ],
      correctIndex: 0,
      hint: 'Look for the module designed for manual request editing and resending.',
      explanation: 'Repeater lets testers edit a captured HTTP request, resend it on demand, and immediately inspect the server response.'
    }
  },
  {
    id: 'lab-net-infiltration',
    lessonId: 'net-infiltration',
    kind: 'diagram',
    diagramMode: 'sequence',
    title: 'Bind vs. Reverse Shell Architecture Flow',
    objective: 'Contrast how a Bind Shell and a Reverse Shell establish connections across a typical enterprise firewall.',
    shortExplanation: 'Firewalls usually block unsolicited inbound traffic to internal servers while allowing certain outbound connections. Step through the connection flow to understand why defensive monitoring watches outbound ports closely.',
    expectedOutcome: 'Review the 3 connection stages and identify why firewalls treat outbound connections differently from inbound connections.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'bind-behavior',
        label: '1. Bind Shell (Inbound Model)',
        role: 'Target Listens, Remote Connects',
        summary: 'The target opens a listening TCP port (e.g., 4444) waiting for an incoming connection.',
        details: [
          'Perimeter firewalls almost always drop unsolicited inbound connections to non-standard ports',
          'Host-based firewalls also restrict unauthorized listening sockets'
        ],
        securityRelevance: 'Defenders scan for unauthorized listening ports (`ss -tulpn`).',
        sampleMetric: 'Direction: Inbound -> Target'
      },
      {
        id: 'reverse-listener',
        label: '2. Reverse Listener Ready',
        role: 'Authorized Lab Console Listens',
        summary: 'In an authorized test lab, the tester opens a listener (`nc -lvnp 4444`) on their test workstation waiting for a callback.',
        details: [
          '`-l` listen, `-v` verbose, `-n` numeric IP, `-p` port',
          'No inbound port needs to be opened on the target perimeter'
        ],
        securityRelevance: 'Demonstrates why outbound egress filtering is just as important as inbound firewall rules.',
        sampleMetric: 'Listener: 192.0.2.10:4444'
      },
      {
        id: 'reverse-egress',
        label: '3. Outbound Callback & Egress Defense',
        role: 'Target Initiates Outbound TCP Session',
        summary: 'The target initiates an outbound connection back to the listener; permissive egress rules may allow outbound 80/443.',
        details: [
          'Hardening fix: restrict server outbound egress to only required destinations',
          'EDR detects shells (`bash`, `cmd.exe`) opening unexpected outbound sockets'
        ],
        securityRelevance: 'Strict egress filtering + EDR process-socket monitoring break reverse callbacks.',
        sampleMetric: 'Defense: Egress Filtering'
      }
    ],
    challenge: {
      prompt: 'From a defender’s perspective, why is strict outbound (egress) firewall filtering on servers essential even when inbound firewall rules are tight?',
      options: [
        'Because egress filters automatically compile updated Linux kernel security patches.',
        'Because reverse shells initiate callbacks outbound, bypassing inbound-only blocks.',
        'Because outbound interactive sessions always travel over plaintext UDP port 21.',
        'Because inbound perimeter rules exclusively evaluate dual-stack IPv6 packets.'
      ],
      correctIndex: 1,
      hint: 'Consider which direction initiates the TCP handshake in a reverse connection.',
      explanation: 'A reverse shell initiates its connection outbound from the target. Without egress restrictions and process monitoring, servers with unrestricted outbound internet access can call external endpoints.'
    }
  },
  {
    id: 'lab-password-attacks',
    lessonId: 'password-attacks',
    kind: 'scenario',
    title: 'Password Policy & Lockout Defense Audit',
    objective: 'Analyze authentication policy settings and login telemetry to understand why password spraying bypasses naive lockout thresholds.',
    shortExplanation: 'Testing 10,000 guesses against one account triggers lockouts immediately, whereas testing 1 common password across 1,000 accounts stays quiet. Inspect the auth log summary below.',
    expectedOutcome: 'Diagnose the password spraying pattern and choose the strongest defensive mitigation.',
    xpReward: 75,
    artifactTitle: 'auth-audit-summary.log',
    artifactLanguage: 'text',
    artifactHighlightLines: [3, 4, 5, 6],
    artifactContent: `[11:00:02] FAIL user=a.adams    src=198.51.100.61 reason=bad_password
[11:00:03] FAIL user=b.bennett  src=198.51.100.61 reason=bad_password
[11:00:04] FAIL user=c.chen     src=198.51.100.61 reason=bad_password
[11:00:05] FAIL user=d.diaz     src=198.51.100.61 reason=bad_password
[11:00:06] SUCCESS user=e.evans src=198.51.100.61 (1st attempt)
POLICY: Account lockout = 5 failed attempts per user / 15 min | MFA = Optional`,
    challenge: {
      prompt: 'Why did the 5-attempt per-user lockout policy fail to stop the intrusion shown in `auth-audit-summary.log`?',
      options: [
        'The attacker inverted SHA-256 password hashes directly inside the login HTML form.',
        'Password spraying tried one password per user across accounts with optional MFA.',
        'The account lockout window was configured to 15 minutes rather than 14 minutes.',
        'Authentication logs recorded failure timestamps in UTC rather than local time.'
      ],
      correctIndex: 1,
      hint: 'Count how many failed attempts occurred per username versus across distinct usernames from the same source IP.',
      explanation: 'Each user only saw 1 attempt, staying below the per-user lockout of 5. Enforcing phishing-resistant MFA, banning common breached passwords, and alerting on one source IP failing across many distinct usernames stops password spraying.'
    }
  },
  {
    id: 'lab-wireless-security',
    lessonId: 'wireless-security',
    kind: 'diagram',
    diagramMode: 'components',
    title: 'WPA2-PSK vs. WPA3-SAE Security Comparison',
    objective: 'Compare legacy WEP, WPA2-PSK, and modern WPA3-SAE authentication handshakes to see how SAE eliminates offline dictionary cracking.',
    shortExplanation: 'Older Wi-Fi pre-shared key handshakes expose mathematical material that can be tested offline against a wordlist. Inspect each wireless protocol below.',
    expectedOutcome: 'Inspect all 3 wireless standards and explain what WPA3 SAE protects against.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'wep',
        label: 'WEP (Deprecated)',
        role: 'Broken RC4 Stream Cipher',
        summary: 'Uses short 24-bit Initialization Vectors (IVs) that repeat quickly, allowing attackers to recover the key mathematically within minutes.',
        details: [
          'No forward secrecy and weak integrity (CRC-32)',
          'Must never be deployed on modern networks'
        ],
        securityRelevance: 'Legacy equipment using WEP gives attackers trivial wireless network entry.',
        sampleMetric: 'Status: Obsolete / Broken'
      },
      {
        id: 'wpa2-psk',
        label: 'WPA2-PSK (AES-CCMP)',
        role: '4-Way Handshake over Pre-Shared Key',
        summary: 'Strong AES encryption per session, but capturing the 4-way handshake allows offline dictionary guessing against the shared Wi-Fi passphrase.',
        details: [
          'Protected by strong random 16+ character passphrases',
          'Deauthentication frames can force clients to replay the handshake'
        ],
        securityRelevance: 'Weak Wi-Fi passphrases on WPA2-PSK can be cracked offline without talking to the AP again.',
        sampleMetric: 'Risk: Offline Dictionary'
      },
      {
        id: 'wpa3-sae',
        label: 'WPA3-SAE (Dragonfly)',
        role: 'Simultaneous Authentication of Equals',
        summary: 'Replaces PSK exchange with an interactive zero-knowledge key exchange plus Protected Management Frames (PMF) by default.',
        details: [
          'Every guess requires an active online exchange with the access point',
          'PMF blocks spoofed deauthentication frames'
        ],
        securityRelevance: 'Eliminates offline handshake cracking and protects sessions with forward secrecy.',
        sampleMetric: 'Status: Modern Standard'
      }
    ],
    challenge: {
      prompt: 'How does WPA3-SAE neutralize the main offline attack used against WPA2-PSK home and small-office Wi-Fi networks?',
      options: [
        'SAE stops offline handshake cracking by requiring live interaction per guess.',
        'SAE conceals the Wi-Fi SSID beacon so nearby wireless cards never detect it.',
        'SAE disables AES-CCMP payload encryption to maximize local wireless throughput.',
        'SAE relies purely on static client hardware MAC address allowlist filtering.'
      ],
      correctIndex: 0,
      hint: 'Contrast offline cracking on a captured WPA2 4-way handshake with WPA3’s Dragonfly exchange.',
      explanation: 'Because WPA3 SAE binds authentication to fresh interactive secrets (and enforces Protected Management Frames), intercepting packets no longer lets an attacker run offline wordlist attacks.'
    }
  },
  {
    id: 'lab-priv-esc',
    lessonId: 'priv-esc',
    kind: 'terminal',
    title: 'Linux SUID & Sudo Misconfiguration Audit',
    objective: 'Run defensive host enumeration commands in a simulated Linux environment to spot risky SUID permissions and overly permissive sudo rules.',
    shortExplanation: 'Defenders and pentesters alike run local privilege audits to close escalation paths before attackers find them. Run the audit commands below on `lab-app-01`.',
    expectedOutcome: 'Run both Linux audit checks and identify the high-risk misconfiguration.',
    xpReward: 75,
    terminalPromptPrefix: 'auditor@lab-app-01:~$ ',
    requiredCommands: [
      'find / -perm -4000 -user root -type f 2>/dev/null',
      'sudo -l'
    ],
    terminalCommands: [
      {
        command: 'find / -perm -4000 -user root -type f 2>/dev/null',
        aliases: ['find / -perm -4000', 'suid'],
        description: 'Locate all root-owned binaries carrying the SUID bit.',
        flagsSummary: '-perm -4000 matches SUID bit; 2>/dev/null suppresses permission denied noise',
        output: `/usr/bin/passwd
/usr/bin/sudo
/usr/local/bin/custom-note-viewer   <-- non-standard SUID binary`,
        interpretation: '`/usr/bin/passwd` and `sudo` are expected, whereas `/usr/local/bin/custom-note-viewer` should be audited or stripped of SUID.'
      },
      {
        command: 'sudo -l',
        aliases: ['sudo'],
        description: 'List commands the current user is allowed to execute via `sudo`.',
        flagsSummary: 'Shows NOPASSWD and binary scope restrictions in `/etc/sudoers`',
        output: `User auditor may run the following commands on lab-app-01:
    (root) NOPASSWD: /usr/bin/find`,
        interpretation: 'Allowing `NOPASSWD: /usr/bin/find` lets any user with shell access run sub-commands (`-exec`) as root!'
      }
    ],
    challenge: {
      prompt: 'Why is `(root) NOPASSWD: /usr/bin/find` listed in `/etc/sudoers` an immediate privilege-escalation vulnerability?',
      options: [
        '`find` only traverses hidden system folders owned exclusively by `nobody`.',
        'Unprivileged Linux user accounts are prohibited from searching directory trees.',
        '`NOPASSWD` automatically encrypts the local `/etc/shadow` password database.',
        '`find -exec` flags let the user spawn arbitrary commands with `root` privileges.'
      ],
      correctIndex: 3,
      hint: 'Recall what GTFOBins warns about utilities like `find`, `vim`, or `less` when granted root `sudo` rights.',
      explanation: 'Any utility capable of spawning sub-shells or executing commands (`find -exec`, `vim`, `awk`) escalates immediately to root if permitted in `sudoers` without strict wrapper validation.'
    }
  },
  {
    id: 'lab-ad-exploitation',
    lessonId: 'ad-exploitation',
    kind: 'diagram',
    diagramMode: 'sequence',
    title: 'Kerberoasting Attack & Defense Trace',
    objective: 'Trace how Kerberoasting abuses standard Kerberos Service Principal Name (SPN) ticket requests—and how defenders harden service accounts against it.',
    shortExplanation: 'Kerberoasting succeeds not from a software crash, but by abusing normal Kerberos design plus weak service passwords. Step through the 4 stages below.',
    expectedOutcome: 'Step through all 4 Kerberos stages and identify the two primary defenses against Kerberoasting.',
    xpReward: 75,
    diagramItems: [
      {
        id: 'ad-1-tgt',
        label: '1. Standard Domain Auth (TGT)',
        role: 'Any Authenticated Domain User',
        summary: 'A standard domain user authenticates to the Domain Controller (KDC) and receives a valid Ticket Granting Ticket (TGT).',
        details: [
          'Requires zero special admin rights—any normal domain user can request service tickets',
          'Logged via Windows Event ID 4768'
        ],
        securityRelevance: 'Compromise of a single low-privilege workstation gives an adversary TGT access.',
        sampleMetric: 'Event ID: 4768'
      },
      {
        id: 'ad-2-tgs',
        label: '2. Request Service Ticket (TGS)',
        role: 'SPN Lookup & Ticket Issuance',
        summary: 'The user requests a TGS ticket for an account carrying a Service Principal Name (e.g., `MSSQLSvc/sql01.example.internal`).',
        details: [
          'The KDC encrypts part of the TGS with the target service account’s NTLM hash',
          'Logged via Windows Event ID 4769 (watch for weak RC4 encryption type `0x17`)'
        ],
        securityRelevance: 'High volumes of Event ID 4769 with RC4 encryption (`0x17`) strongly indicate Kerberoasting.',
        sampleMetric: 'Event ID: 4769'
      },
      {
        id: 'ad-3-offline',
        label: '3. Offline Cracking Attempt',
        role: 'Local Hash Extraction',
        summary: 'If the service account uses a short or predictable password, an attacker tries to crack the extracted TGS hash offline with a GPU.',
        details: [
          'Weak 8-character service passwords crack rapidly offline',
          'No additional failed login events appear on the Domain Controller'
        ],
        securityRelevance: 'Invisible to account lockout policies once the TGS leaves the domain.',
        sampleMetric: 'Risk: Offline Crack'
      },
      {
        id: 'ad-4-defense',
        label: '4. Hardening (gMSA & AES)',
        role: 'Preventing Offline Cracking',
        summary: 'Organizations switch service accounts to Group Managed Service Accounts (gMSA) with 120-character rotating passwords and enforce AES-256 Kerberos.',
        details: [
          'gMSA passwords rotate automatically and cannot be guessed offline',
          'Alert on anomalous RC4 (`0x17`) TGS requests in SIEM'
        ],
        securityRelevance: 'Eliminates practical Kerberoasting across enterprise Active Directory.',
        sampleMetric: 'Fix: gMSA + AES-256'
      }
    ],
    challenge: {
      prompt: 'Which combination best neutralizes Kerberoasting in an Active Directory environment?',
      options: [
        'Disable Kerberos entirely and migrate internal servers to HTTP Basic Auth.',
        'Use gMSAs or 25+ char passwords, enforce AES Kerberos, and alert on RC4 4769.',
        'Add all standard domain accounts to Domain Admins so TGS tickets are skipped.',
        'Disable Windows Security Event ID 4769 auditing across domain controllers.'
      ],
      correctIndex: 1,
      hint: 'Think about why a TGS encrypted with a 120-character gMSA key cannot be cracked offline.',
      explanation: 'Because any domain user can legitimately request a TGS, defense relies on making the service account’s secret mathematically infeasible to crack (gMSA / long random passwords + AES) while alerting on suspicious RC4 TGS bursts.'
    }
  },
  {
    id: 'lab-post-exploit',
    lessonId: 'post-exploit',
    kind: 'log_investigation',
    title: 'Post-Exploitation Persistence & LSASS Hunt',
    objective: 'Inspect host security logs from `lab-srv-03` to distinguish routine administrative maintenance from post-exploitation credential dumping and persistence.',
    shortExplanation: 'After initial compromise, adversaries seek two things: surviving reboots (persistence) and stealing credentials from memory (`lsass.exe`). Inspect the events below and flag the critical attack event.',
    expectedOutcome: 'Identify and flag the unauthorized LSASS memory access / persistence artifact.',
    xpReward: 75,
    logContextTitle: 'Host Security & Sysmon Feed · `lab-srv-03`',
    suspiciousEntryId: 'pe-3',
    logEntries: [
      {
        id: 'pe-1',
        timestamp: '14:05:10 UTC',
        source: 'Sysmon Event ID 1',
        severity: 'INFO',
        message: 'Task Scheduler launched `C:\\Program Files\\Vendor\\agent-sync.exe`',
        details: 'Verified vendor signed binary running under dedicated service account.'
      },
      {
        id: 'pe-2',
        timestamp: '14:11:22 UTC',
        source: 'Windows Security 4624',
        severity: 'INFO',
        message: 'Logon Type 10 (RDP) from IT jump host `192.0.2.5` for admin `r.garcia`',
        details: 'Authorized admin session inside management jump-box subnet.'
      },
      {
        id: 'pe-3',
        timestamp: '14:18:49 UTC',
        source: 'Sysmon Event ID 10',
        severity: 'ALERT',
        message: 'ProcessAccess: `C:\\Windows\\Temp\\dbg_helper.exe` opened `C:\\Windows\\System32\\lsass.exe` (GrantedAccess: 0x1010)',
        details: 'Followed 4 seconds later by Registry Run key creation (`HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\SysSync`).',
        isSuspicious: true
      },
      {
        id: 'pe-4',
        timestamp: '14:22:01 UTC',
        source: 'OpenSSH-Audit',
        severity: 'INFO',
        message: 'Outbound SFTP backup completed to `192.0.2.80:22`',
        details: 'Scheduled daily backup verification job.'
      }
    ],
    challenge: {
      prompt: 'Why does Sysmon Event ID 10 showing an unknown binary opening `lsass.exe` require urgent Credential Guard & containment response?',
      options: [
        '`lsass.exe` solely manages display brightness settings on Windows servers.',
        'Every executable launched from `C:\\Windows\\System32` is guaranteed benign.',
        '`lsass.exe` caches memory secrets/hashes while the Run key adds persistence.',
        'Scheduled outbound SFTP backups are prohibited on standard TCP port 22.'
      ],
      correctIndex: 2,
      hint: 'Recall what Mimikatz and credential-dumping tools target in Windows memory.',
      explanation: 'An untrusted binary in `C:\\Windows\\Temp` reading `lsass.exe` memory strongly indicates credential dumping, while adding a `CurrentVersion\\Run` key establishes persistence across reboots.'
    }
  }
];
