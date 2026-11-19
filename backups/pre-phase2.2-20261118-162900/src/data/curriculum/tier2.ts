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
**Prerequisites:** None  

#### Learning Objectives
- Enforce the core pillars of the CIA Triad.
- Implement Authentication, Authorization, and Accounting (AAA).
- Configure Multi-Factor Authentication (MFA) parameters.

#### Key Concepts
- **CIA Triad:** Confidentiality (preventing unauthorized disclosures), Integrity (preventing unauthorized modifications), and Availability (ensuring systems are accessible).
- **AAA Model:** Authentication (verifying identity), Authorization (enforcing access rights), and Accounting (logging user activity).
- **Least Privilege:** Providing users with only the minimum access level required to perform their duties.

#### Detailed Lesson Content
Every defensive security program is built on the **CIA Triad** and **AAA Model**. 
- **Authentication** verifies who a user is (via factors of something you know, have, or are).
- **Authorization** defines what they are permitted to do based on the principle of **least privilege**.
- **Accounting** ensures that every action is recorded in immutable audit logs to maintain a complete history of system activity, which is essential for detecting insider threats and compliance auditing.`,
          quiz: [
            {
              id: 'q-cia-1',
              question: 'Which pillar of the CIA Triad is compromised when a ransomware attack encrypts a critical corporate database?',
              options: [
                'Confidentiality',
                'Integrity',
                'Availability',
                'Accountability'
              ],
              correctOption: 2,
              explanation: 'Ransomware compromises Availability by denying users access to critical systems and data until a ransom is paid.'
            },
            {
              id: 'q-cia-2',
              question: 'What is the role of "Accounting" in the AAA security model?',
              options: [
                'Verifying user passwords',
                'Assigning folder access permissions',
                'Tracking and recording user actions and system changes in audit logs',
                'Enforcing multi-factor authentication'
              ],
              correctOption: 2,
              explanation: 'Accounting tracks resource consumption and user actions, maintaining a comprehensive audit log for security reviews.'
            },
            {
              id: 'q-cia-3',
              question: 'Which authentication factor category does a fingerprint scan fall under?',
              options: [
                'Something you know',
                'Something you have',
                'Something you are',
                'Somewhere you are'
              ],
              correctOption: 2,
              explanation: 'Biometric identifiers like fingerprints and facial recognition are categorized as "something you are".'
            },
            {
              id: 'q-cia-4',
              question: 'Which principle limits user access permissions to only the minimum necessary to complete their specific job functions?',
              options: [
                'Defense in Depth',
                'Separation of Duties',
                'Principle of Least Privilege',
                'Implicit Allow'
              ],
              correctOption: 2,
              explanation: 'The Principle of Least Privilege limits user rights to only the minimal resources required for their role, reducing potential damage from account compromise.'
            }
          ]
        },
        {
          id: 'risk-threat-model',
          title: 'Risk Management & Threat Modeling',
          description: 'Apply threat modeling methodologies and establish vulnerability remediation registers.',
          duration: '18 mins',
          content: `### Risk Management & Threat Modeling

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Defensive Frameworks & AAA  

#### Learning Objectives
- Map system vulnerabilities using the STRIDE threat modeling framework.
- Calculate business risk priorities using impact and likelihood matrix maps.
- Deploy automated vulnerability scanners.

