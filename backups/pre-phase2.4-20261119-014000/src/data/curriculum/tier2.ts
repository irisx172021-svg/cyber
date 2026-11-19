import { Tier } from '../../types';

export const tier2: Tier = {
  id: 'tier-2',
  number: 2,
  title: 'Defensive Security',
  description: 'Master threat modeling, incident triaging, detection engineering, SIEM queries, digital forensics, and endpoint defense systems.',
  topics: [
    {
      id: 'sec-fundamentals',
      title: 'Security Fundamentals',
      category: 'defense',
      lessons: [
        {
          id: 'def-aaa-cia',
          title: 'Defensive Frameworks & AAA',
          description: 'Harden environments using the CIA Triad and standard AAA access management models.',
          duration: '15 mins',
          content: `### Defensive Frameworks & AAA

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Network Topologies, OSI & TCP/IP Reference models, Access Control & Permissions (chmod, chown, sudo)  

#### Learning Objectives
- Analyze system failures across the CIA Triad: Confidentiality, Integrity, and Availability.
- Distinguish Authentication, Authorization, and Accounting (AAA) in operational access control.
- Apply the Principle of Least Privilege and multi-factor authentication (MFA) factors to harden accounts.

#### Why It Matters
Every defensive control—from firewall rules to file permissions and audit pipelines—maps back to two foundational models: what property of data we are protecting (CIA Triad) and how we enforce and record identity decisions (AAA). Mastering these concepts lets you articulate why a control exists and detect missing defensive layers immediately.

#### Prerequisites & Connections
This module builds on **Network Topologies, OSI & TCP/IP Reference models** and **Access Control & Permissions (chmod, chown, sudo)**, uniting network and OS permissions into a unified security framework. It directly unlocks **Authentication, Sessions & Identity Protocols**, **Risk Management & Threat Modeling**, and later GRC and cloud security modules.

#### Core Explanation
Two timeless models underpin defensive security engineering:
- **The CIA Triad:**
  - **Confidentiality:** Preventing unauthorized disclosure of sensitive data (enforced via encryption and access controls).
  - **Integrity:** Preventing unauthorized or undetected alteration of data and system configurations (verified via hashes, digital signatures, and write restrictions).
  - **Availability:** Ensuring authorized users reliably reach systems and data when needed (disrupted by ransomware encryption, DDoS floods, or hardware outages).
- **The AAA Model:**
  - **Authentication:** Verifying identity claims using independent factor categories: *something you know* (passwords/PINs), *something you have* (hardware keys/smartcards), and *something you are* (biometrics).
  - **Authorization:** Enforcing what an authenticated identity may read, modify, or execute under the **Principle of Least Privilege**.
  - **Accounting:** Writing tamper-evident audit logs recording who accessed which resource and when.

#### How It Works
When an engineer signs in to an administration console, **Authentication** checks both a password and a cryptographic biometric/FIDO2 prompt (MFA), **Authorization** evaluates role-based permissions to grant only read/write access needed for their service team (Least Privilege), and **Accounting** writes an immutable timestamped event log to centralized SIEM storage so unauthorized actions remain traceable.

#### Real-World Context
Consider a hospital hit by ransomware that locks patient scheduling databases without stealing records: confidentiality may or may not be breached depending on exfiltration, while **Availability** is immediately devastated because clinicians cannot access critical schedules. Immutable offline backups protect availability, while Least Privilege prevents a single compromised phishing account from encrypting shared servers.

#### Examples
Mapping common technical safeguards to CIA and AAA:
\`\`\`yaml
account_policy_baseline:
  authentication:
    factors_required: ["Something you know (Password)", "Something you have (FIDO2 key)"]
  authorization:
    model: "RBAC + Principle of Least Privilege"
    admin_standing_access: false
  accounting:
    events_logged: ["login_success", "login_failure", "role_escalation", "policy_change"]
    storage: "Append-only central SIEM"
\`\`\`

#### Security Relevance
- **Defensive Value:** Separating Authentication, Authorization, and Accounting ensures that compromising a single layer (such as stealing a password) cannot silently escalate privileges without detection.
- **Attacker Misuse:** Adversaries routinely exploit overly permissive standing rights (violating Least Privilege) or disable host audit logs (blinding Accounting) immediately after initial access.

#### Common Mistakes
- Confusing **Authentication** (proving who you are) with **Authorization** (deciding what you are permitted to access).
- Assuming passwords alone protect remote portals without phishing-resistant MFA.
- Enabling strong authentication and permissions while leaving Accounting/audit logging off, making post-incident reconstruction impossible.

#### Key Takeaways
- **Confidentiality, Integrity, and Availability** define the three core security properties every control safeguards.
- **Authentication, Authorization, and Accounting (AAA)** govern identity verification, **Least Privilege** enforcement, and immutable **audit trails**.
- Strong multi-factor authentication combines distinct factor categories (know, have, are).

#### Knowledge Check
- Which CIA Triad pillar is directly attacked when ransomware encrypts critical databases, and which control restores it cleanly?
- Why is a fingerprint scan classified as "something you are" rather than "something you have"?
- How do Least Privilege and Accounting limit the blast radius of a stolen credential?

#### Further Learning
Review NIST SP 800-53 Access Control (AC) and Audit & Accountability (AU) control families to see how AAA scales to enterprise programs.`,
          quiz: [
            {
              id: 'q-cia-1',
              question: 'Which pillar of the CIA Triad is compromised when a ransomware attack encrypts a critical corporate database?',
              options: [
                "Confidentiality",
                "Integrity",
                "Availability",
                "Accountability"
              ],
              correctOption: 2,
              explanation: 'Ransomware compromises Availability by denying users access to critical systems and data until a ransom is paid.'
            },
            {
              id: 'q-cia-2',
              question: 'What is the role of "Accounting" in the AAA security model?',
              options: [
                "Verifying user passwords against stored directory hashes",
                "Assigning least-privilege read/write folder permissions",
                "Enforcing hardware token multi-factor login challenges",
                "Recording user actions and changes in audit logs"
              ],
              correctOption: 3,
              explanation: 'Accounting tracks resource consumption and user actions, maintaining a comprehensive audit log for security reviews.'
            },
            {
              id: 'q-cia-3',
              question: 'Which authentication factor category does a fingerprint scan fall under?',
              options: [
                "Something you have",
                "Something you are",
                "Somewhere you are",
                "Something you know"
              ],
              correctOption: 1,
              explanation: 'Biometric identifiers like fingerprints and facial recognition are categorized as "something you are".'
            },
            {
              id: 'q-cia-4',
              question: 'Which principle limits user access permissions to only the minimum necessary to complete their specific job functions?',
              options: [
                "Principle of Least Privilege",
                "Separation of Duties",
                "Implicit Allow",
                "Defense in Depth"
              ],
              correctOption: 0,
              explanation: 'The Principle of Least Privilege limits user rights to only the minimal resources required for their role, reducing potential damage from account compromise.'
            }
          ]
        },
        {
          id: 'auth-sessions-id',
          title: 'Authentication, Sessions & Identity Protocols',
          description: 'Master secure password hashing, HttpOnly cookie sessions, JWTs, OAuth 2.1 with PKCE, OIDC, and FIDO2/WebAuthn.',
          duration: '20 mins',
          content: `### Authentication, Sessions & Identity Protocols

**Difficulty:** Intermediate  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** Defensive Frameworks & AAA, HTTP, Web Architecture & Browser Trust  

#### Learning Objectives
- Explain why password storage requires salted, memory-hard hashing such as Argon2id rather than plain SHA-256.
- Compare server-validated HttpOnly cookies against signed stateless tokens (JWTs) and assess XSS/CSRF tradeoffs.
- Contrast OAuth 2.1 (authorization with mandatory PKCE) against OpenID Connect (authentication) and phishing-resistant FIDO2/WebAuthn.

#### Why It Matters
Almost every modern breach involves abused credentials, hijacked session cookies, or broken single sign-on flows. Understanding how browsers store credentials, how backend apps verify sessions, and how OAuth 2.1 and WebAuthn bind cryptographic trust is essential before analyzing web vulnerabilities, cloud IAM, or CI/CD federation.

#### Prerequisites & Connections
This module bridges **Defensive Frameworks & AAA** and **HTTP, Web Architecture & Browser Trust**. It provides the essential foundation for **Web Technologies & OWASP Top 10**, **AWS Identity & Storage Security**, **Microsoft Azure Security**, and **DevSecOps, Secure SDLC & CI/CD Pipelines**.

#### Core Explanation
Modern identity systems span four complementary layers:
- **Credential Verification at Rest:** Servers must never store plaintext passwords or fast unsalted digests. Algorithms like **Argon2id** (preferred by OWASP), **bcrypt**, or salted **scrypt** inject unique per-user salts and high memory/CPU work factors to defeat rainbow tables and GPU cracking.
- **Session State Maintenance:** Because HTTP is stateless, logins issue either:
  - **Opaque Session Cookies** paired with \`HttpOnly\` (blocks JavaScript \`document.cookie\` theft via XSS), \`Secure\` (HTTPS only), and \`SameSite=Lax\` / \`Strict\` (mitigates CSRF), or
  - **JSON Web Tokens (JWTs)** carrying signed claims (\`Header.Payload.Signature\`), which must verify explicit allowed algorithms on the server and remain short-lived because stateless tokens cannot be trivially revoked mid-flight without blocklists.
- **Delegated Authorization vs. Federated Identity:**
  - **OAuth 2.1** grants scoped third-party API authorization using **Authorization Code + PKCE** (Proof Key for Code Exchange), deprecating insecure Implicit grants and plaintext bearer redirects.
  - **OpenID Connect (OIDC)** builds an identity layer atop OAuth 2.0/2.1, issuing a signed \`ID Token\` proving *who* signed in.
- **Phishing-Resistant MFA (FIDO2 / WebAuthn):** Cryptographic asymmetric passkeys bind authentication signatures strictly to the verified origin domain, defeating adversary-in-the-middle (AitM) phishing proxies that easily intercept SMS OTPs or push prompts.

#### How It Works
During a federated OIDC login, the client generates a random \`code_verifier\` and hashes it into a \`code_challenge\` (PKCE). After the user authenticates at the Identity Provider (IdP)—ideally via a domain-bound WebAuthn passkey—the IdP returns a short-lived authorization \`code\`. The client backend exchanges \`code\` + \`code_verifier\` directly over TLS to obtain signed tokens, then sets an \`HttpOnly; Secure; SameSite=Lax\` session cookie on the user's browser.

#### Real-World Context
When enterprises only enforce legacy SMS or TOTP 6-digit codes, reverse-proxy phishing kits capture both the user's password and one-time code, immediately stealing the resulting session cookie. Migrating high-value engineering and admin accounts to WebAuthn security keys stops credential relay because the browser refuses to sign a challenge for a spoofed phishing domain.

#### Examples
Inspecting hardened authentication cookie attributes vs. an OAuth 2.1 PKCE authorization flow:
\`\`\`http
HTTP/1.1 200 OK
Set-Cookie: cfa_session=eyJhbGciOi...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600
Content-Type: application/json
\`\`\`
\`\`\`text
OAuth 2.1 Authorization Code + PKCE Flow:
  Client App --(1. GET /authorize + code_challenge=SHA256(verifier))--> IdP
  Client App <--(2. 302 Redirect ?code=xyz123)-------------------------- IdP
  Client App --(3. POST /token: code=xyz123 + code_verifier)----------> IdP
  Client App <--(4. Verified Access Token + OIDC ID Token)------------- IdP
\`\`\`

#### Security Relevance
- **Defensive Value:** Combining Argon2id hashing, \`HttpOnly\` + \`SameSite\` session cookies with CSRF tokens, OAuth 2.1 PKCE, and WebAuthn eliminates entire classes of credential stuffing, session theft, and phishing relay attacks.
- **Attacker Misuse:** Threat actors exploit JWTs stored in browser \`localStorage\` (exposed to any XSS script), weak JWT signature verification (\`alg: none\` or HMAC confusion), missing OAuth \`state\`/PKCE validation, and legacy authentication endpoints that skip MFA.

#### Common Mistakes
- Storing sensitive session JWTs in \`localStorage\` instead of \`HttpOnly; Secure\` cookies.
- Confusing **OAuth** (scoped API authorization) with **OIDC** (user identity authentication).
- Using fast SHA-256 directly for password hashing instead of slow, salted, memory-hard **Argon2id** or **scrypt**.
- Ignoring **CSRF** protections on state-changing cookie-authenticated endpoints.

#### Key Takeaways
- Hash passwords with unique salts using **Argon2id**, **scrypt**, or **bcrypt**—never fast raw hashes.
- Protect browser sessions with \`HttpOnly\`, \`Secure\`, \`SameSite\` cookies plus CSRF tokens.
- Use **OAuth 2.1 with PKCE** for API authorization, **OIDC** for federated login, and **WebAuthn/FIDO2** for phishing-resistant MFA.

#### Knowledge Check
- Why does \`HttpOnly\` protect a session cookie from theft via JavaScript XSS, yet still require CSRF defenses?
- How does PKCE protect an OAuth 2.1 authorization code even if another app intercepts the redirect URI?
- Why can't an adversary-in-the-middle phishing proxy relay a WebAuthn passkey assertion to the real corporate IdP?

#### Further Learning
Read the OWASP Session Management and Password Storage Cheat Sheets alongside the IETF OAuth 2.1 and W3C WebAuthn specifications.`,
          quiz: [
            {
              id: 'q-asi-1',
              question: 'Why must web applications store passwords using salted Argon2id or bcrypt rather than unsalted SHA-256?',
              options: [
                "Plain SHA-256 hashes exceed standard relational database VARCHAR lengths.",
                "Memory-hard salted KDFs slow down GPU cracking and block rainbow tables.",
                "Browsers automatically block login forms targeting SHA-256 backend endpoints.",
                "Argon2id allows administrators to decrypt stored user passwords during resets."
              ],
              correctOption: 1,
              explanation: 'SHA-256 is optimized for speed and can be tested at billions of guesses per second on GPUs. Salted Argon2id and bcrypt add unique salts and tunable memory/CPU cost to resist offline cracking.'
            },
            {
              id: 'q-asi-2',
              question: 'Which cookie flag prevents client-side JavaScript from reading a session cookie via document.cookie?',
              options: [
                "SameSite=Lax",
                "Path=/",
                "Secure",
                "HttpOnly"
              ],
              correctOption: 3,
              explanation: 'The HttpOnly attribute instructs the browser never to expose the cookie to JavaScript APIs like document.cookie, protecting session identifiers against XSS exfiltration.'
            },
            {
              id: 'q-asi-3',
              question: 'In OAuth 2.1, what security flaw does mandatory PKCE (Proof Key for Code Exchange) mitigate?',
              options: [
                "Authorization code interception and unauthorized token exchange",
                "Weak TLS 1.0 symmetric cipher negotiation between servers",
                "Unencrypted password transmission inside HTTP Basic headers",
                "Excessive database CPU usage during SQL join queries"
              ],
              correctOption: 0,
              explanation: 'PKCE binds the authorization request to the subsequent token exchange using a hashed challenge and verifier, preventing an attacker who intercepts the authorization code from redeeming it.'
            },
            {
              id: 'q-asi-4',
              question: 'Why are FIDO2 / WebAuthn passkeys considered phishing-resistant compared to SMS or 6-digit TOTP codes?',
              options: [
                "They embed the user password inside an unencrypted browser header.",
                "They bypass TLS certificate validation on internal login portals.",
                "Cryptographic origin binding blocks signing for spoofed domains.",
                "They rotate six-digit numerical codes every five milliseconds."
              ],
              correctOption: 2,
              explanation: 'WebAuthn authenticators cryptographically bind challenges to the exact TLS origin verified by the browser, so an adversary phishing proxy on an impersonating domain cannot obtain a valid assertion for the real site.'
            }
          ]
        },
        {
          id: 'risk-threat-model',
          title: 'Risk Management & Threat Modeling',
          description: 'Apply threat modeling methodologies and establish vulnerability remediation registers.',
          duration: '18 mins',
          content: `### Risk Management & Threat Modeling

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Defensive Frameworks & AAA  

#### Learning Objectives
- Apply the four-question threat modeling workflow and classify threats using the **STRIDE** framework.
- Evaluate organizational risk severity systematically via **Likelihood x Impact**.
- Map identified threats directly to architectural mitigations and verification checks.

#### Why It Matters
Patching software after an outage is far more expensive than catching missing authentication or broken trust boundaries on a whiteboard. Threat modeling embeds defensive engineering into system design before code reaches production, while risk assessment focuses limited engineering hours on the failures that threaten the business most.

#### Prerequisites & Connections
Building directly on **Defensive Frameworks & AAA**, this module maps CIA Triad and AAA guarantees onto concrete architecture diagrams. It directly unlocks **Vulnerability Management & Patching Prioritization** and informs **Information Security Frameworks** in Tier 8.

#### Core Explanation
Structured risk engineering combines two disciplined practices:
- **Threat Modeling (STRIDE):** Microsoft's **STRIDE** mnemonic inspects every trust boundary in a data-flow diagram:
  - **S**poofing (impersonating users or services -> mitigate with Authentication)
  - **T**ampering (modifying data in transit or at rest -> mitigate with Integrity/HMAC/signatures)
  - **R**epudiation (denying performed actions -> mitigate with immutable Accounting logs)
  - **I**nformation Disclosure (leaking sensitive data -> mitigate with Encryption & Authorization)
  - **D**enial of Service (exhausting availability -> mitigate with rate limits, quotas, redundancy)
  - **E**levation of Privilege (gaining unauthorized rights -> mitigate with Least Privilege)
- **Risk Assessment:** Evaluates identified scenarios using **Likelihood x Impact** matrices, weighing control gaps, asset criticality, and business exposure before selecting whether to mitigate, transfer, accept, or avoid a risk.

#### How It Works
Engineers walk through four standard threat modeling questions: *1. What are we building?* (draw components and trust boundaries), *2. What can go wrong?* (apply STRIDE per boundary), *3. What are we going to do about it?* (specify controls and open risk tickets), and *4. Did we do a good enough job?* (verify controls in tests and post-release reviews).

#### Real-World Context
Before launching a new internal billing microservice, a platform team reviews the Data Flow Diagram and spots that an internal worker queue crosses a trust boundary without message signatures or sender authentication. Applying STRIDE early flags **Spoofing** and **Tampering** threats, prompting the team to add mTLS service identities and schema validation prior to deployment.

#### Examples
Mapping STRIDE categories onto a single web API upload feature:
\`\`\`text
Trust Boundary Threat Audit (STRIDE) — File Export API
------------------------------------------------------
[S] Spoofing               -> Enforce signed session / OIDC JWT verification on every call
[T] Tampering              -> Verify SHA-256 checksum & authorize record ownership server-side
[R] Repudiation            -> Write structured audit event (actorId, objectId, timestamp)
[I] Information Disclosure -> Strip internal stack traces; enforce HTTPS & presigned short TTLs
[D] Denial of Service      -> Enforce per-user rate limits and max export row caps
[E] Elevation of Privilege -> Reject client-supplied role flags; verify tenant scope in DB query
\`\`\`

#### Security Relevance
- **Defensive Value:** Finding design-level flaws (like missing tenant authorization checks) during threat modeling eliminates vulnerabilities that automated scanners cannot detect.
- **Attacker Misuse:** Attackers naturally look for unmodeled implicit trust boundaries—such as internal APIs assuming only the frontend calls them directly, or cloud metadata endpoints reachable from user-supplied URLs.

#### Common Mistakes
- Confusing **Risk** (Likelihood x Impact of loss) with a **Vulnerability** list alone without business context.
- Performing threat modeling once years ago while shipping weekly architecture changes unreviewed.
- Relying on undocumented "internal network" trust instead of enforcing controls at every trust boundary.

#### Key Takeaways
- **STRIDE** systematically uncovers Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, and Elevation of Privilege threats.
- Risk matrices combine **Likelihood** and **Impact** so teams mitigate critical exposure first.
- Every identified threat should link to a concrete defensive control or tracked risk decision.

#### Knowledge Check
- Which STRIDE category corresponds directly to a failure in non-repudiating Accounting logs?
- Why does a Data Flow Diagram highlight trust boundaries—such as browser-to-API or service-to-database—before checking code lines?
- How does vulnerability scanning complement rather than replace architecture threat modeling?

#### Further Learning
Explore the OWASP Threat Modeling Project and practice walking through the "Four Questions" on an existing system architecture diagram.`,
          quiz: [
            {
              id: 'q-tm-1',
              question: 'Which STRIDE category represents the threat of an attacker modifying database records without authorization?',
              options: [
                "Spoofing",
                "Tampering",
                "Repudiation",
                "Information Disclosure"
              ],
              correctOption: 1,
              explanation: 'Tampering is the unauthorized alteration of data or system parameters, directly compromising Integrity.'
            },
            {
              id: 'q-tm-2',
              question: 'Under STRIDE, what threat is directly mitigated by implementing robust, non-repudiation logging systems?',
              options: [
                "Repudiation",
                "Spoofing",
                "Information Disclosure",
                "Denial of Service"
              ],
              correctOption: 0,
              explanation: 'Repudiation represents users denying they performed specific actions. Immutable logging ensures non-repudiation: actions can be traced to specific accounts.'
            },
            {
              id: 'q-tm-3',
              question: 'How is risk classically calculated in standard risk assessment matrices?',
              options: [
                "Asset Value / Cost of Controls",
                "Exposure Factor x Single Loss Expectancy",
                "Threat x Vulnerability x Asset Value",
                "Likelihood x Impact"
              ],
              correctOption: 3,
              explanation: 'Risk is classically evaluated by multiplying the Likelihood of an event occurring by its potential business Impact.'
            },
            {
              id: 'q-tm-4',
              question: 'What is the primary objective of running regular vulnerability scans across corporate networks?',
              options: [
                "To decrypt and archive live TLS application sessions",
                "To install unsigned OS kernel hotfixes automatically overnight",
                "To spot known CVEs and misconfigurations before exploitation",
                "To absorb volumetric distributed denial-of-service floods inline"
              ],
              correctOption: 2,
              explanation: 'Vulnerability scanners sweep systems to locate unpatched services, default configurations, and other security vulnerabilities.'
            }
          ]
        },
        {
          id: 'vuln-management',
          title: 'Vulnerability Management & Patching Prioritization',
          description: 'Master CVEs, CWEs, CVSS v4.0 severity scoring, EPSS exploit prediction, CISA KEV triage, and risk-based remediation SLAs.',
          duration: '18 mins',
          content: `### Vulnerability Management & Patching Prioritization

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Risk Management & Threat Modeling  

#### Learning Objectives
- Distinguish vulnerability identifiers (**CVE**), weakness classes (**CWE**), and scoring/prioritization systems (**CVSS v4.0**, **EPSS**, **CISA KEV**).
- Prioritize remediation effectively by combining exploitability intelligence with asset exposure and business criticality.
- Design structured vulnerability management lifecycles with realistic SLAs, compensating controls, and verification scans.

#### Why It Matters
Enterprise vulnerability scanners routinely report thousands of CVEs across workstations, containers, and cloud APIs. Trying to patch everything simultaneously paralyzes operations—whereas patching solely by raw Base CVSS score wastes effort on unexploited theoretical bugs while missing actively exploited flaws. Risk-based prioritization keeps defenses ahead of real adversaries.

#### Prerequisites & Connections
This module builds directly on **Risk Management & Threat Modeling**, turning Likelihood x Impact analysis into concrete operational patching queues. It prepares you for **SOC Triage & Lifecycle**, **Active Reconnaissance & Port Scanning**, **DevSecOps, Secure SDLC & CI/CD Pipelines**, and **Regulatory Compliance Standards**.

#### Core Explanation
Effective vulnerability management relies on standardized industry vocabularies and prioritization signals:
- **CVE (Common Vulnerabilities and Exposures):** Unique public identifier (e.g., \`CVE-2024-XXXX\`) tracking a specific security flaw in a software product, enriched with advisories in databases like NVD.
- **CWE (Common Weakness Enumeration):** Categorizes the underlying software bug class (such as \`CWE-89\` SQL Injection or \`CWE-787\` Out-of-Bounds Write).
- **CVSS v4.0 (Common Vulnerability Scoring System):** Measures technical severity (0.0–10.0) across **Base**, **Threat**, **Environmental**, and **Supplemental** metric groups—explicitly accounting for attack requirements, user interaction, and downstream exposure.
- **EPSS (Exploit Prediction Scoring System):** Estimates the probability (0–100%) that a CVE will be exploited in the wild within the next 30 days.
- **CISA KEV (Known Exploited Vulnerabilities Catalog):** Authoritative list of CVEs with verified active real-world exploitation requiring accelerated remediation.

#### How It Works
A mature vulnerability management lifecycle operates continuously in six stages:
1. **Asset Discovery & Inventory:** Maintain live visibility of every endpoint, server, cloud workload, and container image.
2. **Authenticated Scanning & SCA:** Run credentialed host scanners plus Software Composition Analysis (SCA) for open-source dependencies rather than noisy unauthenticated port guesses.
3. **Risk-Based Enrichment:** Cross-reference findings with **CISA KEV**, **EPSS**, **CVSS v4.0**, and internet exposure.
4. **SLA Assignment:** Route urgent fixes (e.g., internet-facing KEV within days) to owners with clear ticketing.
5. **Remediation or Compensating Controls:** Apply vendor patches, disable vulnerable features, or restrict network ACLs if a patch window requires temporary mitigation.
6. **Verification Rescan:** Confirm the vulnerability is genuinely closed in production.

#### Real-World Context
Suppose a weekly scan surfaces two flaws: **CVE-A** has a CVSS Base 9.1 rating inside an isolated internal printer driver with 0.2% EPSS and no public exploit, while **CVE-B** has CVSS 7.8 on an internet-facing VPN gateway and appears on **CISA KEV** with high EPSS. A risk-based program escalates **CVE-B** immediately for emergency patching because active exploitation plus external exposure equals critical business risk.

#### Examples
Comparing two scanner findings inside a risk-based triage queue:
\`\`\`yaml
triage_queue:
  - cve: "CVE-2025-1001"
    asset: "vpn-edge-gw-01 (Internet-Facing)"
    cvss_v4_base: 7.8
    cisa_kev: true
    epss_30d: 0.94
    decision: "PRIORITY 1 (Emergency 48h SLA) — actively exploited perimeter gateway"
  - cve: "CVE-2025-2042"
    asset: "print-spooler-lab (Isolated VLAN, Auth Required)"
    cvss_v4_base: 8.8
    cisa_kev: false
    epss_30d: 0.004
    decision: "PRIORITY 3 (30-day Standard SLA) — low exploitation likelihood & segmented"
\`\`\`

#### Security Relevance
- **Defensive Value:** Combining asset context with **CISA KEV** and **EPSS** focuses finite patching capacity on vulnerabilities attackers are actually weaponizing today.
- **Attacker Misuse:** Threat groups routinely monitor newly published vendor advisories and KEV updates to mass-scan internet ranges within hours ("patch-gap exploitation") before organizations complete change-control cycles.

#### Common Mistakes
- Relying exclusively on unauthenticated external scans that miss vulnerable installed libraries and local packages.
- Prioritizing solely by raw CVSS Base score while ignoring internet reachability, EPSS probability, or CISA KEV status.
- Closing vulnerability tickets without running a verification rescan or accounting for running container images/reboot requirements.

#### Key Takeaways
- **CVE** identifies a specific vulnerability instance; **CWE** identifies the underlying weakness class.
- **CVSS v4.0** measures technical severity, while **EPSS** and **CISA KEV** ground remediation urgency in real-world exploitation probability and evidence.
- Risk-based prioritization pairs **exploit intelligence + asset exposure + business criticality** inside strict remediation SLAs.

#### Knowledge Check
- Why might a CVSS 7.5 flaw in an edge VPN appliance warrant faster remediation than a CVSS 9.0 flaw on an air-gapped workstation?
- What is the operational difference between a **CVE** and a **CWE**?
- Why do authenticated vulnerability scans produce cleaner, more accurate remediation backlogs than external unauthenticated probes?

#### Further Learning
Inspect the CISA Known Exploited Vulnerabilities (KEV) schema and FIRST CVSS v4.0 calculator to see how Threat and Environmental metrics adjust Base scores.`,
          quiz: [
            {
              id: 'q-vm-1',
              question: 'Which public catalog specifically tracks vulnerabilities that have confirmed evidence of active real-world exploitation?',
              options: [
                "CISA Known Exploited Vulnerabilities (KEV)",
                "OWASP Dependency-Check Format",
                "RFC 9110 HTTP Registry",
                "IANA Port Number Assignment"
              ],
              correctOption: 0,
              explanation: 'The CISA KEV catalog lists CVEs confirmed to be actively exploited in the wild, signaling immediate prioritization regardless of raw base score alone.'
            },
            {
              id: 'q-vm-2',
              question: 'What is the distinction between a CVE and a CWE?',
              options: [
                "CVE ranks patch SLA deadlines while CWE assigns network firewall rules.",
                "CVE encrypts advisory payloads while CWE hashes installed binary files.",
                "CVE identifies a specific product flaw; CWE names the weakness class.",
                "CVE applies only to cloud APIs while CWE applies solely to Linux hosts."
              ],
              correctOption: 2,
              explanation: 'A CVE (e.g., CVE-2025-XXXX) uniquely tracks a specific vulnerability in a product, whereas a CWE (e.g., CWE-89 SQL Injection) classifies the underlying weakness type.'
            },
            {
              id: 'q-vm-3',
              question: 'What metric does EPSS (Exploit Prediction Scoring System) estimate for a given CVE?',
              options: [
                "The exact financial cost of licensing an enterprise patch tool",
                "The probability of in-the-wild exploitation within 30 days",
                "The total CPU memory overhead added by an updated kernel",
                "The number of open TCP ports reachable from the public internet"
              ],
              correctOption: 1,
              explanation: 'EPSS estimates the probability (0 to 100%) that a CVE will observe exploitation activity in the wild over the next 30 days.'
            },
            {
              id: 'q-vm-4',
              question: 'Why are authenticated (credentialed) vulnerability scans preferred over unauthenticated network sweeps for internal fleets?',
              options: [
                "They skip DNS resolution and probe random external internet ranges.",
                "They automatically reimage non-compliant laptops during off-hours.",
                "They bypass enterprise SIEM pipelines without leaving any logs.",
                "They inspect installed packages and patch levels accurately locally."
              ],
              correctOption: 3,
              explanation: 'Credentialed scans check local package manifests, registry settings, and library versions directly on the host, avoiding false positives and missed flaws.'
            }
          ]
        }
      ]
    },
    {
      id: 'soc-detection',
      title: 'SOC Operations & Detection Engineering',
      category: 'defense',
      lessons: [
        {
          id: 'soc-triage',
          title: 'SOC Triage & Lifecycle',
          description: 'Map adversary actions using MITRE ATT&CK, the Cyber Kill Chain, and alert triage playbooks.',
          duration: '18 mins',
          content: `### SOC Triage & Lifecycle

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Defensive Frameworks & AAA  

#### Learning Objectives
- Classify incoming security alerts accurately as **True Positives**, **False Positives**, or **Benign True Positives**.
- Map observed adversary behaviors across the **Cyber Kill Chain** and **MITRE ATT&CK** tactics and techniques.
- Execute standardized SOC triage playbooks to verify scope and escalate verified incidents swiftly.

#### Why It Matters
A modern Security Operations Center receives thousands of alerts daily. Analysts who cannot tell normal administrative noise from genuine attacker tradecraft suffer alert fatigue—allowing real intrusions to slip past unnoticed. Structured triage frameworks keep investigations fast, repeatable, and defensible.

#### Prerequisites & Connections
Building on **Defensive Frameworks & AAA** (specifically Accounting logs and Least Privilege), this module benefits from **Vulnerability Management & Patching Prioritization** to understand which exposures adversaries actually target. It leads directly into **Endpoint Auditing & Sysmon**, **Incident Response Lifecycle**, and **Penetration Testing Methodologies**.

#### Core Explanation
Three operational models guide Tier-1 and Tier-2 SOC analysts:
- **Alert Outcomes:**
  - **True Positive (TP):** Alert accurately flagged genuine malicious or unauthorized behavior.
  - **False Positive (FP):** Alert fired on harmless routine behavior due to overly broad rule logic—requiring rule tuning.
  - **False Negative (FN):** An actual attack occurred without triggering any alert (coverage gap).
- **Cyber Kill Chain:** Seven sequential stages of an intrusion (*Reconnaissance, Weaponization, Delivery, Exploitation, Installation, Command & Control, Actions on Objectives*).
- **MITRE ATT&CK:** Living knowledge base organizing real-world adversary behavior by **Tactics** (the *why*, such as Persistence or Credential Access) and **Techniques** (the *how*, such as PowerShell execution or Scheduled Tasks).

#### How It Works
During triage, an analyst follows a documented **playbook**: inspect the triggering rule and raw telemetry, gather surrounding host/user context (parent process, user role, recent logins, change tickets), determine whether activity matches authorized maintenance or adversary TTPs mapped in ATT&CK, document findings clearly in the case ticket, and escalate verified incidents to Containment without tipping off active intruders.

#### Real-World Context
Suppose an alert triggers on \`powershell.exe -EncodedCommand ...\` running on an accounting workstation. Instead of auto-closing it or panicking, the analyst checks the parent process in EDR telemetry: seeing \`WINWORD.EXE\` spawning \`powershell.exe\` (MITRE ATT&CK Initial Access / Execution) signals a likely True Positive malicious document rather than an IT deployment script pushed from a management server.

#### Examples
Structuring a Tier-1 SOC triage ticket cleanly:
\`\`\`yaml
alert_id: "SOC-2026-4419"
rule: "Office Application Spawning Script Interpreter"
mitre_mapping: "Execution (Command and Scripting Interpreter)"
context_checked:
  host: "acct-ws-09.example.internal"
  parent_process: "WINWORD.EXE"
  child_process: "powershell.exe"
  scheduled_maintenance_match: false
verdict: "True Positive — Escalated to Tier-2 IR for Endpoint Isolation"
\`\`\`

#### Security Relevance
- **Defensive Value:** Mapping detections to MITRE ATT&CK exposes blind spots across tactics so detection engineers can balance coverage rather than over-alerting on one noisy signal.
- **Attacker Misuse:** Adversaries deliberately blend into administrative workflows ("Living off the Land") using native OS utilities so poorly tuned detections get dismissed as routine IT False Positives.

#### Common Mistakes
- Closing recurring alerts without checking parent-child process trees or authenticating whether a change ticket existed.
- Leaving noisy False Positive rules un-tuned until analysts ignore real alerts alongside them.
- Confusing the **Cyber Kill Chain** linear phases with the **MITRE ATT&CK** behavior matrix.

#### Key Takeaways
- **MITRE ATT&CK** categorizes real-world attacker tactics and techniques; the **Cyber Kill Chain** traces linear intrusion stages including **Weaponization** (pairing exploit + payload).
- Accurate classification separates **True Positives** from **False Positives** so rules improve continuously.
- **Triage playbooks** standardize evidence gathering and escalation speed under pressure.

#### Knowledge Check
- Which Cyber Kill Chain phase pairs an exploit with a malicious payload prior to Delivery?
- How should a detection engineer respond when a valid rule generates dozens of identical False Positives every morning from a known backup job?
- Why is parent-child process lineage critical when evaluating suspicious PowerShell alerts?

#### Further Learning
Browse the MITRE ATT&CK Enterprise Matrix and inspect how individual techniques link directly to Data Sources and Mitigations.`,
          quiz: [
            {
              id: 'q-soc-1',
              question: 'In the Cyber Kill Chain, which phase represents the construction of an exploit coupled with a backdoor payload?',
              options: [
                "Delivery",
                "Weaponization",
                "Exploitation",
                "Reconnaissance"
              ],
              correctOption: 1,
              explanation: 'Weaponization is the pairing of an exploit with a malicious payload (e.g., embedding a macro inside a document) before delivery.'
            },
            {
              id: 'q-soc-2',
              question: 'Which framework is a structured matrix of real-world adversary behaviors, tactics, and techniques?',
              options: [
                "ISO 27001",
                "CVSS Calculator",
                "MITRE ATT&CK",
                "NIST Cybersecurity Framework"
              ],
              correctOption: 2,
              explanation: 'MITRE ATT&CK maps specific techniques and behaviors used by real-world threat actors, assisting analysts in detection and mitigation.'
            },
            {
              id: 'q-soc-3',
              question: 'What is a security alert called that triggers on normal, benign administrative scripts?',
              options: [
                "False Negative",
                "True Positive",
                "True Negative",
                "False Positive"
              ],
              correctOption: 3,
              explanation: 'A False Positive is an alert that incorrectly flags benign activity as malicious, requiring rule tuning to reduce alert fatigue.'
            },
            {
              id: 'q-soc-4',
              question: 'What is the primary purpose of incident triage playbooks in a SOC?',
              options: [
                "To standardize triage, analysis, and containment steps for alerts",
                "To forecast quarterly security tooling and staffing budget allocations",
                "To administer corporate SMTP gateways and user mailbox quotas",
                "To automate CI/CD application build and container deployment pipelines"
              ],
              correctOption: 0,
              explanation: 'Playbooks ensure consistent and fast incident response by outlining standard steps to analyze and mitigate specific alerts.'
            }
          ]
        },
        {
          id: 'endpoint-audit',
          title: 'Endpoint Auditing & Sysmon',
          description: 'Harden Windows and Linux log infrastructures, and analyze telemetry using Sysmon Event IDs.',
          duration: '20 mins',
          content: `### Endpoint Auditing & Sysmon

**Difficulty:** Intermediate  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** SOC Triage & Lifecycle, Active Directory & Event Logs  

#### Learning Objectives
- Contrast baseline OS logs against deep endpoint telemetry captured by Microsoft **Sysmon**.
- Interpret core **Sysmon Event IDs** (**Event ID 1** Process Creation, **Event ID 3** Network Connection, **Event ID 11** FileCreate).
- Locate Linux authentication and privilege audit logs (\`/var/log/auth.log\` / \`/var/log/secure\`).

#### Why It Matters
Standard operating system logs often record *that* a logon occurred without capturing the command-line flags, file hashes, or outbound network sockets spawned afterward. Endpoint auditing closes this visibility gap so responders can trace exactly how a process behaved on the host.

#### Prerequisites & Connections
This lesson builds directly on **SOC Triage & Lifecycle** and **Active Directory & Event Logs**, applying Windows Event Viewer fundamentals to deep behavioral telemetry. It feeds straight into **SIEM & Ingestion Pipelines**, **Endpoint Security (AV, EDR, XDR)**, and **Digital Forensics Analysis**.

#### Core Explanation
Effective host telemetry combines native OS logs with specialized instrumentation:
- **Linux Authentication Logs:** Debian/Ubuntu record SSH logins, PAM checks, and \`sudo\` elevations in \`/var/log/auth.log\`, while RHEL/Fedora/Rocky use \`/var/log/secure\`.
- **Microsoft Sysmon (System Monitor):** Lightweight Windows driver and service writing high-fidelity telemetry into \`Microsoft-Windows-Sysmon/Operational\`:
  - **Event ID 1 (Process Creation):** Records full command-line arguments, parent process (\`ParentImage\`), user context, and cryptographic file hashes.
  - **Event ID 3 (Network Connection):** Logs outbound/inbound TCP/UDP sockets tied to the originating process image.
  - **Event ID 11 (FileCreate):** Records newly written files on disk (valuable for spotting dropped payloads in temp folders).
  - **Event ID 10 (ProcessAccess):** Reveals processes opening handles to sensitive targets such as \`lsass.exe\`.

#### How It Works
Sysmon is driven by an XML configuration file filtering out routine OS background noise while capturing high-signal events (such as scripts executing out of \`Users\\Public\` or unexpected parent-child chains). Forwarders ship these XML/JSON events off the endpoint immediately so tampering with local log files cannot erase earlier activity.

#### Real-World Context
Without Sysmon Event ID 1 or command-line process auditing enabled, an incident responder inspecting a compromised Windows server might see "Logon succeeded," yet remain blind to whether an administrator or intruder ran an encoded script or reconnaissance tool five seconds later. Adding Sysmon plus Event ID 3 lets defenders trace the exact binary opening an outbound C2 socket.

#### Examples
Querying Sysmon Event ID 1 telemetry via PowerShell in a lab workstation:
\`\`\`powershell
# Search the local Sysmon log for recent process creation events (Event ID 1)
Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational'; ID=1} -MaxEvents 5 | Format-List
\`\`\`
\`\`\`text
Sample Sysmon Event ID 1 Fields:
  Image:       C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe
  CommandLine: powershell.exe -NoProfile -WindowStyle Hidden ...
  ParentImage: C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE
  Hashes:      SHA256=E3B0C44298FC1C149AFBF4C8996FB924...
\`\`\`

#### Security Relevance
- **Defensive Value:** Correlating Event ID 1 (what ran) with Event ID 3 (where it connected) and Linux \`auth.log\`/\`secure\` entries establishes an end-to-end process execution timeline.
- **Attacker Misuse:** Intrusion toolkits routinely check for running Sysmon services or attempt to clear local Windows Event Logs (generating Event ID 1102/104) to conceal lateral movement.

#### Common Mistakes
- Deploying Sysmon with no tuned config (flooding disk/SIEM with noisy Event ID 3/7 traffic) or logging everything without forwarding off-host.
- Forgetting that Debian derivatives write auth trails to \`/var/log/auth.log\` whereas RHEL systems write to \`/var/log/secure\`.
- Inspecting only Process Creation while ignoring ParentImage lineage.

#### Key Takeaways
- **Sysmon** captures rich host telemetry: **Event ID 1** (Process Creation with command line & hash), **Event ID 3** (Network Connections), and **Event ID 11** (File Creation).
- Linux SSH and \`sudo\` events live in \`/var/log/auth.log\` or \`/var/log/secure\`.
- Always forward endpoint audit logs off-host to central SIEM storage.

#### Knowledge Check
- Why does Sysmon Event ID 1 capture \`ParentImage\` and cryptographic file hashes in addition to the process name?
- Which Sysmon Event ID connects a suspicious outbound IP address back to the exact executable on disk?
- Where would you inspect failed \`sudo\` elevation attempts on an Ubuntu server vs. a Red Hat Enterprise Linux server?

#### Further Learning
Study the community-maintained SwiftOnSecurity or Olaf Hartong Sysmon modular XML templates to see how defenders filter high-signal telemetry.`,
          quiz: [
            {
              id: 'q-sys-1',
              question: 'Which Sysmon Event ID tracks Process Creation, including the full command-line strings and parent processes?',
              options: [
                "Event ID 7",
                "Event ID 11",
                "Event ID 1",
                "Event ID 3"
              ],
              correctOption: 2,
              explanation: 'Sysmon Event ID 1 captures detailed process creation metadata, which is critical for finding malicious command executions.'
            },
            {
              id: 'q-sys-2',
              question: 'Which Sysmon Event ID tracks outbound network sockets opened by local executable programs?',
              options: [
                "Event ID 11",
                "Event ID 1",
                "Event ID 5",
                "Event ID 3"
              ],
              correctOption: 3,
              explanation: 'Event ID 3 logs network connections made by system processes, including destination IP addresses and ports.'
            },
            {
              id: 'q-sys-3',
              question: 'What is the primary advantage of Sysmon over standard Windows Security logging?',
              options: [
                "Sysmon logs deep telemetry like command lines, hashes, and sockets.",
                "Sysmon blocks exploits automatically at the Windows filesystem filter.",
                "Sysmon enforces immutable kernel-space sandboxing that cannot be bypassed.",
                "Sysmon encrypts the entire system boot volume using TPM keys."
              ],
              correctOption: 0,
              explanation: 'Sysmon provides advanced endpoint telemetry that standard event logs omit, such as parent/child relationships and executable hashes.'
            },
            {
              id: 'q-sys-4',
              question: 'Where are Linux authentication records, SSH sessions, and sudo privilege changes recorded?',
              options: [
                "/var/log/dmesg",
                "/var/log/auth.log or /var/log/secure",
                "/var/log/nginx/access.log",
                "/var/log/syslog"
              ],
              correctOption: 1,
              explanation: '/var/log/auth.log (on Debian systems) or /var/log/secure (on RedHat systems) records authentication and authorization events.'
            }
          ]
        },
        {
          id: 'siem-pipelines',
          title: 'SIEM & Ingestion Pipelines',
          description: 'Construct log parser filters, write Splunk SPL search queries, and configure correlation rules.',
          duration: '22 mins',
          content: `### SIEM & Ingestion Pipelines

**Difficulty:** Intermediate  
**Estimated Study Time:** 22 Minutes  
**Prerequisites:** Endpoint Auditing & Sysmon, Stream Editing & File Inspection (grep, find, awk, sed)  

#### Learning Objectives
- Trace the complete SIEM pipeline from endpoint forwarder through parsing, normalization, indexing, and alerting.
- Write structured Splunk **SPL** queries using \`stats\`, \`where\`, and field filters to hunt anomalies.
- Design multi-source **correlation rules** connecting authentication events (such as Windows Event ID 4624 Type 3 and 4625) across hosts.

#### Why It Matters
Individual logs live scattered across thousands of endpoints, firewalls, and cloud accounts. A Security Information and Event Management (**SIEM**) platform unifies that telemetry into one searchable timeline—enabling analysts to spot coordinated attacks (such as password spraying across ten servers) that are invisible on any single machine.

#### Prerequisites & Connections
This lesson builds directly on **Endpoint Auditing & Sysmon** and **Stream Editing & File Inspection (grep, find, awk, sed)**. Familiarity with **Databases, SQL & Data Access** is also helpful for understanding indexed queries. It prepares you for **AWS Audit Logging & Shielding** and **Microsoft Azure Security** (Sentinel KQL).

#### Core Explanation
A SIEM pipeline converts noisy raw text lines into actionable security intelligence across four stages:
- **Collection & Forwarding:** Lightweight agents (syslog, Beats, Splunk Universal Forwarder) ship events securely over TLS off source hosts.
- **Parsing & Normalization:** Extract structured fields (\`timestamp\`, \`src_ip\`, \`user\`, \`event_id\`) from raw log formats and normalize vendor naming differences into a common schema.
- **Indexing:** Stores structured documents for sub-second search across months of historical telemetry.
- **Detection & Correlation:** Evaluates scheduled or streaming queries—including **correlation rules** matching sequences across sources (e.g., 15 failed logins in Event 4625 followed by a network Logon Type 3 success in Event 4624).

#### How It Works
In Splunk **SPL** (Search Processing Language), queries flow left-to-right through pipes (\`|\`), mirroring Unix pipelines: first narrow the index and time range (\`index=windows event_id=4625\`), then transform and aggregate with commands like \`stats count by src_ip, TargetUserName\`, and finally filter anomalies (\`where count > 10\`). Always keep high-cardinality filters early in the query so the indexer scans minimal buckets.

#### Real-World Context
During a credential-stuffing wave, no individual web node or domain controller sees enough failed attempts per user to lock out accounts. Once all authentication logs normalize into the SIEM, a simple \`stats dc(TargetUserName) as distinct_users by src_ip\` correlation rule immediately highlights one source IP testing a single password against 80 distinct usernames within two minutes.

#### Examples
Inspecting a Splunk SPL brute-force detection query (practice interactively in the **Practice Lab** tab):
\`\`\`splunk
index=windows event_id=4625
| stats count by src_ip, TargetUserName
| where count > 10
\`\`\`
\`\`\`text
Logon Type Reference (Windows Event ID 4624):
  Type 2  -> Interactive (local keyboard/console)
  Type 3  -> Network (SMB share, RPC, network auth)
  Type 10 -> RemoteInteractive (RDP)
\`\`\`

#### Security Relevance
- **Defensive Value:** Central normalization turns disparate Linux, Windows, DNS, and firewall logs into correlated attack stories with fast retrospective search.
- **Attacker Misuse:** Attackers probe for blind spots in ingestion pipelines (such as unmanaged appliances or unparsed custom log formats) or flood verbose debug events to exhaust daily SIEM ingestion quotas.

#### Common Mistakes
- Ingesting raw logs without validating field extractions or time-zone normalization (UTC alignment).
- Writing unindexed wildcard searches across \`index=*\` that stall shared SOC search heads.
- Mistaking Windows Logon **Type 3** (Network logon) for physical console (**Type 2**) or RDP (**Type 10**) access.

#### Key Takeaways
- A **SIEM** parses, normalizes, indexes, and correlates distributed security logs.
- **Log parsers** extract structured attributes (\`timestamp\`, \`src_ip\`, \`user\`); **SPL \`stats\`** aggregates counts across fields; **correlation rules** alert on linked multi-event patterns.
- In Windows Event ID 4624, **Logon Type 3** identifies a **Network** logon (such as SMB shares or web auth).

#### Knowledge Check
- Why does a SIEM normalize raw logs from different firewall and OS vendors into standard field names like \`src_ip\` before running correlation rules?
- What separates a threshold alert ("5 failed logins") from a cross-source correlation rule?
- During an investigation, why does seeing Windows Logon Type 3 from an unfamiliar workstation matter differently than Type 2?

#### Further Learning
Explore Sigma detection rules—an open, vendor-neutral YAML format that compiles once into Splunk SPL, Elastic KQL, and Microsoft Sentinel queries.`,
          quiz: [
            {
              id: 'q-siem-1',
              question: 'Which Splunk query command compiles calculated metrics and counts, grouping results by specified fields?',
              options: [
                "stats",
                "search",
                "table",
                "eval"
              ],
              correctOption: 0,
              explanation: 'The "stats" command is used in Splunk SPL to perform aggregations like count, average, and sum, grouping them by target fields.'
            },
            {
              id: 'q-siem-2',
              question: 'Which of the following defines a SIEM correlation rule?',
              options: [
                "A maintenance cron script purging temporary files on SIEM indexers.",
                "Detection logic alerting when specific event patterns match across sources.",
                "A policy that encrypts ingested Windows and Linux syslog archives.",
                "An automated schedule backing up relational databases off-site nightly."
              ],
              correctOption: 1,
              explanation: 'Correlation rules analyze data from multiple sources in real-time, triggering alerts when patterns indicating potential attacks are matched.'
            },
            {
              id: 'q-siem-3',
              question: 'What is the role of the log parser in a SIEM ingestion pipeline?',
              options: [
                "To rotate and permanently purge expired historical security archives.",
                "To export formatted executive PDF compliance summaries every week.",
                "To push automated blocklists directly to perimeter edge firewalls.",
                "To extract fields like timestamps, IPs, and users from raw logs."
              ],
              correctOption: 3,
              explanation: 'Parsers normalize raw log strings, extracting key attributes into indexed fields to make them searchable and reportable.'
            },
            {
              id: 'q-siem-4',
              question: 'What does logon type 3 represent in Windows Security event 4624 records?',
              options: [
                "Interactive physical console or keyboard logon",
                "Remote Interactive Desktop (RDP) terminal logon",
                "Network logon (shared folders or web auth)",
                "Local operating system background service logon"
              ],
              correctOption: 2,
              explanation: 'Logon Type 3 indicates a Network logon, where a user connects to a shared folder, database, or local intranet portal.'
            }
          ]
        }
      ]
    },
    {
      id: 'defense-tech',
      title: 'Defense Technologies',
      category: 'defense',
      lessons: [
        {
          id: 'endpoint-defense',
          title: 'Endpoint Security (AV, EDR, XDR)',
          description: 'Compare Antivirus signatures, behavior EDR monitors, and XDR analytics.',
          duration: '15 mins',
          content: `### Endpoint Security (AV, EDR, XDR)

**Difficulty:** Intermediate  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Endpoint Auditing & Sysmon  

#### Learning Objectives
- Compare signature-based **Antivirus (AV)**, behavioral **EDR**, and cross-domain **XDR** telemetry platforms.
- Explain why **fileless malware** evades legacy disk-only signature scans.
- Apply EDR **network isolation** safely during active incident containment without destroying investigative telemetry.

#### Why It Matters
Once an adversary lands on a workstation or server—whether via phishing or a compromised service—endpoint controls are the last line of defense before lateral movement begins. Knowing what traditional AV catches versus what requires behavioral EDR and cross-signal XDR shapes how defenders configure prevention and containment.

#### Prerequisites & Connections
This module builds directly on **Endpoint Auditing & Sysmon**, showing how real-time detection and response engines consume the same process, memory, and socket signals you audited in Sysmon. It supports **Incident Response Lifecycle** and **Malware Families & Triage**.

#### Core Explanation
Endpoint protection evolved across three generations:
- **Traditional Antivirus (AV):** Compares files written to disk against known cryptographic hashes and byte signatures. Fast against commodity malware, yet blind when adversaries recompile binaries or execute payloads purely in memory.
- **Endpoint Detection and Response (EDR):** Kernel/user-space sensors continuously watch process lineage, memory injections, registry changes, and network sockets. EDR detects **fileless malware** (living-off-the-land scripts executing solely in RAM) and gives analysts remote triage plus **Network Isolation**—blocking general LAN/internet traffic while preserving the encrypted control channel to the EDR console.
- **Extended Detection and Response (XDR):** Correlates endpoint telemetry automatically with email gateways, identity providers, firewalls, and cloud logs so multi-stage attacks surface as one unified incident.

#### How It Works
When an employee opens a malicious attachment that launches \`powershell.exe\` in memory, disk-only AV may see nothing suspicious on the file itself. EDR observes the abnormal parent process, records memory allocation API behavior, alerts the SOC, and lets responders isolate the endpoint in one click—halting outbound command-and-control and SMB lateral spread while keeping live remote investigation open.

#### Real-World Context
During a fast-moving ransomware intrusion, every minute between initial execution and host containment determines how many file shares get encrypted. Automated EDR behavioral policies combined with XDR identity signals (such as isolating a host and revoking the user's cloud OAuth sessions simultaneously) cut containment time from hours to seconds.

#### Examples
Comparing detection coverage and response capabilities across AV, EDR, and XDR:
\`\`\`text
Capability                  Legacy AV        EDR                    XDR
--------------------------  ---------------  ---------------------  --------------------------------
Known file hash/signature   Yes              Yes                    Yes
In-memory/fileless behavior Minimal          Yes (process/RAM)      Yes (correlated across domains)
Remote host isolation       No               Yes                    Yes + Identity/Cloud quarantine
Email + Cloud correlation   No               Endpoint-only          Unified cross-telemetry graph
\`\`\`

#### Security Relevance
- **Defensive Value:** Behavioral EDR plus network isolation enables surgical containment that stops lateral spread without pulling network cables or wiping volatile RAM evidence.
- **Attacker Misuse:** Advanced threats attempt to tamper with EDR sensors ("Bring Your Own Vulnerable Driver" or unhook user-mode APIs), making tamper protection and off-host telemetry forwarding vital.

#### Common Mistakes
- Assuming signature AV alone protects modern endpoints from Living-off-the-Land (LotL) and memory-resident scripts.
- Leaving EDR in "detect-only" audit mode indefinitely instead of enabling validated blocking and tamper protection.
- Rebooting or shutting down an isolated host before capturing volatile artifacts during triage.

#### Key Takeaways
- **Antivirus** relies mainly on static file signatures; **EDR** monitors live process, memory, and network behavior to catch **fileless malware**; **XDR** correlates endpoints with network, email, and cloud signals.
- **Network Isolation** severs lateral movement and C2 traffic while keeping the management channel open for forensic response.

#### Knowledge Check
- Why does **fileless malware** executing solely in RAM via built-in system interpreters bypass traditional disk signature AV?
- During active containment, why is EDR Network Isolation preferable to unplugging or powering off a workstation?
- What extra context does **XDR** add beyond standalone endpoint EDR?

#### Further Learning
Review the MITRE Engenuity ATT&CK Evaluations methodology to see how real behavioral EDR/XDR solutions are tested against adversary emulation.`,
          quiz: [
            {
              id: 'q-edr-1',
              question: 'What is the primary advantage of EDR over traditional Antivirus (AV)?',
              options: [
                "EDR consumes significantly less CPU and RAM overhead on laptops.",
                "EDR tracks live process, memory, and socket behavior against fileless attacks.",
                "EDR inspects raw Ethernet frames directly at OSI Layer 2.",
                "EDR purges verbose OS security logs to prevent adversary tampering."
              ],
              correctOption: 1,
              explanation: 'EDR focuses on behavior and telemetry rather than just static file signatures, allowing it to detect and respond to advanced fileless attacks.'
            },
            {
              id: 'q-edr-2',
              question: 'What is the term used to describe malware attacks that execute entirely in RAM using native system tools, without writing files to disk?',
              options: [
                "Trojan Horse",
                "Rootkit",
                "Fileless Malware",
                "Ransomware"
              ],
              correctOption: 2,
              explanation: 'Fileless malware executes directly in memory using trusted system tools like PowerShell or WMI, bypassing traditional file-based AV scanners.'
            },
            {
              id: 'q-edr-3',
              question: 'What is the primary function of an EDR "Network Isolation" action?',
              options: [
                "To sever network spread while keeping EDR analysis access open.",
                "To flash updated motherboard UEFI firmware across managed endpoints.",
                "To power off the physical chassis cleanly before evidence spreads.",
                "To lock the local system partition with a recovery passphrase."
              ],
              correctOption: 0,
              explanation: 'Network isolation blocks a compromised host from communicating with other local and external systems, preventing lateral movement and data exfiltration.'
            },
            {
              id: 'q-edr-4',
              question: 'Which technology integrates telemetry from endpoints, network firewalls, and cloud environments to provide unified threat detection?',
              options: [
                "Traditional AV",
                "EDR",
                "SIEM Forwarders",
                "XDR"
              ],
              correctOption: 3,
              explanation: 'XDR (Extended Detection and Response) integrates data across security silos to correlate events and streamline security investigations.'
            }
          ]
        },
        {
          id: 'network-defense',
          title: 'Network Defense (IDS/IPS, Snort, Suricata, Wireshark)',
          description: 'Write Snort rule signatures, analyze raw packet captures in Wireshark, and monitor network logs.',
          duration: '18 mins',
          content: `### Network Defense (IDS/IPS, Snort, Suricata, Wireshark)

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Secure Tunnels & Perimeter Defense (VPN, Firewalls, Proxy Servers), Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP)  

#### Learning Objectives
- Distinguish passive **Intrusion Detection Systems (IDS)** from inline **Intrusion Prevention Systems (IPS)**.
- Read and author signature rules in **Snort / Suricata** syntax (Action, Protocol, Endpoints, Options).
- Analyze raw **PCAP** captures in **Wireshark** (including display filters and *Follow TCP Stream*) to inspect payloads.

#### Why It Matters
Even hardened endpoints leave network footprints when an adversary scans internal subnets, exfiltrates data over non-standard ports, or sends exploit traffic. Network detection engines and packet forensics give defenders wire-level proof that cannot be hidden by a local rootkit.

#### Prerequisites & Connections
This lesson builds directly on **Secure Tunnels & Perimeter Defense (VPN, Firewalls, Proxy Servers)** and **Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP)**, extending stateful port filtering into deep payload inspection. It connects closely with **Email Protocols, Authentication & Phishing Defense** and **Active Reconnaissance & Port Scanning**.

#### Core Explanation
Network visibility rests on two complementary disciplines:
- **IDS vs. IPS:**
  - **IDS (Intrusion Detection System):** Inspects mirrored network traffic out-of-band (via SPAN/TAP) and raises alerts passively without slowing or risking production outages.
  - **IPS (Intrusion Prevention System):** Sits directly inline along the packet path and can actively **drop** or block malicious flows in real time.
- **Snort & Suricata Signatures:** Open-source engines evaluate packets against structured rules consisting of a **Rule Header** (Rule Action such as \`alert\` or \`drop\`, protocol, source/destination IP and port, direction operator) and **Rule Options** (\`msg\`, \`content\`, \`sid\`, \`rev\`).
- **Wireshark & PCAP Analysis:** Packet Capture (**PCAP**) files preserve full network frames for deep protocol dissection. Using **Follow TCP Stream**, analysts reassemble fragmented segments into readable application sessions.

#### How It Works
Suppose a network sensor fires on anomalous outbound HTTP traffic. A defender pulls the matching PCAP into Wireshark, applies a display filter (such as \`tcp.stream eq 14\`), and uses *Follow TCP Stream* to inspect the unencrypted request headers, URI path, and server response—confirming whether the signature caught a genuine beacon or an ordinary software updater before updating IPS blocking rules.

#### Real-World Context
Because TLS encrypts most modern application payloads, organizations pair metadata sensors (JA4/TLS fingerprints, DNS logs, NetFlow) with controlled TLS inspection at corporate egress proxies where lawful, feeding Snort/Suricata engines with decrypted HTTP traffic for high-confidence exploit signature matching.

#### Examples
Inspecting a basic Snort alert rule and common Wireshark display filters:
\`\`\`snort
# Rule Action: alert | Protocol: icmp | Scope: any -> $HOME_NET
alert icmp any any -> $HOME_NET any (msg:"ICMP Ping Attempt Detected"; sid:1000001; rev:1;)
\`\`\`
\`\`\`text
Useful Wireshark Display Filters:
  http.request.method == "POST"     # Inspect outbound HTTP POST payloads
  dns.qry.name contains "internal"  # Filter DNS lookups for internal domains
  tcp.flags.syn == 1 && tcp.flags.ack == 0   # Spot SYN scan sweeps
\`\`\`

#### Security Relevance
- **Defensive Value:** Network IDS/IPS rules and PCAP archives expose lateral movement, unencrypted credential leaks, and C2 protocols even on appliances where EDR agents cannot be installed.
- **Attacker Misuse:** Threat actors tunnel traffic over encrypted DNS-over-HTTPS or standard ports (TCP 443) to blend in with legitimate web traffic and evade naive payload rules.

#### Common Mistakes
- Deploying untested IPS \`drop\` rules inline without running them in passive \`alert\` mode first, causing production outages on false positives.
- Expecting plaintext payload strings to match inside encrypted TLS sessions without decryption or metadata analysis.
- Confusing Wireshark **capture filters** (BPF syntax) with **display filters** (\`ip.addr == ...\`).

#### Key Takeaways
- An **IDS** detects and alerts passively out-of-band; an **IPS** sits inline to drop malicious packets automatically.
- **Snort/Suricata** rules begin with the **Rule Action** (\`alert\`, \`drop\`, \`pass\`) followed by protocol, IP/port tuples, direction, and inspection options.
- **Wireshark** dissects **PCAP** traffic and uses **Follow TCP Stream** to reconstruct sequential session payloads.

#### Knowledge Check
- Why do security teams validate new Snort/Suricata signatures in passive IDS \`alert\` mode before switching them to inline IPS \`drop\`?
- In a Snort rule, what four tuple elements make up the Rule Header after the Action and Protocol?
- What happens when you right-click an HTTP packet in Wireshark and select *Follow TCP Stream*?

#### Further Learning
Practice writing Suricata rules against sample Malware-Traffic-Analysis PCAP captures inside an isolated lab VM.`,
          quiz: [
            {
              id: 'q-nd-1',
              question: 'What is the primary operational difference between an Intrusion Detection System (IDS) and an Intrusion Prevention System (IPS)?',
              options: [
                "An IDS encrypts outbound VPN flows; an IPS decrypts TLS traffic.",
                "An IDS inspects only UDP streams; an IPS inspects only TCP.",
                "An IDS detects and alerts passively; an IPS blocks traffic inline.",
                "An IDS installs solely on laptops; an IPS runs inside cloud routers."
              ],
              correctOption: 2,
              explanation: 'An IPS is deployed inline, allowing it to drop packets and terminate connections automatically when a threat is detected, while an IDS only alerts analysts.'
            },
            {
              id: 'q-nd-2',
              question: 'In a Snort rule, what does the first keyword (such as "alert" or "drop") represent?',
              options: [
                "The Rule Option",
                "The Rule Action",
                "The Protocol Definition",
                "The Signature Identifier"
              ],
              correctOption: 1,
              explanation: 'The first field in a Snort rule defines the Action (e.g., alert, log, pass, drop) to take when traffic matches the rule criteria.'
            },
            {
              id: 'q-nd-3',
              question: 'Which Wireshark feature allows analysts to reconstruct complete TCP sessions to view cleartext payloads in sequential order?',
              options: [
                "Expert Information",
                "Apply as Filter",
                "Protocol Dissection",
                "Follow TCP Stream"
              ],
              correctOption: 3,
              explanation: '"Follow TCP Stream" reconstructs the data exchange in a human-readable layout, which is highly useful for tracing protocol traffic.'
            },
            {
              id: 'q-nd-4',
              question: 'What type of network analysis captures traffic directly from a physical network link or tap for analysis?',
              options: [
                "Deep Packet Inspection / PCAP",
                "Local Endpoint Application Logs",
                "Authenticated Vulnerability Scanning",
                "Syslog Perimeter Firewall Ingestion"
              ],
              correctOption: 0,
              explanation: 'Packet sniffing captures raw packet frames directly from physical networks, allowing deep analysis of network traffic.'
            }
          ]
        },
        {
          id: 'email-security',
          title: 'Email Protocols, Authentication & Phishing Defense',
          description: 'Understand SMTP/MIME headers, SPF, DKIM, and DMARC alignment, and triage phishing and BEC lures safely.',
          duration: '18 mins',
          content: `### Email Protocols, Authentication & Phishing Defense

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP), Defensive Frameworks & AAA  

#### Learning Objectives
- Trace raw email delivery paths through **SMTP** envelopes, \`Received:\` header chains, and **MIME** attachments.
- Explain how **SPF** (RFC 7208), **DKIM** (RFC 6376), and **DMARC** (RFC 7489) enforce sender authentication and domain alignment.
- Triage phishing, credential-harvesting links, and Business Email Compromise (BEC) lures using safe analysis workflows.

#### Why It Matters
Email remains one of the most frequent initial access vectors for ransomware, credential theft, and wire-transfer fraud. Because the classic SMTP protocol never built in sender verification, defenders rely on DNS-published authentication records—and sharp header-reading skills—to block spoofing and investigate suspicious messages safely.

#### Prerequisites & Connections
This lesson builds directly on **Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP)** (specifically DNS MX and TXT records) and **Defensive Frameworks & AAA**. Prior exposure to **SOC Triage & Lifecycle** is recommended, and email-defense skills feed directly into **Incident Response Lifecycle** and **Open Source Intelligence & Passive Recon**.

#### Core Explanation
Email delivery and authentication span two protocol layers:
- **SMTP & Email Headers:** SMTP separates the routing envelope (**MAIL FROM / Return-Path**, used for bounce delivery) from the visible **Header From:** displayed in a user's inbox. Every mail relay prepends a \`Received:\` header from bottom to top, showing the true IP path of the message.
- **MIME:** Encodes HTML bodies, UTF-8 text, and file attachments inside SMTP messages.
- **Email Authentication Trio:**
  - **SPF (Sender Policy Framework, RFC 7208):** A DNS \`TXT\` record listing which sending IP addresses/blocks are authorized to transmit mail for the \`Return-Path\` domain.
  - **DKIM (DomainKeys Identified Mail, RFC 6376):** Signs selected headers and message body cryptographically using the sender domain's private key; recipients verify the signature via a public key published in DNS (\`selector._domainkey.domain\`).
  - **DMARC (Domain-based Message Authentication, Reporting, and Conformance, RFC 7489):** Connects authentication to the visible **Header From:** domain via **alignment** (the SPF \`Return-Path\` or DKIM \`d=\` domain must match the visible \`From:\` domain) and publishes enforcement policies: \`p=none\` (monitor only), \`p=quarantine\` (route failures to spam), or \`p=reject\` (block delivery).

#### How It Works
Suppose an attacker tries to spoof \`ceo@example.com\`. Even if they set \`Return-Path\` to a domain they own (\`bounce@attacker-domain.test\`) so SPF passes for their own server, **DMARC fails** because neither the SPF \`Return-Path\` domain nor a valid DKIM \`d=\` signature aligns with \`example.com\`. With \`v=DMARC1; p=reject;\` published, receiving gateways drop the spoofed message before it reaches employees.

#### Real-World Context
Attackers frequently bypass exact-domain DMARC enforcement using **lookalike domains** (such as \`examp1e.com\` with valid SPF/DKIM on the fake domain) or compromised partner mailboxes in Business Email Compromise (BEC) scams requesting urgent invoice changes. Defenders therefore combine strict DMARC \`p=reject\`, external-sender banners, link rewriting/detonation, and out-of-band phone verification for financial changes.

#### Examples
Inspecting a DMARC failure in email headers and DNS policy syntax:
\`\`\`text
DNS TXT Record (_dmarc.example.com):
  "v=DMARC1; p=reject; rua=mailto:dmarc-reports@example.com; adkim=s; aspf=s"

Suspicious Header Snippet:
  Return-Path: <bounce@untrusted-relay.example.net>
  From: "CFO Billing" <cfo@example.com>
  Authentication-Results: spf=pass (smtp.mailfrom=untrusted-relay.example.net);
                          dkim=none; dmarc=fail (p=REJECT header.from=example.com)
\`\`\`

#### Security Relevance
- **Defensive Value:** Enforcing SPF, DKIM, and DMARC with \`p=reject\` prevents third parties from impersonating your organization's domain toward customers, employees, and partners.
- **Attacker Misuse:** Phishing operators abuse newly registered lookalike domains, compromised third-party email accounts, and malicious HTML/ISO attachments—and exploit organizations that leave DMARC stuck indefinitely at \`p=none\`.

#### Common Mistakes
- Assuming **SPF** alone stops visible \`From:\` spoofing (SPF checks \`Return-Path\`, not the displayed \`From:\` header, unless DMARC alignment enforces matching domains).
- Leaving DMARC permanently on \`p=none\`, which collects reports without blocking or quarantining spoofed mail.
- Clicking live phishing links or opening attachments directly on a corporate workstation instead of inspecting headers, URLs, and file hashes in an isolated analysis environment.

#### Key Takeaways
- **SPF** authorizes sending IPs for \`Return-Path\`; **DKIM** cryptographically signs message integrity; **DMARC** enforces domain **alignment** against the visible \`From:\` header with \`p=none\`, \`p=quarantine\`, or \`p=reject\`.
- Read \`Received:\` headers bottom-to-top to find the true originating mail server IP.
- Defend against lookalike domains and BEC with strict DMARC, phishing-resistant MFA, and out-of-band verification for sensitive requests.

#### Knowledge Check
- Why can an email record \`spf=pass\` in \`Authentication-Results\` yet still fail DMARC alignment against the visible \`From:\` address?
- What is the operational difference between publishing \`p=none\` versus \`p=reject\` in a domain's DMARC TXT record?
- In what order do mail transfer agents prepend \`Received:\` headers inside an email source file?

#### Further Learning
Examine RFC 7489 DMARC aggregate report (\`rua\`) XML schemas and practice reading sanitized email headers safely in CyberChef or MXToolbox analyzers.`,
          quiz: [
            {
              id: 'q-em-1',
              question: 'Which email authentication standard cryptographically signs message headers and body using a private key verified via DNS?',
              options: [
                "SPF (Sender Policy Framework)",
                "DKIM (DomainKeys Identified Mail)",
                "SMTP STARTTLS Opportunistic Encryption",
                "MIME Content-Transfer-Encoding"
              ],
              correctOption: 1,
              explanation: 'DKIM adds a cryptographic digital signature in the DKIM-Signature header that receivers validate using the sender domain’s public key published in DNS.'
            },
            {
              id: 'q-em-2',
              question: 'Why can an attacker pass an SPF check while still forging an organization’s visible From: display header without DMARC?',
              options: [
                "SPF verifies only encrypted S/MIME user certificates on recipients.",
                "SPF validates every intermediate Received header hop simultaneously.",
                "SPF disables DNS MX lookups whenever TLS is enabled on port 25.",
                "SPF evaluates the Return-Path envelope domain, not the visible From header."
              ],
              correctOption: 3,
              explanation: 'SPF authorizes sending IPs against the SMTP MAIL FROM (Return-Path) domain. DMARC is required to enforce alignment between SPF/DKIM domains and the visible Header From address.'
            },
            {
              id: 'q-em-3',
              question: 'Which DMARC policy instructs receiving mail servers to block unaligned or unauthenticated messages outright?',
              options: [
                "p=none",
                "p=quarantine",
                "p=reject",
                "p=monitor"
              ],
              correctOption: 2,
              explanation: 'DMARC supports p=none (monitor only), p=quarantine (treat as spam/junk), and p=reject (block delivery at the gateway).'
            },
            {
              id: 'q-em-4',
              question: 'In raw email source headers, how are Received: lines ordered as a message travels from sender to recipient?',
              options: [
                "Chronologically bottom-to-top, with the earliest origin hop lowest",
                "Alphabetically sorted by each intermediate relay’s DNS domain name",
                "Chronologically top-to-bottom, with the earliest origin hop highest",
                "Sorted randomly according to MIME attachment size and encoding"
              ],
              correctOption: 0,
              explanation: 'Each mail server along the path prepends its own Received: header at the top, so analysts read Received: chains from bottom to top to find the true originating hop.'
            }
          ]
        }
      ]
    },
    {
      id: 'ir-forensics',
      title: 'Incident Response & Forensics',
      category: 'defense',
      lessons: [
        {
          id: 'dig-forensics',
          title: 'Digital Forensics Analysis',
          description: 'Follow forensic processes, inspect disk images, and analyze volatile memory using Volatility.',
          duration: '20 mins',
          content: `### Digital Forensics Analysis

**Difficulty:** Intermediate  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** System Boot & OS Architecture, Stream Editing & File Inspection (grep, find, awk, sed)  

#### Learning Objectives
- Preserve evidentiary admissibility through **Write Blockers**, cryptographic hashing, and **Chain of Custody** logs.
- Capture and analyze volatile RAM dumps using **Volatility 3** plugins (such as \`windows.pslist\` and \`windows.netscan\`).
- Inspect Windows Registry artifacts like **UserAssist** to build program execution timelines.

#### Why It Matters
When an intrusion escalates to legal action, regulatory investigation, or root-cause analysis, guesswork destroys credibility. Sound digital forensics preserves exact bit-for-bit copies of RAM and disk artifacts, proves evidence was never altered, and uncovers hidden malware that vanished from disk upon execution.

#### Prerequisites & Connections
Building on **System Boot & OS Architecture** (volatile RAM vs. persistent storage, filesystems) and **Stream Editing & File Inspection (grep, find, awk, sed)**, this module also pairs well with **Endpoint Auditing & Sysmon**. It feeds directly into **Incident Response Lifecycle** and **Malware Families & Triage**.

#### Core Explanation
Forensic investigators work across four core concepts:
- **Chain of Custody:** Continuous chronological documentation proving who seized, transferred, stored, and examined every piece of evidence, paired with cryptographic SHA-256 verification hashes.
- **Write Blockers:** Hardware or software controls blocking any write signals to source disks during imaging so timestamps and unallocated space remain pristine.
- **Volatile Memory Forensics (Volatility 3):** Inspects captured RAM images to uncover running processes, injected DLLs, open sockets, and unencrypted strings that vanish at reboot. Unlike legacy Volatility 2 (\`--profile\`), **Volatility 3** automatically resolves OS symbol tables using OS-prefixed plugins such as \`windows.pslist\` and \`windows.netscan\`.
- **Registry Execution Artifacts:** Keys inside \`NTUSER.DAT\` such as **UserAssist** record GUI application launches, execution counts, and last-run timestamps.

#### How It Works
During acquisition, responders follow the **Order of Volatility**—capturing live RAM and active network state before imaging SSD/HDD storage through a hardware write blocker. Every image receives a SHA-256 baseline hash immediately, and analysis runs strictly on verified working copies inside isolated forensic workstations rather than original evidence drives.

#### Real-World Context
An incident team suspects a workstation ran an unauthorized executable deleted immediately afterward. A clean RAM capture examined with \`windows.pslist\` and \`windows.cmdline\` still exposes the resident process, while \`UserAssist\` inside the Registry reveals when the user clicked the program—reconstructing the timeline even though the file no longer sits on disk.

#### Examples
Running modern Volatility 3 plugins against a lab memory capture (no legacy \`--profile\` flag required):
\`\`\`bash
# List active Windows processes from a captured memory image
vol -f lab-ws-04.mem windows.pslist

# Inspect active and recently closed TCP/UDP sockets captured in RAM
vol -f lab-ws-04.mem windows.netscan
\`\`\`

#### Security Relevance
- **Defensive Value:** Preserving write-blocked disk images and volatile RAM dumps gives responders irrefutable proof of initial access, persistence mechanisms, and scope.
- **Attacker Misuse:** Adversaries attempt "timestomping" (forging file timestamps) or executing memory-only payloads—techniques exposed when correlating NTFS \`$STANDARD_INFORMATION\` vs. \`$FILE_NAME\` attributes and RAM snapshots.

#### Common Mistakes
- Mounting and browsing an original suspect disk directly without a write blocker, altering access timestamps.
- Rebooting a compromised machine before acquiring volatile memory, wiping in-memory keys and network state.
- Using deprecated Volatility 2 syntax (\`--profile\`) instead of Volatility 3 namespace plugins (\`windows.pslist\`).

#### Key Takeaways
- **Write Blockers** protect source media from accidental writes; **Chain of Custody** tracks every handler and SHA-256 hash.
- **Volatility 3** analyzes RAM images via auto-resolved symbol plugins such as \`windows.pslist\` and \`windows.netscan\`.
- Registry keys like **UserAssist** track GUI program run counts and execution timestamps.

#### Knowledge Check
- Why does the forensic Order of Volatility place RAM acquisition ahead of imaging a powered-off SSD?
- How does a Write Blocker preserve legal admissibility during disk duplication?
- What syntax difference separates Volatility 3 from legacy Volatility 2 commands?

#### Further Learning
Review RFC 3227 ("Guidelines for Evidence Collection and Archiving") to study the formal Order of Volatility across enterprise systems.`,
          quiz: [
            {
              id: 'q-df-1',
              question: 'What is the purpose of using a Write Blocker during digital evidence collection?',
              options: [
                "To quarantine active ransomware executables before copying starts.",
                "To double raw disk-to-disk sequential sector copy throughput.",
                "To symmetrically encrypt the forensic image using AES-256.",
                "To prevent any writes that would alter original source evidence."
              ],
              correctOption: 3,
              explanation: 'Write Blockers intercept write signals sent by the host system, ensuring the source evidence remains completely unaltered during acquisition.'
            },
            {
              id: 'q-df-2',
              question: 'Which framework is standard for analyzing volatile RAM dumps to recover active processes, open sockets, and loaded drivers?',
              options: [
                "Nmap",
                "Autopsy",
                "Volatility",
                "Wireshark"
              ],
              correctOption: 2,
              explanation: 'Volatility is an advanced command-line memory forensics framework designed to analyze volatile data dumps from RAM.'
            },
            {
              id: 'q-df-3',
              question: 'Which of the following describes "Chain of Custody"?',
              options: [
                "A chronological record tracking evidence seizure, custody, and transfer.",
                "The directory structure used on immutable forensic archive storage.",
                "The automated EDR isolation workflow for compromised user laptops.",
                "The firewall ACL ruleset separating DMZ servers from user subnets."
              ],
              correctOption: 0,
              explanation: 'Chain of Custody documentation tracks who handled evidence, when, and why, proving evidence was not tampered with and maintaining its integrity.'
            },
            {
              id: 'q-df-4',
              question: 'Which Windows Registry artifact tracks user executions of GUI programs, storing run counts and execution times?',
              options: [
                "Amcache",
                "UserAssist",
                "RunMRU",
                "Shimcache"
              ],
              correctOption: 1,
              explanation: 'The UserAssist key in the NTUSER.DAT hive tracks when and how many times a user executed GUI programs on the system.'
            }
          ]
        },
        {
          id: 'incident-response',
          title: 'Incident Response Lifecycle',
          description: 'Master the NIST incident response lifecycle, containment strategies, and recovery playbooks.',
          duration: '18 mins',
          content: `### Incident Response Lifecycle

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** SOC Triage & Lifecycle, Digital Forensics Analysis, Email Protocols, Authentication & Phishing Defense  

#### Learning Objectives
- Execute the four classic operational phases of **NIST SP 800-61** alongside **Rev. 3** integration with **NIST CSF 2.0**.
- Coordinate short-term **Containment**, root-cause **Eradication**, and validated **Recovery** actions without prematurely tipping off intruders.
- Conduct blameless **Post-Incident Activity** (Lessons Learned) reviews that harden controls and detection playbooks.

#### Why It Matters
During an active breach, ad-hoc panic leads teams to wipe hosts before finding how attackers got in—guaranteeing re-compromise hours later. Following the NIST Incident Response lifecycle ensures containment stops the bleeding immediately, eradication closes the actual root entry point, and recovery restores clean operations with continuous monitoring.

#### Prerequisites & Connections
This Tier 2 capstone synthesizes **SOC Triage & Lifecycle**, **Digital Forensics Analysis**, and **Email Protocols, Authentication & Phishing Defense**, uniting phishing triage, alert analysis, and evidence handling into an end-to-end organizational response workflow. It also prepares you for **Advanced & Professional Certifications**.

#### Core Explanation
Incident response follows a structured, cyclical model under **NIST SP 800-61**:
- **Classic Operational Phases:**
  1. **Preparation:** Pre-incident readiness—playbooks, backups, contact trees, EDR/SIEM telemetry, and tabletop exercises.
  2. **Detection & Analysis:** Confirming anomalies, scoping affected hosts/identities, and preserving evidence.
  3. **Containment, Eradication & Recovery:** Halting spread (isolating endpoints, revoking tokens), eliminating root persistence and patching vulnerabilities (**Eradication**), and restoring verified clean services (**Recovery**).
  4. **Post-Incident Activity:** Conducting **Lessons Learned** reviews to feed root-cause fixes back into defenses.
- **NIST SP 800-61 Rev. 3 Alignment:** Links ongoing incident response directly to the six **NIST CSF 2.0** functions (**Govern, Identify, Protect, Detect, Respond, Recover**), embedding legal, executive, and supply-chain governance throughout every response phase.

#### How It Works
When an alert confirms an active intruder via compromised credentials and a phishing mailbox rule: responders isolate affected endpoints and revoke active SSO sessions simultaneously (**Containment**), remove malicious scheduled tasks, reset credentials, and patch the exposed entry point (**Eradication**), restore affected databases from verified offline backups with enhanced SIEM alerting (**Recovery**), and hold a 48-hour **Lessons Learned** review to close detection gaps.

#### Real-World Context
Organizations frequently make the mistake of resetting a single compromised user password *before* isolating the infected host or checking for persistent OAuth app consents. Under structured containment and eradication, responders map *every* persistence mechanism (sessions, API tokens, mailbox forwarding rules, scheduled tasks) and close them together in a coordinated cutover window.

#### Examples
Sequencing a coordinated containment-to-recovery checklist for an intrusion:
\`\`\`yaml
incident_playbook: "IR-2026-Credential-And-Endpoint-Compromise"
phases:
  1_preparation: "Immutable offline backups tested; EDR isolation & SIEM logs verified"
  2_detection_analysis: "Scope infected hosts, OAuth tokens, and forwarded mailbox rules"
  3_containment: "EDR network isolate endpoints; block C2 IoCs; revoke active sessions"
  4_eradication: "Remove persistence keys/tasks; rotate secrets; patch entry CVE"
  5_recovery: "Rebuild compromised VMs from golden image; monitor heightened alerts"
  6_post_incident: "Publish blameless Lessons Learned report + update SOC rules"
\`\`\`

#### Security Relevance
- **Defensive Value:** Separating Containment (stop damage right now) from Eradication (remove root cause completely) and Lessons Learned (prevent recurrence) turns chaotic crises into disciplined engineering execution.
- **Attacker Misuse:** Intrusion actors often plant backup persistence (secondary admin accounts, dormant OAuth apps, web shells) expecting defenders who skip structured analysis to celebrate early after deleting only the first malware file.

#### Common Mistakes
- Jumping straight to Eradication (deleting files/wiping disks) before Containment and evidence preservation.
- Failing to revoke long-lived cloud sessions, SSH keys, or OAuth tokens during Eradication.
- Skipping **Post-Incident Activity (Lessons Learned)** once systems come back online, leaving the original vulnerability open.

#### Key Takeaways
- **NIST SP 800-61** defines four core operational phases (**Preparation; Detection & Analysis; Containment, Eradication & Recovery; Post-Incident Activity**), aligned in **Rev. 3** with **NIST CSF 2.0**.
- **Containment** halts active spread; **Eradication** removes malware and patches root flaws; **Lessons Learned** closes process and rule gaps permanently.

#### Knowledge Check
- Why can deleting malware during Eradication without prior Containment or forensic scoping allow an attacker to return immediately?
- How does NIST SP 800-61 Rev. 3 connect day-to-day incident response to NIST CSF 2.0?
- What specific deliverables make a Post-Incident Lessons Learned session concrete rather than generic?

#### Further Learning
Review NIST SP 800-61 Rev. 3 and draft a one-page tabletop exercise scenario testing containment handoffs between SOC, IT, and Legal.`,
          quiz: [
            {
              id: 'q-ir-1',
              question: 'What are the four classic operational phases of the NIST Incident Response lifecycle (NIST SP 800-61)?',
              options: [
                "Govern, Identify, Protect, Detect, Respond, and Recover functions",
                "Plan, Do, Check, and Act continuous operational cycle",
                "Preparation; Detection & Analysis; Containment/Eradication/Recovery; Post-Incident",
                "Reconnaissance, Exploitation, Lateral Movement, and Actions on Objectives"
              ],
              correctOption: 2,
              explanation: 'NIST SP 800-61 defines these four operational incident response phases (which NIST SP 800-61 Rev. 3 further embeds within continuous NIST CSF 2.0 risk management).'
            },
            {
              id: 'q-ir-2',
              question: 'During which phase of the incident response lifecycle is malware removed and vulnerability patching completed?',
              options: [
                "Eradication",
                "Detection",
                "Containment",
                "Recovery"
              ],
              correctOption: 0,
              explanation: 'Eradication focuses on completely removing threat actors, malware, and security vulnerabilities from the environment.'
            },
            {
              id: 'q-ir-3',
              question: 'What is the primary goal of the "Containment" phase of incident response?',
              options: [
                "To rebuild clean production workloads from verified offline backups.",
                "To stop lateral spread and limit total operational damage quickly.",
                "To draft formal regulatory breach notifications for executive leadership.",
                "To attribute the intrusion conclusively to a specific external actor."
              ],
              correctOption: 1,
              explanation: 'Containment focuses on stopping active attacks from spreading to other systems or exfiltrating more data.'
            },
            {
              id: 'q-ir-4',
              question: 'Why is the "Post-Incident Activity" (Lessons Learned) phase critical in incident response?',
              options: [
                "It executes automated vulnerability scans across newly built hosts.",
                "It resets compromised user passwords and revokes active OAuth tokens.",
                "It deploys updated endpoint detection agents across remote branches.",
                "It uncovers process gaps and updates playbooks to harden future defense."
              ],
              correctOption: 3,
              explanation: 'Lessons Learned reviews analyze the response effort to identify bottlenecks, rule gaps, and process improvements, updating security baselines.'
            }
          ]
        }
      ]
    }
  ]
};
