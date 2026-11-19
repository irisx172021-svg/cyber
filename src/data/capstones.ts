import { CapstoneProject } from '../types';

/**
 * Server-side Guided Capstone Projects (Phase 2.4).
 * Strictly imported only by server modules (`src/server/capstones.ts`), never by client bundles.
 * All telemetry, configs, HTTP traces, CloudTrail events, and memory excerpts are synthetic and defensive.
 */
export const ACADEMY_CAPSTONES: CapstoneProject[] = [
  {
    id: 'capstone-soc-investigation',
    code: 'A',
    title: 'Blue-Team SOC Investigation: Multi-Stage Workstation Intrusion',
    roleTitle: 'SOC Tier 2 Incident Responder',
    difficulty: 'intermediate',
    estimatedMinutes: 35,
    xpReward: 400,
    scenarioOverview:
      'Finance workstation WKSTN-FIN-09 triggered an outbound DNS anomaly shortly after a suspicious login outside normal shift hours. Investigate identity, DNS, web proxy, and endpoint telemetry to reconstruct the intrusion timeline and propose containment.',
    objectives: [
      'Correlate authentication anomalies (Windows Event 4624/4625) with DNS and outbound proxy beacons.',
      'Separate benign IT administration and Windows update noise from suspicious process trees.',
      'Reconstruct an accurate incident timeline covering initial access, execution, and staging.',
      'Draft an actionable SOC escalation and host containment brief.',
    ],
    prerequisiteLessonIds: ['soc-triage', 'endpoint-audit', 'win-ad-logs'],
    recommendedLessonIds: ['siem-pipelines', 'incident-response'],
    backgroundBriefing:
      'ACME Health maintains a segmented corporate LAN (10.24.0.0/16) with central syslog/SIEM forwarding. Normal finance staff authenticate from office badge subnet 10.24.12.0/24 or managed VPN pool 172.18.40.0/24 during 07:00–19:00 UTC. Legitimate software updates resolve to vendor.updates.example or download.microsoft.com over TLS 443.',
    evidenceArtifacts: [
      {
        id: 'cap-a-art-auth',
        title: 'Identity & Proxy Telemetry (SIEM Export)',
        kind: 'log',
        summary:
          'Correlated Active Directory logon events and corporate web proxy logs around 02:10–02:20 UTC.',
        targetLineCount: 2,
        targetLineNumbers: [3, 6],
        evidenceHints: [
          'Compare source IP subnets and user-agent strings against the authorized office/VPN ranges.',
          'Look closely at unusually long Base32-like DNS subdomains vs normal vendor domains.',
        ],
        content: [
          '1 | 2026-11-18T02:09:11Z | AUTH   | EventID=4624 | User=m.chen       | SrcIP=172.18.40.18 | LogonType=3  | Notes=VPN shift handoff sync',
          '2 | 2026-11-18T02:10:04Z | PROXY  | ALLOW        | Host=WKSTN-FIN-09 | Dst=cdn.vendor-updates.example:443 | Bytes=48210 | UA=Edge/130.0',
          '3 | 2026-11-18T02:12:41Z | AUTH   | EventID=4624 | User=svc_payroll  | SrcIP=185.220.101.44 | LogonType=10 | Notes=RDP external jump bypass',
          '4 | 2026-11-18T02:13:09Z | AUTH   | EventID=4624 | User=it_backup    | SrcIP=10.24.2.15 | LogonType=3  | Notes=Scheduled nightly snapshot',
          '5 | 2026-11-18T02:14:22Z | DNS    | QUERY        | Host=WKSTN-FIN-09 | Query=telemetry.office.example | Type=A',
          '6 | 2026-11-18T02:15:30Z | DNS    | QUERY        | Host=WKSTN-FIN-09 | Query=a4f9c2810b.sync-cdn-health.example | Type=TXT | Entropy=4.31',
          '7 | 2026-11-18T02:17:05Z | PROXY  | ALLOW        | Host=WKSTN-FIN-14 | Dst=portal.acmehealth.example:443 | Bytes=9120 | UA=Chrome/130.0',
        ].join('\n'),
      },
      {
        id: 'cap-a-art-endpoint',
        title: 'Sysmon Process Creation Excerpt (WKSTN-FIN-09)',
        kind: 'log',
        summary:
          'Endpoint process ancestry captured on WKSTN-FIN-09 immediately following the external RDP session.',
        targetLineCount: 2,
        targetLineNumbers: [3, 5],
        evidenceHints: [
          'Inspect parent-child relationships involving scripting interpreters launched from office or temp paths.',
          'Note user-writable Staging directories rather than Program Files.',
        ],
        content: [
          '1 | 02:11:12Z | PID=2104 | Parent=services.exe   | Image=C:\\Windows\\System32\\svchost.exe -k netsvcs',
          '2 | 02:12:45Z | PID=3912 | Parent=svchost.exe    | Image=C:\\Program Files\\VendorAgent\\healthcheck.exe --quiet',
          '3 | 02:14:52Z | PID=4480 | Parent=rdpinit.exe    | Image=C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe -NoP -W Hidden -Enc JABzAD0A...',
          '4 | 02:15:02Z | PID=4512 | Parent=explorer.exe   | Image=C:\\Program Files\\Microsoft Office\\EXCEL.EXE /e',
          '5 | 02:15:18Z | PID=4608 | Parent=powershell.exe | Image=C:\\Users\\Public\\staging\\collector.exe --export-lsass-cache --out C:\\Users\\Public\\staging\\m.dat',
          '6 | 02:16:40Z | PID=4700 | Parent=svchost.exe    | Image=C:\\Windows\\System32\\UsoClient.exe StartScan',
        ].join('\n'),
      },
      {
        id: 'cap-a-art-containment',
        title: 'Host Containment & Egress Policy Draft',
        kind: 'config',
        summary:
          'Proposed perimeter and host containment actions awaiting Tier 2 SOC sign-off.',
        targetLineCount: 1,
        targetLineNumbers: [4],
        evidenceHints: [
          'Identify which policy rule leaves the active C2 domain reachable or weakens credential rotation.',
        ],
        content: [
          '1 | action_1: isolate_host WKSTN-FIN-09 via EDR network quarantine while preserving RAM',
          '2 | action_2: revoke active Kerberos TGTs and reset svc_payroll + local admin credentials',
          '3 | action_3: sinkhole *.sync-cdn-health.example at internal DNS resolver',
          '4 | action_4: keep port 3389 RDP open externally for emergency vendor troubleshooting during triage',
          '5 | action_5: acquire forensic image of C:\\Users\\Public\\staging and preserve Security/Sysmon evtx',
        ].join('\n'),
      },
    ],
    stages: [
      {
        id: 'soc-stage-1',
        order: 1,
        title: 'Stage 1: Signal Triage & Initial Access Correlation',
        objective: 'Isolate anomalous external access and DNS tunneling indicators in SIEM telemetry.',
        guidance:
          'Compare timestamps across authentication, DNS, and proxy streams. Watch for external IPs authenticating via RDP (LogonType 10) into service accounts and high-entropy TXT DNS queries.',
        practicalTaskPrompt:
          'Inspect "Identity & Proxy Telemetry (SIEM Export)" and select the 2 lines showing unauthorized external RDP access and high-entropy TXT DNS beaconing.',
        evidenceArtifactIds: ['cap-a-art-auth'],
        xpReward: 75,
        knowledgeCheck: {
          id: 'soc-kc-1',
          prompt:
            'Why does the 02:12:41Z Event 4624 entry paired with the 02:15:30Z DNS TXT query merit immediate Tier 2 escalation?',
          options: [
            'A service account accepted an external RDP interactive session (LogonType 10) outside shift hours, followed shortly by high-entropy TXT lookups indicative of DNS tunneling.',
            'LogonType 10 means an automated patch service restarted locally without any network communication.',
            'DNS TXT queries are exclusively encrypted HTTPS handshakes and always indicate TLS 1.3 cipher downgrade.',
            'Any HTTPS connection to port 443 over 40 KB automatically confirms an active ransomware payload.',
          ],
          correctIndex: 0,
          partialCreditIndices: [3],
          optionFeedback: [
            'Correct! Combining anomalous external RDP (LogonType 10) on a service identity with high-entropy DNS TXT queries strongly points to unauthorized interactive access and potential C2/exfiltration.',
            'Incorrect: LogonType 10 represents RemoteInteractive (RDP) logon, not a local Windows service start (LogonType 5).',
            'Incorrect: DNS TXT records carry arbitrary text over UDP/TCP port 53 and are unrelated to TLS 1.3 cipher negotiation.',
            'Partially cautious thinking about volume, but 48 KB HTTPS traffic to a known update CDN with a standard browser UA is normal baseline activity, whereas external RDP + high-entropy DNS TXT is high-confidence malicious.',
          ],
          explanation:
            'External LogonType 10 access on `svc_payroll` from 185.220.101.44 paired with entropy-heavy TXT lookups to an unknown domain breaks multiple identity and DNS baselines simultaneously.',
          reviewLessonId: 'soc-triage',
        },
      },
      {
        id: 'soc-stage-2',
        order: 2,
        title: 'Stage 2: Endpoint Execution & Staging Analysis',
        objective: 'Reconstruct suspicious parent-child process trees on WKSTN-FIN-09.',
        guidance:
          'Review Sysmon process creation records immediately after 02:12:41Z. Legitimate updates spawn from Program Files or System32 with signed vendor flags, whereas malicious staging commonly uses encoded hidden PowerShell and Public profile binaries.',
        practicalTaskPrompt:
          'Inspect "Sysmon Process Creation Excerpt (WKSTN-FIN-09)" and select the 2 lines representing encoded script execution and credential-access staging.',
        evidenceArtifactIds: ['cap-a-art-endpoint'],
        xpReward: 75,
        knowledgeCheck: {
          id: 'soc-kc-2',
          prompt:
            'Which artifact sequencing establishes how credential harvesting occurred after the RDP logon?',
          options: [
            'rdpinit.exe launched hidden encoded PowerShell, which spawned C:\\Users\\Public\\staging\\collector.exe targeting credential cache output.',
            'UsoClient.exe executed Windows Update scanning before triggering svchost.exe health checks.',
            'EXCEL.EXE executed a macro that directly modified DNS TXT records on external authoritative servers.',
            'healthcheck.exe elevated privileges via Program Files signature verification.',
          ],
          correctIndex: 0,
          partialCreditIndices: [2],
          optionFeedback: [
            'Spot on! Sysmon parent-child chaining traces rdpinit.exe -> hidden encoded powershell.exe -> collector.exe writing m.dat under C:\\Users\\Public\\staging.',
            'Incorrect: UsoClient.exe is standard Windows Update orchestration starting 4 minutes later.',
            'Not quite — although Office macros are a common vector in general, here EXCEL.EXE was a clean child of explorer.exe while powershell.exe spawned directly from rdpinit.exe.',
            'Incorrect: Program Files VendorAgent healthcheck.exe was spawned normally by svchost.exe prior to the intrusion.',
          ],
          explanation:
            'Process lineage is the backbone of endpoint forensics: tying `rdpinit.exe` to encoded hidden `powershell.exe` and `collector.exe` proves post-access execution and staging.',
          reviewLessonId: 'endpoint-audit',
        },
      },
      {
        id: 'soc-stage-3',
        order: 3,
        title: 'Stage 3: Containment Readiness & Policy Audit',
        objective: 'Validate proposed containment steps without preserving attacker re-entry paths.',
        guidance:
          'Effective incident containment isolates compromised hosts cleanly (preserving volatile memory if possible), revokes exposed credentials/tokens, blocks C2 domains, and closes unauthorized external ingress.',
        practicalTaskPrompt:
          'Inspect "Host Containment & Egress Policy Draft" and flag the 1 defective policy line that would leave the environment exposed.',
        evidenceArtifactIds: ['cap-a-art-containment'],
        xpReward: 75,
        knowledgeCheck: {
          id: 'soc-kc-3',
          prompt:
            'Why should WKSTN-FIN-09 be quarantined via EDR network isolation rather than immediately powered off and rebuilt before memory triage?',
          options: [
            'Network quarantine stops lateral movement and C2 egress immediately while preserving volatile memory and disk artifacts needed for root-cause and scope investigation.',
            'Powering off a compromised Windows host automatically rotates all Active Directory domain passwords.',
            'EDR quarantine deletes the malicious binary from remote attacker infrastructure.',
            'Rebuilding first guarantees attacker persistence will automatically alert the SOC team.',
          ],
          correctIndex: 0,
          partialCreditIndices: [],
          optionFeedback: [
            'Correct! Network quarantine cuts off C2/lateral risk right away without destroying volatile RAM evidence or overwriting forensic timelines.',
            'Incorrect: Shutting down a host does not revoke AD Kerberos TGTs or passwords stored in directory services.',
            'Incorrect: Local EDR quarantine controls only the managed endpoint, not external attacker servers.',
            'Incorrect: Rebuilding prior to acquisition destroys root-cause evidence and hides how the account was compromised.',
          ],
          explanation:
            'Separating containment (EDR network isolation + credential revocation + blocking external RDP) from eradication/recovery preserves volatile evidence and closes the entry vector.',
          reviewLessonId: 'incident-response',
        },
      },
    ],
    submissionRequirements: [
      'Summarize initial access vector, affected account, and external source IP.',
      'Reconstruct the chronological timeline from 02:12:41Z through 02:15:30Z.',
      'Assess credential exposure and staging impact based on C:\\Users\\Public\\staging.',
      'Specify containment and remediation controls including external RDP closure and AD credential reset.',
    ],
    deliverableTemplate: {
      title: 'SOC Tier 2 Escalation & Containment Brief',
      instructions:
        'Complete all four sections of the incident report using evidence observed across Stages 1–3.',
      minimumCharacters: 180,
      sections: [
        {
          key: 'executiveSummary',
          label: '1. Executive Summary & Entry Vector',
          prompt: 'State the compromised host, identity, external IP, and initial access mechanism.',
          placeholder: 'Example: External RDP logon (LogonType 10) to svc_payroll from 185.220.101.44 onto WKSTN-FIN-09...',
        },
        {
          key: 'timeline',
          label: '2. Reconstructed Attack Timeline',
          prompt: 'Map key timestamps linking RDP access, encoded PowerShell, collector staging, and DNS TXT beaconing.',
          placeholder: '02:12:41Z Event 4624 -> 02:14:52Z powershell -Enc -> 02:15:18Z collector.exe -> 02:15:30Z DNS TXT...',
        },
        {
          key: 'impactAssessment',
          label: '3. Scope & Credential Impact',
          prompt: 'Identify exposed artifacts (m.dat, service credentials) and unaffected baseline hosts.',
          placeholder: 'svc_payroll credentials and WKSTN-FIN-09 LSASS cache are potentially exposed; WKSTN-FIN-14 shows benign web traffic...',
        },
        {
          key: 'remediation',
          label: '4. Containment & Corrective Actions',
          prompt: 'List immediate host quarantine, token revocation, DNS sinkholing, and firewall hardening steps.',
          placeholder: 'Quarantine WKSTN-FIN-09 via EDR, block external TCP/3389 RDP, reset svc_payroll + Kerberos TGTs, sinkhole sync-cdn-health.example...',
        },
      ],
    },
    rubricCriteria: [
      {
        id: 'soc-rub-1',
        label: 'Initial Access Identification',
        maxPoints: 25,
        description: 'Accurately cites WKSTN-FIN-09, svc_payroll, 185.220.101.44, and RDP/LogonType 10.',
        expectedKeywords: ['svc_payroll', '185.220.101.44', 'rdp', 'wkstn-fin-09'],
      },
      {
        id: 'soc-rub-2',
        label: 'Execution & DNS Correlation',
        maxPoints: 25,
        description: 'Connects hidden PowerShell, collector.exe staging, and TXT DNS tunneling/exfiltration.',
        expectedKeywords: ['powershell', 'collector', 'dns', 'txt'],
      },
      {
        id: 'soc-rub-3',
        label: 'Scope & Evidence Preservation',
        maxPoints: 25,
        description: 'Addresses credential/LSASS cache exposure and forensic preservation rather than blind wipe.',
        expectedKeywords: ['credential', 'quarantine', 'staging', 'forensic'],
      },
      {
        id: 'soc-rub-4',
        label: 'Actionable Containment Plan',
        maxPoints: 25,
        description: 'Includes blocking external RDP (3389), resetting accounts/tokens, and DNS sinkhole.',
        expectedKeywords: ['3389', 'reset', 'sinkhole', 'edr'],
      },
    ],
    detailedSolutionExplanation:
      'Complete Investigation Walkthrough: At 02:12:41Z, `svc_payroll` authenticated to `WKSTN-FIN-09` from external IP `185.220.101.44` using RemoteInteractive RDP (`LogonType=10`), indicating exposed external port 3389 combined with compromised service credentials. At 02:14:52Z, `rdpinit.exe` spawned an encoded, hidden PowerShell process that launched `C:\\Users\\Public\\staging\\collector.exe` (02:15:18Z) to harvest LSASS cache data into `m.dat`. Twelve seconds later (02:15:30Z), `WKSTN-FIN-09` issued high-entropy DNS TXT queries to `*.sync-cdn-health.example` for covert C2/staging signaling. Containment requires immediate EDR network isolation (preserving RAM/disk artifacts), revoking Kerberos TGTs and resetting `svc_payroll`, blocking external RDP TCP/3389 behind VPN/MFA, and sinkholing the C2 domain.',
    reflectionPrompts: [
      'Which preventive control would have blocked an attacker from using `svc_payroll` over RDP even if credentials leaked?',
      'How could a SIEM correlation rule detect encoded PowerShell + high-entropy DNS within 60 seconds automatically?',
    ],
    recommendedNextLessonIds: ['incident-response', 'dig-forensics', 'malware-triage'],
  },
  {
    id: 'capstone-web-app-review',
    code: 'B',
    title: 'Secure Web Application Review: Auth, Session & Data-Access Audit',
    roleTitle: 'Application Security Reviewer',
    difficulty: 'intermediate',
    estimatedMinutes: 35,
    xpReward: 400,
    scenarioOverview:
      'Before releasing an internal invoice portal to production, audit its Express API route handler, cookie configuration, and PostgreSQL query builder for broken access control, insecure session attributes, and injection flaws.',
    objectives: [
      'Spot insecure SQL string interpolation versus parameterized queries.',
      'Identify horizontal privilege escalation (IDOR) in resource endpoints.',
      'Verify secure HttpOnly, SameSite, and Secure session cookie flags.',
      'Recommend concrete code-level remediations prioritized by exploitability and impact.',
    ],
    prerequisiteLessonIds: ['http-web-arch', 'db-sql-foundations', 'auth-sessions-id'],
    recommendedLessonIds: ['web-owasp-top-10', 'burpsuite-mastery'],
    backgroundBriefing:
      'The portal is an Express + TypeScript backend serving authenticated B2B finance users behind an HTTPS reverse proxy. Each user belongs to an `orgId` tenant and holds an `id`. Only resources matching the authenticated user’s `orgId` should be readable or downloadable.',
    evidenceArtifacts: [
      {
        id: 'cap-b-art-handler',
        title: 'Invoice Route & Data Query Module (invoices.ts)',
        kind: 'config',
        summary: 'Backend Express handler and SQL helper pending AppSec release sign-off.',
        targetLineCount: 2,
        targetLineNumbers: [3, 8],
        evidenceHints: [
          'Check whether user-supplied invoiceId is verified against req.auth.orgId.',
          'Check how searchTerm is interpolated into the SQL query string.',
        ],
        content: [
          '1 | app.get("/api/invoices/:invoiceId", requireAuth, async (req, res) => {',
          '2 |   const { invoiceId } = req.params;',
          '3 |   const row = await db.query("SELECT * FROM invoices WHERE id = $1", [invoiceId]); // missing orgId ownership check',
          '4 |   if (!row.rows[0]) return res.status(404).json({ error: "Not found" });',
          '5 |   return res.json(row.rows[0]);',
          '6 | });',
          '7 | async function searchInvoices(orgId: string, searchTerm: string) {',
          '8 |   const sql = `SELECT id, total FROM invoices WHERE org_id = $1 AND vendor ILIKE \'%${searchTerm}%\'`;',
          '9 |   return db.query(sql, [orgId]);',
          '10| }',
        ].join('\n'),
      },
      {
        id: 'cap-b-art-session',
        title: 'HTTP Login Trace & Cookie Issuance Policy',
        kind: 'http_trace',
        summary: 'Captured server response headers during staging login audit over HTTPS.',
        targetLineCount: 2,
        targetLineNumbers: [4, 6],
        evidenceHints: [
          'Verify whether JavaScript can read the session cookie and whether CORS allows untrusted origins with credentials.',
        ],
        content: [
          '1 | HTTP/1.1 200 OK',
          '2 | Content-Security-Policy: default-src \'self\'; object-src \'none\'',
          '3 | Strict-Transport-Security: max-age=31536000; includeSubDomains',
          '4 | Set-Cookie: portal_sid=eyJ2Ijox...; Path=/; HttpOnly=false; SameSite=None',
          '5 | Cache-Control: no-store',
          '6 | Access-Control-Allow-Origin: https://partner-debug.untrusted.example (reflected wildcard/unvalidated)',
          '7 | Access-Control-Allow-Credentials: true',
        ].join('\n'),
      },
    ],
    stages: [
      {
        id: 'web-stage-1',
        order: 1,
        title: 'Stage 1: Authorization & SQL Parameterization Review',
        objective: 'Pinpoint broken object-level authorization (IDOR) and SQL injection risk.',
        guidance:
          'Even when `requireAuth` checks that a caller is logged in, failing to scope database lookups to `req.auth.orgId` allows cross-tenant IDOR. Template interpolation inside SQL breaks parameterization.',
        practicalTaskPrompt:
          'Inspect "Invoice Route & Data Query Module (invoices.ts)" and select the 2 vulnerable lines introducing cross-tenant IDOR and SQL injection.',
        evidenceArtifactIds: ['cap-b-art-handler'],
        xpReward: 75,
        knowledgeCheck: {
          id: 'web-kc-1',
          prompt:
            'Why does line 8 remain vulnerable to SQL injection even though `orgId` is passed as parameter `$1`?',
          options: [
            '`searchTerm` is concatenated directly via JavaScript template interpolation (`${searchTerm}`) inside the SQL command string instead of being bound as `$2`.',
            'PostgreSQL `$1` placeholders are disabled whenever `ILIKE` is used.',
            '`requireAuth` strips SQL quotes automatically only on GET routes.',
            'Async TypeScript functions execute SQL inside browser localStorage.',
          ],
          correctIndex: 0,
          partialCreditIndices: [1],
          optionFeedback: [
            'Exact! Parameterizing `orgId` protects `$1`, while interpolating `${searchTerm}` merges attacker input directly into the SQL AST.',
            'Careful — PostgreSQL fully supports parameterized `ILIKE $2` (passing `%${escapedTerm}%` as the parameter value); the bug is string interpolation, not `ILIKE` itself.',
            'Incorrect: Authentication middleware verifies identity, not SQL syntax.',
            'Incorrect: Server database queries run on the backend DB connection, not browser localStorage.',
          ],
          explanation:
            'Every untrusted variable—especially wildcard search strings—must be bound as a query parameter (e.g., `vendor ILIKE $2` with `["%"+term+"%"]`) alongside tenant scoping `WHERE id = $1 AND org_id = $2`.',
          reviewLessonId: 'db-sql-foundations',
        },
      },
      {
        id: 'web-stage-2',
        order: 2,
        title: 'Stage 2: Session Transport & Browser Trust Review',
        objective: 'Audit Set-Cookie flags and credentialed CORS headers.',
        guidance:
          'Session identifiers must remain inaccessible to `document.cookie` (`HttpOnly`), require TLS (`Secure`), restrict cross-site transmission (`SameSite=Lax` or `Strict`), and never pair `Access-Control-Allow-Credentials: true` with unvalidated origins.',
        practicalTaskPrompt:
          'Inspect "HTTP Login Trace & Cookie Issuance Policy" and select the 2 lines exposing the session cookie to XSS/CORS theft.',
        evidenceArtifactIds: ['cap-b-art-session'],
        xpReward: 75,
        knowledgeCheck: {
          id: 'web-kc-2',
          prompt:
            'What happens when `HttpOnly=false` is combined with credentialed CORS trusting an arbitrary external origin?',
          options: [
            'Any injected client script can read `portal_sid` via `document.cookie`, and untrusted external origins can make credentialed browser requests reading authenticated responses.',
            'The browser automatically blocks JavaScript execution when SameSite=None is present.',
            'HSTS forces CORS to ignore `Access-Control-Allow-Credentials`.',
            'Cache-Control: no-store encrypts session cookies against XSS.',
          ],
          correctIndex: 0,
          partialCreditIndices: [],
          optionFeedback: [
            'Right! Missing `HttpOnly` exposes session tokens to XSS exfiltration, while loose credentialed CORS enables cross-origin data theft.',
            'Incorrect: `SameSite=None` relaxes cross-site cookie rules (and requires `Secure` in modern browsers); it never blocks JS.',
            'Incorrect: HSTS enforces HTTPS transport, not CORS origin validation.',
            'Incorrect: `Cache-Control: no-store` stops disk caching of responses, not script reads or CORS.',
          ],
          explanation:
            'Enforce `HttpOnly; Secure; SameSite=Lax` (or `SameSite=None; Secure; Partitioned` solely inside explicitly trusted frames) and validate CORS origins against a strict allowlist.',
          reviewLessonId: 'auth-sessions-id',
        },
      },
      {
        id: 'web-stage-3',
        order: 3,
        title: 'Stage 3: Defense-in-Depth & Release Gate',
        objective: 'Synthesize code fixes, regression tests, and release blockers prior to deployment.',
        guidance:
          'Before lifting a release hold, security reviewers specify exact parameterized query rewrites, server-derived tenant checks, tightened session cookie defaults, and automated regression checks.',
        practicalTaskPrompt:
          'Revisit Stages 1 and 2 if needed to double-check line details, then verify your architecture understanding below before writing the AppSec Review Report.',
        evidenceArtifactIds: ['cap-b-art-handler', 'cap-b-art-session'],
        xpReward: 75,
        knowledgeCheck: {
          id: 'web-kc-3',
          prompt:
            'Which fix reliably closes cross-tenant IDOR on `/api/invoices/:invoiceId` without breaking client UX?',
          options: [
            'Derive `orgId` strictly from the verified server session (`req.auth.orgId`) and include `AND org_id = $2` in the SQL WHERE clause.',
            'Accept `?orgId=...` from the browser query string and compare it to a cookie.',
            'Encode `:invoiceId` in Base64 so external users cannot guess sequential integers.',
            'Hide the invoice button in the React frontend for non-owners.',
          ],
          correctIndex: 0,
          partialCreditIndices: [1],
          optionFeedback: [
            'Correct! Server-side ownership enforcement keyed off verified auth context prevents forged client IDs cleanly.',
            'Partially thinking about tenant checks, but trusting client-supplied `?orgId` still fails authorization unless checked against server session `req.auth.orgId`.',
            'Incorrect: Base64 is reversible encoding, not access control.',
            'Incorrect: UI hiding does not stop direct API requests.',
          ],
          explanation:
            'Access control must always be enforced server-side against trusted session identity, never by obfuscation or UI hiding.',
          reviewLessonId: 'http-web-arch',
        },
      },
    ],
    submissionRequirements: [
      'Detail the IDOR defect in GET /api/invoices/:invoiceId with exact tenant-scoping fix.',
      'Detail the SQL injection sink in searchInvoices() with full parameterized $2 remediation.',
      'Explain why Set-Cookie (HttpOnly=false, missing Secure, SameSite=None) and reflected credentialed CORS fail security baseline.',
      'Propose release-blocking verification tests (automated negative IDOR + SQLi unit/integration checks).',
    ],
    deliverableTemplate: {
      title: 'Application Security Release Review & Remediation Plan',
      instructions:
        'Document each vulnerability, severity/impact, and exact code/header remediation required before production deployment.',
      minimumCharacters: 180,
      sections: [
        {
          key: 'executiveSummary',
          label: '1. Release Verdict & Risk Summary',
          prompt: 'Summarize the release decision (Hold) and highest-severity findings.',
          placeholder: 'Release HOLD recommended due to cross-tenant IDOR, SQL injection in searchInvoices, and weak session/CORS controls...',
        },
        {
          key: 'authAndSqlFixes',
          label: '2. IDOR & SQL Injection Remediation',
          prompt: 'Describe exact query updates (org_id = $2, parameterized $2 for searchTerm).',
          placeholder: 'Scope GET /api/invoices/:invoiceId with AND org_id = $2 from req.auth.orgId; replace ${searchTerm} with $2 parameter...',
        },
        {
          key: 'sessionAndCorsFixes',
          label: '3. Session Cookie & CORS Hardening',
          prompt: 'Specify safe Set-Cookie attributes and strict CORS origin allowlisting.',
          placeholder: 'Set HttpOnly, Secure, SameSite=Lax on portal_sid; enforce strict server-side origin allowlist before Allow-Credentials...',
        },
        {
          key: 'verificationPlan',
          label: '4. Pre-Release Regression Tests',
          prompt: 'List automated checks confirming cross-tenant requests return 404/403 and crafted search inputs stay literal.',
          placeholder: 'Add integration tests for cross-tenant orgId access (expect 403/404), SQL metacharacter inputs, and cookie flags...',
        },
      ],
    },
    rubricCriteria: [
      {
        id: 'web-rub-1',
        label: 'Broken Access Control (IDOR) Fix',
        maxPoints: 25,
        description: 'Identifies missing org_id check and binds tenant check to authenticated server session.',
        expectedKeywords: ['idor', 'org_id', 'session', 'req.auth'],
      },
      {
        id: 'web-rub-2',
        label: 'SQL Injection Remediation',
        maxPoints: 25,
        description: 'Flags template literal interpolation of searchTerm and replaces with parameterized binding.',
        expectedKeywords: ['searchterm', 'parameter', 'sql', '$2'],
      },
      {
        id: 'web-rub-3',
        label: 'Cookie & CORS Security',
        maxPoints: 25,
        description: 'Requires HttpOnly, Secure, strict SameSite, and allowlisted CORS origins.',
        expectedKeywords: ['httponly', 'secure', 'samesite', 'cors'],
      },
      {
        id: 'web-rub-4',
        label: 'Verification & Testing Discipline',
        maxPoints: 25,
        description: 'Defines regression tests proving controls hold before production release.',
        expectedKeywords: ['test', '403', 'origin', 'hold'],
      },
    ],
    detailedSolutionExplanation:
      'AppSec Sign-Off Walkthrough: Three release-blocking flaws exist. First, `/api/invoices/:invoiceId` fetches rows solely by `id` without validating `org_id = $2` from `req.auth.orgId`, enabling horizontal IDOR across tenants. Second, `searchInvoices()` concatenates `${searchTerm}` inside a template SQL string instead of binding `%${escaped}%` as parameter `$2`, creating a SQL injection sink. Third, the response sets `portal_sid` with `HttpOnly=false; SameSite=None` (missing `Secure`) while reflecting untrusted origins alongside `Access-Control-Allow-Credentials: true`. Production release requires binding all SQL inputs, enforcing tenant ownership server-side, setting `HttpOnly; Secure; SameSite=Lax`, locking CORS origins to a strict allowlist, and running automated negative tests.',
    reflectionPrompts: [
      'Why does ORM or query-builder usage still fail if raw template interpolation is used for LIKE/ORDER BY clauses?',
      'Which defense layer protects users if an XSS bug slips through: HttpOnly cookies or CORS?',
    ],
    recommendedNextLessonIds: ['web-owasp-top-10', 'devsecops-cicd', 'tls-handshake'],
  },
  {
    id: 'capstone-cloud-incident',
    code: 'C',
    title: 'Cloud Security & Incident Reconstruction: IAM & Storage Audit',
    roleTitle: 'Cloud Security Incident Analyst',
    difficulty: 'advanced',
    estimatedMinutes: 40,
    xpReward: 450,
    scenarioOverview:
      'An unexpected CloudTrail burst alerted the cloud security team after an old CI deployment key assumed a high-privilege role and modified an S3 archival bucket policy. Reconstruct blast radius and harden IAM/storage posture.',
    objectives: [
      'Trace AWS CloudTrail API chains from leaked CI user credentials to sts:AssumeRole and S3 policy tampering.',
      'Spot over-permissive wildcard actions (`*`) and public/anonymous storage ACL/policy grants.',
      'Evaluate KMS encryption and CloudTrail integrity protections.',
      'Produce an executive cloud incident reconstruction and least-privilege remediation plan.',
    ],
    prerequisiteLessonIds: ['aws-iam-s3', 'aws-logging'],
    recommendedLessonIds: ['azure-security', 'gcp-security'],
    backgroundBriefing:
      'Production account `111122223333` uses dedicated CI/CD OIDC federation (`ci-oidc-deploy`) for active pipelines. Legacy IAM user `ci-legacy-bot` was slated for retirement. Sensitive patient billing backups reside in `s3://acme-billing-archive` with KMS key `arn:aws:kms:us-east-1:111122223333:key/billing-cmk`.',
    evidenceArtifacts: [
      {
        id: 'cap-c-art-cloudtrail',
        title: 'AWS CloudTrail Event Stream (Normalized)',
        kind: 'cloudtrail',
        summary: 'Sequence of IAM and S3 control-plane API calls over a 12-minute window.',
        targetLineCount: 3,
        targetLineNumbers: [2, 4, 5],
        evidenceHints: [
          'Trace which legacy principal invoked AssumeRole from an unexpected IP.',
          'Look for security visibility weakening (logging) and S3 bucket policy opening.',
        ],
        content: [
          '1 | 14:01:08Z | Principal=ci-oidc-deploy | SrcIP=198.51.100.12 | Event=PutObject        | Resource=s3://acme-artifacts/build-882.zip | Result=OK',
          '2 | 14:04:19Z | Principal=ci-legacy-bot  | SrcIP=203.0.113.99  | Event=AssumeRole       | Role=AdminOpsRole | MFA=false | Result=OK',
          '3 | 14:05:44Z | Principal=ops-monitoring | SrcIP=10.40.1.9     | Event=GetMetricData    | Namespace=AWS/EC2 | Result=OK',
          '4 | 14:07:02Z | Principal=AdminOpsRole   | SrcIP=203.0.113.99  | Event=StopLogging      | Trail=org-audit-trail | Result=DeniedBySCP',
          '5 | 14:08:51Z | Principal=AdminOpsRole   | SrcIP=203.0.113.99  | Event=PutBucketPolicy  | Bucket=acme-billing-archive | Statement=Principal:* Allow s3:GetObject | Result=OK',
          '6 | 14:11:30Z | Principal=AdminOpsRole   | SrcIP=203.0.113.99  | Event=ListObjectsV2    | Bucket=acme-billing-archive | Keys=4120 | Result=OK',
        ].join('\n'),
      },
      {
        id: 'cap-c-art-iam',
        title: 'AdminOpsRole Inline IAM Trust & Permission Policy',
        kind: 'config',
        summary: 'Current IAM JSON policy attached to AdminOpsRole allowing unauthorized escalation.',
        targetLineCount: 2,
        targetLineNumbers: [4, 7],
        evidenceHints: [
          'Spot overly broad trust principal or missing external/MFA condition.',
          'Spot wildcard Action + Resource privileges.',
        ],
        content: [
          '1 | {',
          '2 |   "Version": "2012-10-17",',
          '3 |   "TrustPolicy": {',
          '4 |     "Principal": { "AWS": "arn:aws:iam::111122223333:root" }, "Condition": {}',
          '5 |   },',
          '6 |   "Permissions": {',
          '7 |     "Effect": "Allow", "Action": "*", "Resource": "*"',
          '8 |   }',
          '9 | }',
        ].join('\n'),
      },
    ],
    stages: [
      {
        id: 'cloud-stage-1',
        order: 1,
        title: 'Stage 1: CloudTrail Kill-Chain Reconstruction',
        objective: 'Trace credential abuse, anti-forensic logging tamper attempts, and storage exposure.',
        guidance:
          'CloudTrail records every API control-plane call (`Event`), who made it (`Principal`), where from (`SrcIP`), and whether guardrails like Service Control Policies (`SCP`) blocked tamper attempts.',
        practicalTaskPrompt:
          'Inspect "AWS CloudTrail Event Stream (Normalized)" and select the 3 lines capturing initial `AssumeRole`, `StopLogging` tamper attempt, and public S3 bucket policy exposure.',
        evidenceArtifactIds: ['cap-c-art-cloudtrail'],
        xpReward: 75,
        knowledgeCheck: {
          id: 'cloud-kc-1',
          prompt:
            'What saved `org-audit-trail` from going blind during the attacker’s `StopLogging` call at 14:07:02Z?',
          options: [
            'An organization-level Service Control Policy (SCP) explicitly denied `cloudtrail:StopLogging`, overriding even `AdminOpsRole` wildcard permissions.',
            'S3 bucket policies automatically encrypt CloudTrail API endpoints.',
            'CloudTrail never logs IAM AssumeRole failures or denials.',
            'VPC Flow Logs blocked the DNS request locally.',
          ],
          correctIndex: 0,
          partialCreditIndices: [],
          optionFeedback: [
            'Correct! Organization SCPs act as hard permission boundaries that even local account admin roles cannot bypass.',
            'Incorrect: S3 bucket policies govern object/bucket access, not `cloudtrail:StopLogging`.',
            'Incorrect: CloudTrail logs denials (`DeniedBySCP`) precisely so responders catch tamper attempts.',
            'Incorrect: VPC Flow Logs record IP packet flows, not IAM SCP enforcement.',
          ],
          explanation:
            'Effective cloud architecture pairs account roles with AWS Organizations SCPs prohibiting log tampering (`cloudtrail:StopLogging`, `DeleteTrail`) and enabling log-file integrity validation.',
          reviewLessonId: 'aws-logging',
        },
      },
      {
        id: 'cloud-stage-2',
        order: 2,
        title: 'Stage 2: IAM Least-Privilege & Trust Boundary Audit',
        objective: 'Identify why `ci-legacy-bot` could pivot into `AdminOpsRole` and expose S3 data.',
        guidance:
          'When a role trusts `:root` with an empty `Condition: {}`, any IAM identity in the account allowed to call `sts:AssumeRole` can assume it without MFA or source constraints. Wildcard `"Action": "*", "Resource": "*"` enables unrestricted lateral abuse.',
        practicalTaskPrompt:
          'Inspect "AdminOpsRole Inline IAM Trust & Permission Policy" and highlight the 2 lines introducing excessive trust and full-account wildcard permissions.',
        evidenceArtifactIds: ['cap-c-art-iam'],
        xpReward: 75,
        knowledgeCheck: {
          id: 'cloud-kc-2',
          prompt:
            'Once `PutBucketPolicy` granted `Principal: *` `s3:GetObject`, why could KMS CMK encryption (`billing-cmk`) still prevent anonymous internet callers from reading object plaintext?',
          options: [
            'Reading SSE-KMS encrypted objects requires both `s3:GetObject` permission AND `kms:Decrypt` permission on the CMK, which anonymous callers lack.',
            'KMS automatically deletes all public S3 objects every 5 minutes.',
            'S3 Block Public Access disables `ListObjectsV2` internally for AdminOpsRole.',
            'IAM trust policies encrypt HTTP headers using AES-128.',
          ],
          correctIndex: 0,
          partialCreditIndices: [2],
          optionFeedback: [
            'Spot on! Cryptographic separation via SSE-KMS requires `kms:Decrypt` authorization in addition to S3 bucket access.',
            'Incorrect: KMS enforces key access policies, never object deletion.',
            'Good reminder that S3 Block Public Access is a critical control here too, though `PutBucketPolicy` succeeded so S3 BPA was missing — SSE-KMS key isolation is what specifically blocks decrypt without `kms:Decrypt`.',
            'Incorrect: IAM trust policies control AssumeRole relationships, not HTTP header encryption.',
          ],
          explanation:
            'Defense in depth combines S3 Block Public Access (to stop `PutBucketPolicy Principal:*` altogether) with SSE-KMS key policies restricting `kms:Decrypt` to authorized roles.',
          reviewLessonId: 'aws-iam-s3',
        },
      },
      {
        id: 'cloud-stage-3',
        order: 3,
        title: 'Stage 3: Blast Radius Containment & Cloud Hardening',
        objective: 'Define credential revocation, S3 policy rollback, and long-term cloud guardrails.',
        guidance:
          'Revoking static IAM user keys and active STS sessions (`RevokeActiveSessions`), restoring private S3 policies + enabling Block Public Access, and replacing long-lived access keys with short-lived OIDC federation closes the root cause.',
        practicalTaskPrompt:
          'Review both CloudTrail and IAM artifacts across Stages 1–2, pass the stage check, and submit your Cloud Incident Report.',
        evidenceArtifactIds: ['cap-c-art-cloudtrail', 'cap-c-art-iam'],
        xpReward: 75,
        knowledgeCheck: {
          id: 'cloud-kc-3',
          prompt:
            'Why is disabling `ci-legacy-bot` access keys alone insufficient right after `AssumeRole` occurs?',
          options: [
            'Previously minted STS temporary credentials remain valid until expiry unless active role sessions are explicitly revoked (e.g., via `aws:TokenIssueTime` policy guardrail).',
            'IAM users do not hold STS temporary tokens.',
            'Disabling access keys deletes CloudTrail logs simultaneously.',
            'STS tokens automatically downgrade from Admin to ReadOnly after 1 minute.',
          ],
          correctIndex: 0,
          partialCreditIndices: [],
          optionFeedback: [
            'Correct! STS tokens issued before key revocation stay valid until TTL expiry unless explicitly invalidated by session policy timestamp conditions.',
            'Incorrect: The attacker already called `AssumeRole` and holds temporary STS credentials for `AdminOpsRole`.',
            'Incorrect: Disabling keys has no effect on CloudTrail archives.',
            'Incorrect: STS credentials keep full role permissions until expiration or explicit revocation.',
          ],
          explanation:
            'Incident containment for `sts:AssumeRole` abuse must always revoke active STS role sessions (`aws:TokenIssueTime` deny condition) alongside deleting static IAM access keys.',
          reviewLessonId: 'aws-iam-s3',
        },
      },
    ],
    submissionRequirements: [
      'Reconstruct the CloudTrail sequence (`ci-legacy-bot` -> `AdminOpsRole` -> `StopLogging` -> `PutBucketPolicy` -> `ListObjectsV2`).',
      'Explain why `ci-legacy-bot` escalated (permissive `:root` trust, empty `Condition`, wildcard `*`).',
      'Assess S3 billing data exposure including SSE-KMS decrypt protections and S3 Block Public Access gaps.',
      'Provide immediate containment (revoke keys + STS sessions, revert bucket policy) and preventive SCP/OIDC hardening.',
    ],
    deliverableTemplate: {
      title: 'Cloud Incident Reconstruction & IAM Hardening Report',
      instructions:
        'Synthesize CloudTrail evidence, IAM misconfigurations, KMS exposure analysis, and cloud remediation steps.',
      minimumCharacters: 180,
      sections: [
        {
          key: 'executiveSummary',
          label: '1. Incident Summary & Root Cause',
          prompt: 'Identify the compromised static identity, rogue IP, assumed role, and target bucket.',
          placeholder: 'Legacy IAM user ci-legacy-bot key compromised from 203.0.113.99, assuming AdminOpsRole...',
        },
        {
          key: 'timeline',
          label: '2. CloudTrail Control-Plane Timeline',
          prompt: 'Sequence AssumeRole, SCP-blocked StopLogging, PutBucketPolicy, and ListObjectsV2.',
          placeholder: '14:04:19Z AssumeRole AdminOpsRole -> 14:07:02Z StopLogging denied by SCP -> 14:08:51Z PutBucketPolicy Principal:*...',
        },
        {
          key: 'blastRadius',
          label: '3. Storage Exposure & Guardrail Assessment',
          prompt: 'Evaluate ListObjectsV2 reconnaissance, missing S3 Block Public Access, and KMS CMK boundary.',
          placeholder: 'S3 bucket policy exposed Principal:* s3:GetObject; 4120 keys listed, though kms:Decrypt limits plaintext decryption...',
        },
        {
          key: 'remediation',
          label: '4. Containment & Least-Privilege Remediation',
          prompt: 'Specify key deletion, STS session revocation, S3 Block Public Access, MFA/OIDC, and scoped IAM.',
          placeholder: 'Delete ci-legacy-bot keys, attach aws:TokenIssueTime deny on AdminOpsRole, revert bucket policy & enable Block Public Access...',
        },
      ],
    },
    rubricCriteria: [
      {
        id: 'cloud-rub-1',
        label: 'CloudTrail Chain Accuracy',
        maxPoints: 25,
        description: 'Links ci-legacy-bot, 203.0.113.99, AdminOpsRole, and PutBucketPolicy/ListObjectsV2.',
        expectedKeywords: ['ci-legacy-bot', 'assumerole', 'adminopsrole', 'putbucketpolicy'],
      },
      {
        id: 'cloud-rub-2',
        label: 'Guardrail & SCP Analysis',
        maxPoints: 25,
        description: 'Explains why SCP blocked StopLogging and assesses KMS/S3 Block Public Access impact.',
        expectedKeywords: ['scp', 'stoplogging', 'kms', 'public'],
      },
      {
        id: 'cloud-rub-3',
        label: 'IAM Least-Privilege Fixes',
        maxPoints: 25,
        description: 'Removes `:root` / `"Action": "*"` wildcards, adds MFA/OIDC conditions.',
        expectedKeywords: ['wildcard', 'mfa', 'oidc', 'least'],
      },
      {
        id: 'cloud-rub-4',
        label: 'Session & Key Containment',
        maxPoints: 25,
        description: 'Addresses revoking active STS sessions alongside disabling static keys and restoring S3 policy.',
        expectedKeywords: ['sts', 'revoke', 'bucket', 'session'],
      },
    ],
    detailedSolutionExplanation:
      'Cloud Incident Walkthrough: External IP `203.0.113.99` used leaked static keys for `ci-legacy-bot` to invoke `sts:AssumeRole` on `AdminOpsRole` (14:04:19Z), permitted because the role trusted account `:root` without MFA or caller restrictions. At 14:07:02Z, the actor attempted `cloudtrail:StopLogging`, which failed cleanly thanks to an organization SCP (`DeniedBySCP`). At 14:08:51Z, the actor opened `acme-billing-archive` via `PutBucketPolicy` (`Principal: *`), exposing missing S3 Block Public Access—though `billing-cmk` SSE-KMS still prevented unauthenticated plaintext decryption without `kms:Decrypt`. Remediation requires deleting `ci-legacy-bot`, invalidating active `AdminOpsRole` STS sessions via `aws:TokenIssueTime`, reverting the S3 policy + enabling account-wide Block Public Access, replacing `"Action": "*"` with least-privilege permissions, and enforcing OIDC + MFA.',
    reflectionPrompts: [
      'Why should account-wide S3 Block Public Access be enforced via SCP rather than relying on per-bucket settings alone?',
      'What alerting threshold catches unusual `ListObjectsV2` spikes on sensitive archival buckets?',
    ],
    recommendedNextLessonIds: ['k8s-hardening', 'devsecops-cicd', 'infosec-frameworks'],
  },
  {
    id: 'capstone-forensics-triage',
    code: 'D',
    title: 'Digital Forensics & Malware Triage: Memory & Artifact Acquisition',
    roleTitle: 'DFIR & Malware Triage Analyst',
    difficulty: 'advanced',
    estimatedMinutes: 40,
    xpReward: 450,
    scenarioOverview:
      'Following suspicious outbound beaconing on build server BUILD-LIN-04, responders captured a SHA-256 verified memory dump and Volatility 3 process/network/strings output. Conduct static triage and document forensic findings safely.',
    objectives: [
      'Verify forensic chain-of-custody via SHA-256 acquisition hashes before analysis.',
      'Spot unlinked or masquerading processes and suspicious outbound network sockets in Volatility 3.',
      'Interpret safe string indicators and draft accurate defensive YARA triage conditions.',
      'Compile a court/IR-ready forensic triage report preserving integrity.',
    ],
    prerequisiteLessonIds: ['dig-forensics', 'malware-triage'],
    recommendedLessonIds: ['static-analysis', 'dynamic-analysis'],
    backgroundBriefing:
      'Server `BUILD-LIN-04` (Ubuntu Linux) compiles nightly packages in CI. Approved daemon processes run from `/usr/sbin` or `/usr/bin` as non-temp executables. Volatile RAM was captured to `build-lin-04.lime` with initial acquisition hash `9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08`.',
    evidenceArtifacts: [
      {
        id: 'cap-d-art-volatility',
        title: 'Volatility 3 Memory Triage Output (pslist + netscan)',
        kind: 'memory',
        summary: 'Synthetic Volatility 3 output from `build-lin-04.lime` showing processes and sockets.',
        targetLineCount: 2,
        targetLineNumbers: [3, 6],
        evidenceHints: [
          'Compare binary execution path against standard Linux directories (`/usr/bin`, `/sbin`) vs `/dev/shm` or `(deleted)`.',
          'Match the anomalous PID to active external ESTAB connections.',
        ],
        content: [
          '1 | [pslist] PID=1    | PPID=0   | Comm=systemd      | Path=/usr/lib/systemd/systemd',
          '2 | [pslist] PID=812  | PPID=1   | Comm=sshd         | Path=/usr/sbin/sshd',
          '3 | [pslist] PID=3318 | PPID=812 | Comm=[kworker/u9] | Path=/dev/shm/.pulse-upd (deleted)',
          '4 | [pslist] PID=3402 | PPID=1   | Comm=dockerd      | Path=/usr/bin/dockerd',
          '5 | [netscan] PID=812 | Proto=TCP | Local=10.12.4.20:22   | Foreign=10.12.1.5:51422   | State=ESTABLISHED',
          '6 | [netscan] PID=3318| Proto=TCP | Local=10.12.4.20:49102| Foreign=198.51.100.77:8443| State=ESTABLISHED',
          '7 | [netscan] PID=3402| Proto=TCP | Local=10.12.4.20:443  | Foreign=0.0.0.0:*         | State=LISTEN',
        ].join('\n'),
      },
      {
        id: 'cap-d-art-static',
        title: 'Acquisition Custody & Recovered Binary Strings Triage',
        kind: 'config',
        summary: 'SHA-256 verification ledger and extracted ASCII strings from recovered ELF image of PID 3318.',
        targetLineCount: 2,
        targetLineNumbers: [2, 5],
        evidenceHints: [
          'Verify whether working copy hash matches original evidence acquisition hash.',
          'Identify persistence/beaconing strings inside the recovered binary.',
        ],
        content: [
          '1 | Custody-Orig  | build-lin-04.lime      | sha256=9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          '2 | Custody-Work  | build-lin-04-copy.lime | sha256=a1110000bbbb2222cccc3333dddd4444eeee5555ffff66667777888899990000 (MISMATCH WARNING)',
          '3 | Section-Hash  | .text SHA-256 verified against clean write-blocked read-only mount',
          '4 | Strings-Benign| /lib/x86_64-linux-gnu/libc.so.6, GCC: (Ubuntu 13.2.0)',
          '5 | Strings-Susp  | "/dev/shm/.pulse-upd", "X-Beacon-Host: 198.51.100.77:8443", "/etc/cron.d/.syshealth"',
        ].join('\n'),
      },
    ],
    stages: [
      {
        id: 'dfir-stage-1',
        order: 1,
        title: 'Stage 1: Memory Process & Socket Triage',
        objective: 'Spot kernel-thread masquerading and unlinked binary network connections in RAM.',
        guidance:
          'Genuine Linux kernel threads (`kworker`) have PPID 2 (`kthreadd`) and no user-space executable path on disk. A user-space binary named `[kworker/u9]` running from `/dev/shm/.pulse-upd (deleted)` under `sshd` (PPID 812) is classic masquerading.',
        practicalTaskPrompt:
          'Inspect "Volatility 3 Memory Triage Output (pslist + netscan)" and flag the 2 lines identifying the masquerading deleted binary and its external C2 socket.',
        evidenceArtifactIds: ['cap-d-art-volatility'],
        xpReward: 75,
        knowledgeCheck: {
          id: 'dfir-kc-1',
          prompt:
            'Why is `PID 3318` named `[kworker/u9]` immediately identifiable as user-space masquerading in `pslist`?',
          options: [
            'Legitimate `kworker` kernel threads run under `kthreadd` (PPID 2) with no file path, whereas PID 3318 descends from `sshd` (PPID 812) and executes an unlinked binary out of `/dev/shm`.',
            'Kernel threads always listen on TCP port 8443 under `netscan`.',
            'Ubuntu servers disable `sshd` whenever `dockerd` is active.',
            '`/dev/shm` is an immutable read-only BIOS firmware partition.',
          ],
          correctIndex: 0,
          partialCreditIndices: [],
          optionFeedback: [
            'Exact! Kernel thread naming (`[kworker...]`) paired with a deleted `/dev/shm` user-space binary and `sshd` parent process proves masquerading and anti-forensic unlinking.',
            'Incorrect: Kernel threads operate inside kernel space without external C2 user-space sockets.',
            'Incorrect: `sshd` and `dockerd` routinely coexist cleanly.',
            'Incorrect: `/dev/shm` is world-writable shared memory tmpfs often abused for fileless/memory-resident staging.',
          ],
          explanation:
            'Correlating PPID (`sshd`), unlinked tmpfs path (`/dev/shm/.pulse-upd (deleted)`), and active ESTAB connection to `198.51.100.77:8443` confirms live compromise despite disk unlinking.',
          reviewLessonId: 'dig-forensics',
        },
      },
      {
        id: 'dfir-stage-2',
        order: 2,
        title: 'Stage 2: Chain-of-Custody & Static Indicators',
        objective: 'Protect evidence integrity and extract actionable detection indicators.',
        guidance:
          'Never run analysis directly on the sole evidence original or a corrupted working copy whose SHA-256 hash disagrees with the acquisition hash. Validated static indicators feed defensive YARA/EDR rules safely.',
        practicalTaskPrompt:
          'Inspect "Acquisition Custody & Recovered Binary Strings Triage" and select the 2 lines highlighting the corrupted working copy hash and high-signal persistence/C2 strings.',
        evidenceArtifactIds: ['cap-d-art-static'],
        xpReward: 75,
        knowledgeCheck: {
          id: 'dfir-kc-2',
          prompt:
            'When `build-lin-04-copy.lime` produces a mismatched SHA-256 hash against the acquisition ledger, what MUST the analyst do first?',
          options: [
            'Quarantine/discard the corrupted copy and re-verify a fresh read-only working copy from the write-blocked original evidence before drawing legal or formal findings.',
            'Edit the acquisition log to match the new hash so documentation stays consistent.',
            'Continue analyzing only the `.text` strings and ignore the hash mismatch.',
            'Run `chmod 777` on the original `.lime` evidence file.',
          ],
          correctIndex: 0,
          partialCreditIndices: [],
          optionFeedback: [
            'Spot on! Chain of custody demands discarding/re-imaging any copy whose SHA-256 fails verification against the write-blocked acquisition hash.',
            'CRITICAL ERROR: Altering forensic hashes invalidates chain of custody and compromises incident credibility.',
            'Incorrect: Corrupted disk/memory copies risk missing or distorted structures.',
            'Incorrect: Write permissions risk modifying primary forensic evidence.',
          ],
          explanation:
            'Cryptographic hash verification (SHA-256) proves evidence remained bit-identical from acquisition through analysis; any mismatch invalidates that working copy immediately.',
          reviewLessonId: 'malware-triage',
        },
      },
      {
        id: 'dfir-stage-3',
        order: 3,
        title: 'Stage 3: YARA Detection & Forensic Report Sign-Off',
        objective: 'Translate recovered indicators into durable defensive detections and remediation actions.',
        guidance:
          'Combine benign compiler metadata exclusions with high-signal IOCs (`/etc/cron.d/.syshealth`, `X-Beacon-Host`, `/dev/shm/.pulse-upd`) and verify cron persistence removal across fleet hosts.',
        practicalTaskPrompt:
          'Verify custody & memory findings across Stages 1–2, pass the stage check, and submit your DFIR Triage Report.',
        evidenceArtifactIds: ['cap-d-art-volatility', 'cap-d-art-static'],
        xpReward: 75,
        knowledgeCheck: {
          id: 'dfir-kc-3',
          prompt:
            'Why is matching only `"libc.so.6"` inside a defensive YARA rule completely ineffective for fleet hunting?',
          options: [
            'Common standard library strings appear in nearly every benign Linux ELF binary, creating massive false positives instead of isolating unique malware indicators.',
            'YARA cannot match ASCII strings in ELF executables.',
            'Cron jobs execute before YARA rules initialize.',
            'SHA-256 hashes strip all strings from `.text` segments.',
          ],
          correctIndex: 0,
          partialCreditIndices: [],
          optionFeedback: [
            'Correct! Effective YARA signatures pair specific unique strings (`X-Beacon-Host`, `/etc/cron.d/.syshealth`, `/dev/shm/.pulse-upd`) rather than ubiquitous compiler/libc strings.',
            'Incorrect: YARA natively scans ASCII/wide strings across PE and ELF files.',
            'Incorrect: Hunting rules match artifacts regardless of schedule time.',
            'Incorrect: SHA-256 is a read-only checksum and leaves binaries unmodified.',
          ],
          explanation:
            'High-fidelity detection engineering combines unique C2/persistence artifacts and behavioral `/dev/shm` alerts while avoiding broad compiler noise.',
          reviewLessonId: 'malware-triage',
        },
      },
    ],
    submissionRequirements: [
      'Explain PID 3318 (`[kworker/u9]`) masquerading, `/dev/shm/.pulse-upd (deleted)` execution, and outbound connection to `198.51.100.77:8443`.',
      'Address the SHA-256 hash mismatch on `build-lin-04-copy.lime` and mandatory write-blocked custody handling.',
      'Document persistence indicator `/etc/cron.d/.syshealth` and why benign compiler strings are excluded from YARA.',
      'Recommend host isolation, cron persistence cleanup, SSH audit, and network IOC blocking.',
    ],
    deliverableTemplate: {
      title: 'DFIR & Malware Triage Analytical Report',
      instructions:
        'Present verified memory findings, chain-of-custody verification controls, IOCs, and eradication/detection steps.',
      minimumCharacters: 180,
      sections: [
        {
          key: 'executiveSummary',
          label: '1. Chain of Custody & Integrity Status',
          prompt: 'Verify original SHA-256 integrity and address handling of the mismatched copy.',
          placeholder: 'Original build-lin-04.lime verified (9f86d08...); corrupted copy discarded before re-cloning read-only...',
        },
        {
          key: 'memoryFindings',
          label: '2. Memory Forensics & Masquerading Findings',
          prompt: 'Detail PID 3318, PPID 812 (sshd), deleted /dev/shm path, and 198.51.100.77:8443 socket.',
          placeholder: 'PID 3318 masqueraded as [kworker/u9] under sshd, executing unlinked /dev/shm/.pulse-upd with ESTAB socket to 198.51.100.77:8443...',
        },
        {
          key: 'staticAndDetection',
          label: '3. Static IOCs & YARA Engineering',
          prompt: 'Cite /etc/cron.d/.syshealth and X-Beacon-Host while rejecting libc false positives.',
          placeholder: 'Alert on /etc/cron.d/.syshealth and X-Beacon-Host strings; exclude generic libc/GCC compiler strings...',
        },
        {
          key: 'remediation',
          label: '4. Eradication & Fleet Hunting Plan',
          prompt: 'Outline host containment, cron persistence purge, sshd key/auth review, and firewall block.',
          placeholder: 'Isolate BUILD-LIN-04, remove /etc/cron.d/.syshealth, block 198.51.100.77:8443, rotate SSH keys, sweep CI fleet with YARA...',
        },
      ],
    },
    rubricCriteria: [
      {
        id: 'dfir-rub-1',
        label: 'Chain-of-Custody Rigor',
        maxPoints: 25,
        description: 'Addresses SHA-256 mismatch and read-only write-blocked evidence integrity.',
        expectedKeywords: ['sha256', 'mismatch', 'custody', 'read-only'],
      },
      {
        id: 'dfir-rub-2',
        label: 'Volatility Memory Analysis',
        maxPoints: 25,
        description: 'Identifies PID 3318, masquerading [kworker/u9], deleted /dev/shm binary, and C2 socket.',
        expectedKeywords: ['3318', 'kworker', '/dev/shm', '198.51.100.77'],
      },
      {
        id: 'dfir-rub-3',
        label: 'Static IOC & Detection Quality',
        maxPoints: 25,
        description: 'Extracts cron persistence + C2 header indicators and builds selective YARA guidance.',
        expectedKeywords: ['cron', 'x-beacon-host', 'yara', 'libc'],
      },
      {
        id: 'dfir-rub-4',
        label: 'Eradication & Hardening',
        maxPoints: 25,
        description: 'Covers isolating host, SSH audit, blocking IOCs, and CI fleet sweeping.',
        expectedKeywords: ['isolate', 'ssh', 'block', 'cron'],
      },
    ],
    detailedSolutionExplanation:
      'DFIR Walkthrough: Forensic integrity began by catching the SHA-256 mismatch on `build-lin-04-copy.lime` and reverting to a clean read-only copy of `build-lin-04.lime` (`9f86d08...`). Volatility 3 `pslist` exposed `PID 3318` masquerading as kernel thread `[kworker/u9]`, betrayed by `PPID 812` (`sshd`) and its deleted user-space path `/dev/shm/.pulse-upd (deleted)`. `netscan` tied `PID 3318` directly to an established C2 socket to `198.51.100.77:8443`. Extracted binary strings revealed persistence via `/etc/cron.d/.syshealth` and C2 header `X-Beacon-Host`. Eradication requires host isolation, clearing cron persistence, auditing `sshd` authorized keys/logs, blocking `198.51.100.77`, and deploying a YARA rule targeting those unique strings (excluding common `libc.so.6`/`GCC` markers).',
    reflectionPrompts: [
      'Why does Linux allow a running process to keep executing from RAM even after `rm` deletes its path from `/dev/shm`?',
      'Which preventive OS controls (`noexec` mount options on `/dev/shm` and `/tmp`) harden CI build hosts against fileless drops?',
    ],
    recommendedNextLessonIds: ['c-memory-foundations', 'debugger-tools', 'incident-response'],
  },
];