#### Key Concepts
- **STRIDE:** Microsoft threat modeling framework (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
- **Risk Assessment:** Evaluating threats based on Likelihood and Impact.
- **Vulnerability Management:** The continuous process of identifying, classifying, prioritizing, and remediating software flaws.

#### Detailed Lesson Content
Defensive architectures require proactive modeling. The **STRIDE** framework allows engineers to identify and mitigate threats early in the software development lifecycle:
- **S**poofing is mitigated using robust Authentication.
- **T**ampering is prevented via Integrity controls.
- **R**epudiation is handled through non-repudiating Accounting logs.
- **I**nformation Disclosure is blocked with Encryption (Confidentiality).
- **D**enial of Service is mitigated via redundant high-availability structures.
- **E**levation of Privilege is stopped with strict Authorization controls.`,
          quiz: [
            {
              id: 'q-tm-1',
              question: 'Which STRIDE category represents the threat of an attacker modifying database records without authorization?',
              options: [
                'Repudiation',
                'Information Disclosure',
                'Tampering',
                'Spoofing'
              ],
              correctOption: 2,
              explanation: 'Tampering is the unauthorized alteration of data or system parameters, directly compromising Integrity.'
            },
            {
              id: 'q-tm-2',
              question: 'Under STRIDE, what threat is directly mitigated by implementing robust, non-repudiation logging systems?',
              options: [
                'Spoofing',
                'Repudiation',
                'Information Disclosure',
                'Denial of Service'
              ],
              correctOption: 1,
              explanation: 'Repudiation represents users denying they performed specific actions. Immutable logging ensures non-repudiation: actions can be traced to specific accounts.'
            },
            {
              id: 'q-tm-3',
              question: 'How is risk classically calculated in standard risk assessment matrices?',
              options: [
                'Threat x Vulnerability x Asset Value',
                'Likelihood x Impact',
                'Asset Value / Cost of Controls',
                'Exposure Factor x Single Loss Expectancy'
              ],
              correctOption: 1,
              explanation: 'Risk is classically evaluated by multiplying the Likelihood of an event occurring by its potential business Impact.'
            },
            {
              id: 'q-tm-4',
              question: 'What is the primary objective of running regular vulnerability scans across corporate networks?',
              options: [
                'To automatically patch operating system kernels',
                'To proactively identify known software vulnerabilities and configuration flaws before attackers can exploit them',
                'To block incoming DDoS attacks',
                'To capture active network traffic sessions'
              ],
              correctOption: 1,
              explanation: 'Vulnerability scanners sweep systems to locate unpatched services, default configurations, and other security vulnerabilities.'
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

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Map attacker stages using the Cyber Kill Chain.
- Pivot between MITRE ATT&CK techniques during alert triages.
- Classify security alerts as True Positive (TP) or False Positive (FP).

#### Key Concepts
- **SOC (Security Operations Center):** Centralized team monitoring, detecting, and responding to cyber threats.
- **MITRE ATT&CK:** Globally accessible knowledge base of adversary tactics, techniques, and procedures (TTPs).
- **Cyber Kill Chain:** Lockheed Martin framework describing the seven phases of a cyberattack.
- **Alert Triage:** Analyzing incoming security alerts to determine if they represent actual compromises.

#### Detailed Lesson Content
Inside a Security Operations Center, analysts monitor high-velocity alerts. To coordinate investigations, analysts use frameworks like **MITRE ATT&CK** and the **Cyber Kill Chain** to map attacker actions.
When an alert triggers, analysts must verify if it is a **True Positive** (an actual security incident) or a **False Positive** (benign system behavior misidentified by detection rules), prioritizing and containing matched incidents according to playbooks.`,
          quiz: [
            {
              id: 'q-soc-1',
              question: 'In the Cyber Kill Chain, which phase represents the construction of an exploit coupled with a backdoor payload?',
              options: [
                'Reconnaissance',
                'Weaponization',
                'Delivery',
                'Exploitation'
              ],
              correctOption: 1,
              explanation: 'Weaponization is the pairing of an exploit with a malicious payload (e.g., embedding a macro inside a document) before delivery.'
            },
            {
              id: 'q-soc-2',
              question: 'Which framework is a structured matrix of real-world adversary behaviors, tactics, and techniques?',
              options: [
                'NIST Cybersecurity Framework',
                'MITRE ATT&CK',
                'ISO 27001',
                'CVSS Calculator'
              ],
              correctOption: 1,
              explanation: 'MITRE ATT&CK maps specific techniques and behaviors used by real-world threat actors, assisting analysts in detection and mitigation.'
            },
            {
              id: 'q-soc-3',
              question: 'What is a security alert called that triggers on normal, benign administrative scripts?',
              options: [
                'True Positive',
                'False Positive',
                'True Negative',
                'False Negative'
              ],
              correctOption: 1,
              explanation: 'A False Positive is an alert that incorrectly flags benign activity as malicious, requiring rule tuning to reduce alert fatigue.'
            },
            {
              id: 'q-soc-4',
              question: 'What is the primary purpose of incident triage playbooks in a SOC?',
              options: [
                'To automate developer code deployment',
                'To provide standardized step-by-step instructions for analyzing, prioritizing, and containing specific threat alerts',
                'To calculate annual budget allocations',
                'To manage company email infrastructures'
              ],
              correctOption: 1,
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

**Difficulty:** Medium  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** SOC Triage & Lifecycle  

#### Learning Objectives
- Analyze system logs across Windows and Linux.
- Deploy and configure Microsoft Sysmon for deep host monitoring.
- Track malware process creation and network connections using Sysmon Event IDs.

#### Key Concepts
- **Syslog:** Standard logging framework used across Linux and Unix platforms.
- **Sysmon (System Monitor):** A Windows system service that logs process creation, network connections, and file modifications in the Windows Event Log.
- **Sysmon Event ID 1:** Process Creation (captures parent processes and command lines).
- **Sysmon Event ID 3:** Network Connection (logs socket connections, IPs, and port bindings).

#### Hands-On Lab: Querying Sysmon Log Telemetry
Use PowerShell to inspect Sysmon events and trace process creations:
\`\`\`powershell
# Search for process creation events (Event ID 1) involving PowerShell
Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Sysmon/Operational';ID=1} -MaxEvents 5 | Format-List
\`\`\`

#### Detailed Lesson Content
Host-based auditing is critical for detecting evasive threats. Standard Windows Security logs record basic actions, but installing **Sysmon** provides deep telemetry:
- **Sysmon Event ID 1 (Process Creation)** captures parent processes, command-line arguments, and file hashes, allowing you to trace malicious processes (like a word processor launching PowerShell).
- **Sysmon Event ID 3 (Network Connection)** logs active connections established by local processes, helping you spot outbound command-and-control (C2) beacons.
- **Sysmon Event ID 11 (FileCreate)** monitors the creation of new files, which is useful for tracking downloaded payloads.`,
          quiz: [
            {
              id: 'q-sys-1',
              question: 'Which Sysmon Event ID tracks Process Creation, including the full command-line strings and parent processes?',
              options: [
                'Event ID 1',
                'Event ID 3',
                'Event ID 7',
                'Event ID 11'
              ],
              correctOption: 0,
              explanation: 'Sysmon Event ID 1 captures detailed process creation metadata, which is critical for finding malicious command executions.'
            },
            {
              id: 'q-sys-2',
              question: 'Which Sysmon Event ID tracks outbound network sockets opened by local executable programs?',
              options: [
                'Event ID 1',
                'Event ID 3',
                'Event ID 5',
                'Event ID 11'
              ],
              correctOption: 1,
              explanation: 'Event ID 3 logs network connections made by system processes, including destination IP addresses and ports.'
            },
            {
              id: 'q-sys-3',
              question: 'What is the primary advantage of Sysmon over standard Windows Security logging?',
              options: [
                'Sysmon blocks exploits automatically.',
                'Sysmon provides deeper host telemetry, including process command lines, file hashes, and network connections.',
                'Sysmon runs in kernel-space and cannot be bypassed.',
                'Sysmon encrypts the entire hard disk drive.'
              ],
              correctOption: 1,
              explanation: 'Sysmon provides advanced endpoint telemetry that standard event logs omit, such as parent/child relationships and executable hashes.'
            },
            {
              id: 'q-sys-4',
              question: 'Where are Linux authentication records, SSH sessions, and sudo privilege changes recorded?',
              options: [
                '/var/log/syslog',
                '/var/log/auth.log or /var/log/secure',
                '/var/log/dmesg',
                '/var/log/nginx/access.log'
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

**Difficulty:** Hard  
**Estimated Study Time:** 22 Minutes  
**Prerequisites:** Endpoint Auditing & Sysmon  

#### Learning Objectives
- Describe the pipeline architecture of a SIEM system.
- Write Splunk SPL search queries.
- Build correlation rules to trigger alerts on security incidents.

#### Key Concepts
- **SIEM:** Security Information and Event Management (consolidates, indexes, and correlates log data).
- **SPL (Search Processing Language):** Query language used to search and analyze indexed logs in Splunk.
- **Correlation Rule:** Logic that triggers an alert when a specific sequence of log events occurs (e.g., 5 failed logons followed by a successful login).
- **Log Indexing:** Storing parsed log data in a structured, searchable database.

#### Hands-On Lab: Writing Splunk Queries
Identify potential brute-force attempts using Splunk search queries:
\`\`\`splunk
# Query failed logons and group them by source IP
index=windows event_id=4625 
| stats count by src_ip, TargetUserName 
| where count > 10
\`\`\`

#### Detailed Lesson Content
A **SIEM** (such as Splunk or Elastic) acts as the central brain of a SOC. It collects, parses, and normalizes logs from firewalls, servers, and endpoints.
Using **Search Processing Language (SPL)**, analysts can search across billions of logs to investigate incidents. Correlation rules run continuously in the background, matching event patterns to alert analysts to active threats, like lateral movement or data exfiltration.`,
          quiz: [
            {
              id: 'q-siem-1',
              question: 'Which Splunk query command compiles calculated metrics and counts, grouping results by specified fields?',
              options: [
                'search',
                'stats',
                'table',
                'eval'
              ],
              correctOption: 1,
              explanation: 'The "stats" command is used in Splunk SPL to perform aggregations like count, average, and sum, grouping them by target fields.'
            },
            {
              id: 'q-siem-2',
              question: 'Which of the following defines a SIEM correlation rule?',
              options: [
                'A rule that encrypts system logs.',
                'Logical criteria that triggers an alert when specific patterns or sequences of security events occur across different log sources.',
                'A process that automatically backs up databases.',
                'A script that cleans local temporary files.'
              ],
              correctOption: 1,
              explanation: 'Correlation rules analyze data from multiple sources in real-time, triggering alerts when patterns indicating potential attacks are matched.'
            },
            {
              id: 'q-siem-3',
              question: 'What is the role of the log parser in a SIEM ingestion pipeline?',
              options: [
                'To block malicious IP addresses.',
                'To read raw log strings and extract fields like timestamps, IPs, usernames, and actions into structured formats.',
                'To delete historical security logs.',
                'To generate automatic report documents.'
              ],
              correctOption: 1,
              explanation: 'Parsers normalize raw log strings, extracting key attributes into indexed fields to make them searchable and reportable.'
            },
            {
              id: 'q-siem-4',
              question: 'What does logon type 3 represent in Windows Security event 4624 records?',
              options: [
                'Interactive physical keyboard logon',
                'Network logon (such as accessing a shared folder or IIS website)',
                'Remote Desktop (RDP) logon',
                'System service startup'
              ],
              correctOption: 1,
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

**Difficulty:** Medium  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Differentiate between traditional Antivirus, EDR, and XDR systems.
- Explain signature-based and heuristic detection methods.
- Define threat hunting workflows.

#### Key Concepts
- **Antivirus (AV):** Signature-based protection designed to block known malware payloads.
- **EDR (Endpoint Detection and Response):** Real-time monitoring agent that logs host behavior to detect and isolate advanced threat actors.
- **XDR (Extended Detection and Response):** Integrates telemetry from endpoints, network logs, and cloud security suites to provide unified threat analysis.

#### Detailed Lesson Content
Traditional **Antivirus** is effective against known malware by matching file hashes to signature databases. However, modern adversaries bypass AV using fileless attacks, run-time encryption, and living-off-the-land techniques.
To counter this, organizations deploy **EDR (Endpoint Detection and Response)** agents. EDR logs real-time host behavior (like registry edits, memory modifications, and network connections) to detect anomalies, allowing analysts to isolate compromised hosts from the network instantly. **XDR** extends this capability by correlating endpoint data with network and cloud telemetry.`,
          quiz: [
            {
              id: 'q-edr-1',
              question: 'What is the primary advantage of EDR over traditional Antivirus (AV)?',
              options: [
                'EDR requires less CPU processing overhead.',
                'EDR monitors live process behaviors, memory modifications, and network connections, enabling detection of unknown or fileless attacks.',
                'EDR operates at Layer 2 of the network.',
                'EDR deletes system logs to prevent inspection.'
              ],
              correctOption: 1,
              explanation: 'EDR focuses on behavior and telemetry rather than just static file signatures, allowing it to detect and respond to advanced fileless attacks.'
            },
            {
              id: 'q-edr-2',
              question: 'What is the term used to describe malware attacks that execute entirely in RAM using native system tools, without writing files to disk?',
              options: [
                'Ransomware',
                'Fileless Malware',
                'Trojan Horse',
                'Rootkit'
              ],
              correctOption: 1,
              explanation: 'Fileless malware executes directly in memory using trusted system tools like PowerShell or WMI, bypassing traditional file-based AV scanners.'
            },
            {
              id: 'q-edr-3',
              question: 'What is the primary function of an EDR "Network Isolation" action?',
              options: [
                'To shut down the physical server.',
                'To logically disconnect the compromised host from the network while maintaining the EDR connection for analysis.',
                'To encrypt the local hard drive.',
                'To update the system\'s BIOS.'
              ],
              correctOption: 1,
              explanation: 'Network isolation blocks a compromised host from communicating with other local and external systems, preventing lateral movement and data exfiltration.'
            },
            {
              id: 'q-edr-4',
              question: 'Which technology integrates telemetry from endpoints, network firewalls, and cloud environments to provide unified threat detection?',
              options: [
                'Traditional AV',
                'EDR',
                'XDR',
                'SIEM Forwarders'
              ],
              correctOption: 2,
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

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Endpoint Security (AV, EDR, XDR)  

#### Learning Objectives
- Compare Intrusion Detection (IDS) and Intrusion Prevention (IPS) systems.
- Write custom Snort and Suricata detection rules.
- Analyze raw PCAP packet captures using Wireshark to locate cleartext credentials and exploit payloads.

#### Key Concepts
- **IDS vs. IPS:** An IDS monitors network traffic and alerts analysts to threats, while an IPS sits inline and blocks malicious traffic automatically.
- **Snort / Suricata:** Open-source signature-based network intrusion detection systems.
- **Wireshark:** A packet analysis utility that captures and dissects network traffic at a granular level.
- **PCAP (Packet Capture):** A standardized file format containing raw captured network packet streams.

#### Hands-On Lab: Writing Snort Signatures
Write a Snort rule to detect incoming ping requests (ICMP):
\`\`\`snort
# Snort rule structure
alert icmp any any -> $HOME_NET any (msg:"ICMP Ping Attempt Detected"; sid:1000001; rev:1;)
\`\`\`

#### Detailed Lesson Content
Network-level defense relies on packet inspection. **IDS** and **IPS** systems scan network traffic for signatures or anomalies:
- **Snort** and **Suricata** use structured rules to analyze packet headers and payloads.
- **Wireshark** allows analysts to open packet capture files (**PCAPs**) to dissect traffic, analyze protocol structures, and rebuild TCP streams to identify threat payloads or data leaks.`,
          quiz: [
            {
              id: 'q-nd-1',
              question: 'What is the primary operational difference between an Intrusion Detection System (IDS) and an Intrusion Prevention System (IPS)?',
              options: [
                'An IDS runs on endpoints; an IPS runs on network firewalls.',
                'An IDS monitors and alerts on threats; an IPS sits inline and actively blocks malicious packets.',
                'An IDS encrypts network traffic; an IPS decrypts it.',
                'An IDS only scans UDP traffic; an IPS only scans TCP.'
              ],
              correctOption: 1,
              explanation: 'An IPS is deployed inline, allowing it to drop packets and terminate connections automatically when a threat is detected, while an IDS only alerts analysts.'
            },
            {
              id: 'q-nd-2',
              question: 'In a Snort rule, what does the first keyword (such as "alert" or "drop") represent?',
              options: [
                'The Rule Option',
                'The Rule Action',
                'The Protocol Definition',
                'The Signature Identifier'
              ],
              correctOption: 1,
              explanation: 'The first field in a Snort rule defines the Action (e.g., alert, log, pass, drop) to take when traffic matches the rule criteria.'
            },
            {
              id: 'q-nd-3',
              question: 'Which Wireshark feature allows analysts to reconstruct complete TCP sessions to view cleartext payloads in sequential order?',
              options: [
                'Apply as Filter',
                'Follow TCP Stream',
                'Protocol Dissection',
                'Expert Information'
              ],
              correctOption: 1,
              explanation: '"Follow TCP Stream" reconstructs the data exchange in a human-readable layout, which is highly useful for tracing protocol traffic.'
            },
            {
              id: 'q-nd-4',
              question: 'What type of network analysis captures traffic directly from a physical network link or tap for analysis?',
              options: [
                'Endpoint Logs',
                'Packet Sniffing / Deep Packet Inspection',
                'Vulnerability Scanning',
                'Firewall Log Ingestion'
              ],
              correctOption: 1,
              explanation: 'Packet sniffing captures raw packet frames directly from physical networks, allowing deep analysis of network traffic.'
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

**Difficulty:** Hard  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Enforce Chain of Custody documentation during evidence acquisition.
- Acquire forensically sound disk images.
- Analyze volatile memory dumps using the Volatility framework.
- Extract file execution timelines.

#### Key Concepts
- **Chain of Custody:** Detailed documentation tracking the collection, handling, and analysis of physical and digital evidence.
- **Write Blocker:** Hardware or software device that prevents modification of physical drives during evidence acquisition.
- **Memory Forensics:** Analyzing volatile memory dumps (RAM) to locate processes, encryption keys, and network connections.
- **Registry Forensics:** Auditing Windows registry hives to trace file execution histories and device connections.

#### Hands-On Lab: Memory Extraction
Use Volatility to audit active processes in a memory dump file:
\`\`\`bash
# Run volatility profile to check active process list
volatility -f memdump.raw --profile=Win7SP1x64 pslist
\`\`\`

#### Detailed Lesson Content
Digital forensics requires precise processes to ensure evidence remains admissible in court. Analysts use **Write Blockers** to copy storage media without modifying the source drive.
Analyzing volatile RAM is critical, as it holds real-time data that is lost on reboot: **Volatility** is an open-source framework used to extract active processes, network connections, and loaded DLLs from memory dumps. Registry analysis also provides deep forensic insights, tracking execution history keys (like UserAssist) and connected USB devices.`,
          quiz: [
            {
              id: 'q-df-1',
              question: 'What is the purpose of using a Write Blocker during digital evidence collection?',
              options: [
                'To speed up drive copying.',
                'To prevent any modification or write operations to the source media during evidence acquisition.',
                'To automatically encrypt the acquired image.',
                'To scan the drive for active viruses.'
              ],
              correctOption: 1,
              explanation: 'Write Blockers intercept write signals sent by the host system, ensuring the source evidence remains completely unaltered during acquisition.'
            },
            {
              id: 'q-df-2',
              question: 'Which framework is standard for analyzing volatile RAM dumps to recover active processes, open sockets, and loaded drivers?',
              options: [
                'Wireshark',
                'Nmap',
                'Volatility',
                'Autopsy'
              ],
              correctOption: 2,
              explanation: 'Volatility is an advanced command-line memory forensics framework designed to analyze volatile data dumps from RAM.'
            },
            {
              id: 'q-df-3',
              question: 'Which of the following describes "Chain of Custody"?',
              options: [
                'The folder hierarchy on a backup server.',
                'A detailed, chronological document tracking the seizure, custody, control, transfer, and analysis of physical or digital evidence.',
                'The process of isolating compromised systems.',
                'The firewall rules protecting a DMZ.'
              ],
              correctOption: 1,
              explanation: 'Chain of Custody documentation tracks who handled evidence, when, and why, proving evidence was not tampered with and maintaining its integrity.'
            },
            {
              id: 'q-df-4',
              question: 'Which Windows Registry artifact tracks user executions of GUI programs, storing run counts and execution times?',
              options: [
                'Shimcache',
                'UserAssist',
                'Amcache',
                'RunMRU'
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

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Digital Forensics Analysis  

#### Learning Objectives
- List the phases of the NIST Incident Response lifecycle.
- Apply containment, eradication, and recovery strategies.
- Draft Lessons Learned documentation.

#### Key Concepts
- **NIST SP 800-61:** Standard incident response lifecycle: 1. Preparation, 2. Detection & Analysis, 3. Containment, Eradication & Recovery, 4. Post-Incident Activity.
- **Containment:** Short-term containment strategies to limit damage (e.g., isolating a compromised host).
- **Eradication:** Removing malware, deleting compromised credentials, and patching vulnerabilities.
- **Recovery:** Restoring systems to normal operation and monitoring for indicators of compromise.

#### Detailed Lesson Content
When a security incident occurs, organizations follow structured playbooks to minimize damage and restore operations. The **NIST Incident Response** framework defines a continuous lifecycle for managing incidents.
- **Preparation** involves setting up monitoring systems, defining playbooks, and establishing the incident response team.
- **Detection & Analysis** is the identification of anomalous behavior and alert validation.
- **Containment, Eradication & Recovery** involves containing the threat (e.g., isolating hosts, disabling accounts), eradicating the root cause (e.g., deleting malware, patching flaws), and recovering systems safely.
- **Post-Incident Activity** completes the lifecycle: teams conduct a **Lessons Learned** review to analyze the incident, identify gaps, and update playbooks to prevent future attacks.`,
          quiz: [
            {
              id: 'q-ir-1',
              question: 'What are the four phases of the NIST Incident Response lifecycle (NIST SP 800-61)?',
              options: [
                'Plan, Do, Check, Act',
                'Preparation; Detection & Analysis; Containment, Eradication & Recovery; Post-Incident Activity',
                'Reconnaissance, Exploitation, Lateral Movement, Actions on Objectives',
                'Identify, Protect, Detect, Respond'
              ],
              correctOption: 1,
              explanation: 'NIST SP 800-61 outlines this four-step lifecycle as the standard framework for managing cybersecurity incidents.'
            },
            {
              id: 'q-ir-2',
              question: 'During which phase of the incident response lifecycle is malware removed and vulnerability patching completed?',
              options: [
                'Detection',
                'Containment',
                'Eradication',
                'Recovery'
              ],
              correctOption: 2,
              explanation: 'Eradication focuses on completely removing threat actors, malware, and security vulnerabilities from the environment.'
            },
            {
              id: 'q-ir-3',
              question: 'What is the primary goal of the "Containment" phase of incident response?',
              options: [
                'To identify the attacker\'s identity.',
                'To limit the scope and damage of the incident, preventing lateral spread across networks.',
                'To restore systems from backup.',
                'To write security reports.'
              ],
              correctOption: 1,
              explanation: 'Containment focuses on stopping active attacks from spreading to other systems or exfiltrating more data.'
            },
            {
              id: 'q-ir-4',
              question: 'Why is the "Post-Incident Activity" (Lessons Learned) phase critical in incident response?',
              options: [
                'It allows the team to run vulnerability scans.',
                'It identifies process gaps and updates playbooks to improve defense and response to future incidents.',
                'It is used to reset user passwords.',
                'It automatically deplues EDR agents.'
              ],
              correctOption: 1,
              explanation: 'Lessons Learned reviews analyze the response effort to identify bottlenecks, rule gaps, and process improvements, updating security baselines.'
            }
          ]
        }
      ]
    }
  ]
};
