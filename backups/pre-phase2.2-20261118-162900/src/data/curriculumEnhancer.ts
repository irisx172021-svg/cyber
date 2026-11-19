import { Tier, Lesson } from '../types';
import {
  DomainGuideKey,
  EXPLICIT_LESSON_DOMAIN_MAP,
  LESSON_METADATA,
  TIER_METADATA,
  TOPIC_METADATA,
} from './curriculumMetadata';

// Precise homework configuration map for lessons that require terminal verification
const LESSON_TERMINALS: Record<string, { command: string; instruction: string; hint: string; regex: string }> = {
  'comp-hardware': {
    command: 'lscpu',
    instruction: 'Run `lscpu` or `lsblk` or `free -h` in your local machine\'s terminal to inspect your system hardware specifications.',
    hint: 'Ensure your pasted output contains CPU architecture fields (e.g., "Architecture:", "x86_64", "Model name:") or storage/memory indicators (e.g., "NAME", "MAJ:MIN", "Mem:", "total").',
    regex: 'architecture|x86_64|model name|vendor id|cpu|lsblk|name\\s+maj|sda\\d*|mem:\\s+\\d+|total\\s+used'
  },
  'boot-os': {
    command: 'df -hT',
    instruction: 'Execute `df -hT` (on Linux/macOS) or `wmic logicaldisk get size,freespace` (on Windows) to view disk partition tables and space utilization.',
    hint: 'Output should display active filesystems, mount points, or size metrics (e.g., "Filesystem", "Type", "Mounted on", "Size", "FreeSpace").',
    regex: 'filesystem|type|mounted on|logicaldisk|size|freespace|capacity'
  },
  'net-osi-tcp': {
    command: 'ip addr show',
    instruction: 'Run connection topology adapter command `ip addr show` (on Linux) or `ifconfig` (macOS) or `ipconfig` (Windows) to print active link states.',
    hint: 'Pasted output must show link indicators, interfaces, or IP network configuration lines (e.g., "inet", "netmask", "ether", "IPv4 Address", "subnet").',
    regex: 'inet\\s+|netmask|ether|flags=|ipconfig|ipv4 address|ethernet adapter|wireless lan|subnet mask'
  },
  'ip-subnetting': {
    command: 'ipcalc 192.168.1.0/24',
    instruction: 'Calculate subnet footprints using `ipcalc 192.168.1.0/24` or analyze CIDR mask boundaries with local network utilities.',
    hint: 'Output should demonstrate subnet division specs, masks, or hosts counts (e.g., "Netmask:", "HostMin:", "HostMax:", "Broadcast:", "Hosts/Net:").',
    regex: 'netmask|hostmin|hostmax|broadcast|hosts/net|address|cidr'
  },
  'infra-protocols': {
    command: 'dig google.com',
    instruction: 'Execute DNS lookup using `dig google.com` or `nslookup google.com` to inspect standard dynamic infrastructure records.',
    hint: 'Output must include valid query answer sections, server mappings, or root lookups (e.g., "ANSWER SECTION", "Non-authoritative answer:", "Address:", "A").',
    regex: 'answer section|non-authoritative answer|address:|google\\.com|\\bA\\b'
  },
  'transport-protocols': {
    command: 'ss -tuln',
    instruction: 'Scan active transport socket listings using `ss -tuln` (Linux) or `netstat -an` to identify local listening ports.',
    hint: 'Output must demonstrate socket states (e.g., "LISTEN", "ESTABLISHED", "Local Address", "Proto", "TCP", "UDP").',
    regex: 'listen|established|local address|proto|tcp|udp|state'
  },
  'vpn-firewalls': {
    command: 'iptables -L -n',
    instruction: 'Query firewall rulesets with `iptables -L -n` or inspect local rules with `netsh advfirewall show allprofiles` as Administrator.',
    hint: 'Pasted logs must represent firewall chain policies (e.g., "Chain INPUT", "Chain FORWARD", "policy ACCEPT", "advfirewall", "profiles").',
    regex: 'chain input|chain forward|chain output|profiles|firewall state|advfirewall|policy accept'
  },
  'lin-fs': {
    command: 'ls -la /etc',
    instruction: 'List file nodes inside the system configuration path by running `ls -la /etc`.',
    hint: 'Output must demonstrate Unix file permissions, files owner fields, or structural configurations (e.g., "passwd", "hosts", "resolv.conf", "drwxr-xr-x").',
    regex: 'passwd|hosts|resolv\\.conf|drwxr-xr-x|-rw-r--r--'
  },
  'lin-permissions': {
    command: 'ls -la',
    instruction: 'Audit file directories using access mask verification command `ls -la` to check owner blocks.',
    hint: 'Pasted text must demonstrate 10-character permissions blocks (e.g., "drwxr-xr-x", "-rw-rw-r--") or list "total" file counts.',
    regex: '[drwx-]{10}|total\\s+\\d+'
  },
  'bash-scripting': {
    command: 'bash --version',
    instruction: 'Run script engine version probe `bash --version` to identify your active Unix shell execution parameters.',
    hint: 'Output must report valid GNU Bash build identifiers (e.g., "GNU bash, version", "license GPLv3+", "Copyright").',
    regex: 'gnu bash|version \\d+\\.|gplv3'
  },
  'lin-logfiltering': {
    command: 'grep -i "error" /var/log/syslog',
    instruction: 'Search log files for anomalies by running `grep -i "error" /var/log/syslog` (or list log files inside your environment using standard wildcards).',
    hint: 'Output should demonstrate matching log streams or directory paths (e.g., "syslog", "error", "auth.log", "dmesg", "log").',
    regex: 'error|log|syslog|auth\\.log|dmesg|kernel'
  },
  'lin-services': {
    command: 'systemctl status cron',
    instruction: 'Query cron daemon run state by executing `systemctl status cron` or `service cron status` on your system.',
    hint: 'Output must represent standard service status properties (e.g., "Active: active", "running", "Loaded:", "cron.service", "systemd").',
    regex: 'active:\\s+active|running|loaded:|cron\\.service|systemd|service'
  },
  'lin-remote': {
    command: 'ssh -V',
    instruction: 'Identify secure shell version configurations by executing version probe `ssh -V`.',
    hint: 'Pasted output must show active SSH compiler versions (e.g., "OpenSSH_", "LibreSSL", "ssh", "version").',
    regex: 'openssh|libressl|ssh|version'
  },
  'win-arch': {
    command: 'reg query "HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion"',
    instruction: 'Query the core Windows Registry hives using `reg query "HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion"` in PowerShell or CMD.',
    hint: 'Pasted logs must represent Windows build registry keys (e.g., "ProductName", "CurrentVersion", "BuildLab", "HKEY_LOCAL_MACHINE").',
    regex: 'productname|currentversion|buildlab|hkey_local_machine'
  },
  'win-shells': {
    command: 'Get-Process',
    instruction: 'Run active process diagnostic command `Get-Process` in PowerShell (or `tasklist` in classic Command Prompt).',
    hint: 'Output must list Windows system active process footprints (e.g., "Handles", "NPM", "PM", "WS", "CPU", "Id", "ProcessName", "System", "svchost").',
    regex: 'handles|npm|pm|ws|cpu|processname|svchost|tasklist|image name'
  },
  'win-ad-logs': {
    command: 'Get-EventLog -LogName System -Newest 5',
    instruction: 'Audit active Windows Event Log streams by running `Get-EventLog -LogName System -Newest 5` in PowerShell.',
    hint: 'Logs must list recent OS events properties (e.g., "Index", "Time", "EntryType", "Source", "InstanceID", "Message").',
    regex: 'index|time|entrytype|source|instanceid|message|eventlog'
  },
  'win-services-firewall': {
    command: 'sc query state= all',
    instruction: 'Query Windows services status list by running command `sc query state= all` (or list active services using standard service utilities).',
    hint: 'Output should demonstrate Windows service state tables (e.g., "SERVICE_NAME", "DISPLAY_NAME", "STATE", "RUNNING", "STOPPED").',
    regex: 'service_name|display_name|state\\s+:\\s+\\d+|running|stopped'
  },
  'docker-basics': {
    command: 'docker ps',
    instruction: 'Execute container listing command `docker ps` or inspect image inventories with `docker images`.',
    hint: 'Output must represent container runtime configurations (e.g., "CONTAINER ID", "IMAGE", "COMMAND", "CREATED", "STATUS", "PORTS", "NAMES").',
    regex: 'container id|image|command|created|status|ports|names|repository|tag'
  },
  'k8s-basics': {
    command: 'kubectl get pods',
    instruction: 'Retrieve cluster runtime node deployments by executing `kubectl get pods` or `kubectl version`.',
    hint: 'Output should list pod status details (e.g., "NAME", "READY", "STATUS", "RESTARTS", "AGE", "Client Version", "Server Version").',
    regex: 'name\\s+ready|status|restarts|age|client version|server version|kubectl'
  },
  'git-workflows': {
    command: 'git status',
    instruction: 'Check local workspace git parameters by running `git status` or version state command `git log -n 1`.',
    hint: 'Output must represent active git working tree status (e.g., "On branch", "Your branch is up to date", "nothing to commit", "commit", "Author:").',
    regex: 'on branch|nothing to commit|changes not staged|untracked files|commit\\s+[a-f0-9]{40}|author:'
  },
  'py-basics': {
    command: 'python -V',
    instruction: 'Verify Python engine installation by executing version command `python -V` or `python3 --version`.',
    hint: 'Output must print active Python installation versions (e.g., "Python 3.", "Python 2.").',
    regex: 'python\\s+[23]\\.\\d+\\.\\d+'
  },
  'py-file-regex': {
    command: 'python -c "import re; print(re.search(\'\\\\d+\', \'Target 100\').group())"',
    instruction: 'Test regular expression compilers in Python by executing command `python -c "import re; print(re.search(\'\\d+\', \'Target 100\').group())"`.',
    hint: 'Pasted output must show parsed numeric match (e.g., "100").',
    regex: '^100$'
  },
  'py-automation': {
    command: 'python -c "import socket; print(socket.gethostname())"',
    instruction: 'Examine Python socket network helper operations by executing `python -c "import socket; print(socket.gethostname())"`.',
    hint: 'Pasted output must print your local computer hostname (e.g., a simple host alphanumeric string).',
    regex: '^[a-zA-Z0-9_-]+'
  },
  'endpoint-audit': {
    command: 'Get-Service',
    instruction: 'Identify security monitoring components by querying system services (on Windows run `Get-Service` or on Linux use `systemctl list-units`).',
    hint: 'Pasted text must list system service descriptions (e.g., "Status", "Name", "DisplayName", "running", "sysmon", "UNIT", "SUB", "ACTIVE").',
    regex: 'status\\s+name|displayname|running|sysmon|unit\\s+load|active\\s+sub'
  },
  'network-defense': {
    command: 'tcpdump -D',
    instruction: 'Identify active packet capture interfaces by executing `tcpdump -D` or `tshark -D`.',
    hint: 'Pasted logs must represent packet sniffer interfaces (e.g., "1. eth0", "2. lo", "Bluetooth", "any", "tshark", "packets").',
    regex: '\\d+\\.[a-z0-9_-]+|capturing on|packet capture|tcpdump|tshark'
  },
  'dig-forensics': {
    command: 'volatility -h',
    instruction: 'Verify your digital forensics analysis tooling availability by running help command `volatility -h`.',
    hint: 'Pasted output must represent Volatility tool framework flags (e.g., "Volatility Foundation", "options:", "plugins").',
    regex: 'volatility|plugins|options:'
  },
  'active-recon': {
    command: 'nmap -sV 10.10.10.10',
    instruction: 'Probe service versions using Port scanner `nmap -sV 10.10.10.10` (or running equivalent local nmap checks).',
    hint: 'Logs must demonstrate active Nmap scanning parameters (e.g., "Nmap scan report for", "PORT STATE SERVICE VERSION", "Service Info:").',
    regex: 'nmap scan report|port\\s+state\\s+service\\s+version|\\d+/tcp\\s+open'
  },
  'net-infiltration': {
    command: 'msfconsole -v',
    instruction: 'Initialize Metasploit penetration testing engine version parameters by running `msfconsole -v`.',
    hint: 'Output must confirm Metasploit Framework version strings (e.g., "Framework Version:", "msfconsole").',
    regex: 'framework version:|msfconsole|metasploit'
  },
  'password-attacks': {
    command: 'john --list=formats',
    instruction: 'Probe supported hashing algorithms inside password cracker tool by running `john --list=formats` or `hashcat --help`.',
    hint: 'Pasted logs must describe cryptographic hashing formats (e.g., "sha512crypt", "bcrypt", "md5crypt", "hashcat", "algorithms").',
    regex: 'sha512crypt|bcrypt|md5crypt|formats|hashcat|algorithms|options:'
  },
  'priv-esc': {
    command: 'sudo -l',
    instruction: 'Audit administrator privilege delegation scopes by executing privilege list command `sudo -l`.',
    hint: 'Logs must represent user sudo allowances (e.g., "User may run the following commands", "(ALL : ALL)", "ALL", "NOPASSWD").',
    regex: 'user may run|\\(all\\s+:\\s+all\\)|nopasswd|\\(root\\)'
  }
};

// Detailed comprehensive textbook sections for each logical domain
interface DomainSections {
  core: string;
  attack: string;
  defense: string;
  tools: string;
}

const DOMAIN_DATA: Record<string, DomainSections> = {
  hardware: {
    core: 'At the physical architecture level, computation is defined by the **Von Neumann architecture**, where memory storage and processing modules communicate over system buses. The central processing unit (CPU) fetches instructions, decodes opcodes, and executes mathematical and logical tasks utilizing built-in **Registers** (high-speed, byte-level silicon structures), transient static RAM caches (L1, L2, L3 cache), and system dynamic RAM (DRAM). Because system memory (RAM) is volatile, electrical state changes or power losses instantly erase memory mappings. Persistent, non-volatile block data is managed by magnetic hard disk drives (HDD) or solid-state drives (SSD) using **NAND Flash floating gates** which trap electrons to represent binary states without active electrical currents.',
    attack: 'Threat actors compromise physical layers via high-yield microarchitectural vectors. **Speculative Execution Side-Channel attacks** (such as Spectre and Meltdown) exploit CPU optimizations by observing transient execution residues in L3 caches to steal sensitive kernel descriptors or cryptography seeds. **Cold Boot attacks** leverage DRAM residual capacitor states, allowing attackers to physically freeze RAM chips with compressed gas and transfer them to specialized readers to dump pre-shutdown disk-encryption keys. Additionally, **Direct Memory Access (DMA) attacks** bypass host kernel policies entirely, using malicious PCIe or Thunderbolt attachments to directly read/write system RAM registers without CPU orchestration.',
    defense: 'Hardening physical boundaries requires multilayered system and chip controls. Enable **TPM (Trusted Platform Module) 2.0** state validation to check early boot sequence hashes before issuing full disk encryption (FDE) master key releases. Block DMA vulnerabilities by enabling **IOMMU (Input-Output Memory Management Unit)** configurations within motherboard firmware and disabling unauthorized Thunderbolt boot device trust profiles. For forensics, volatile system RAM should be captured immediately during an investigation using live software probes before power cycles, allowing forensic suites to construct complete active process timelines, network sockets state tables, and unpack malware payloads.',
    tools: 'Key hardware and chip architecture debugging utilities include: `lscpu` and `lsblk` (for device mapping), `dmidecode` (to query motherboard BIOS properties), `chipsec` (comprehensive platform/firmware vulnerability testing framework), and `Volatility Suite` (the industry-standard volatile memory forensics and extraction engine).'
  },
  boot: {
    core: 'The operating system boot sequence bridges physical hardware and system space. Upon power, motherboard firmware initializes. Modern systems utilize **UEFI (Unified Extensible Firmware Interface)**, which references **GUID Partition Tables (GPT)** and loads cryptographically signed bootloader binaries from the designated **EFI System Partition (ESP)**, replacing legacy BIOS sector-0 MBR structures. Once the OS kernel assumes execution, it isolates resources into **Processes** (independent, virtual memory address spaces managed by the CPU Memory Management Unit (MMU) page directories) and **Threads** (concurrent light execution context units that share parent process memory registers).',
    attack: 'Attackers target boot hierarchies using **UEFI Bootkits / Rootkits**, which hook early-stage boot processes to inject malicious drivers before the operating system kernel or endpoint detection agents can load, rendering them completely invisible to standard security APIs. Post-boot, threat actors execute memory-masquerading attacks like **Process Hollowing** (spawning a legitimate suspended process, carving out its memory space, and swapping it with malicious opcodes) or **DLL Injection** to bypass detection and execute arbitrary code in trusted system contexts.',
    defense: 'Enforce **UEFI Secure Boot** which validates bootloader digital signatures against hardcoded OEM hardware certificate stores (DB/DBX) to prevent execution of tampered boot codes. Deploy **HVCI (Hypervisor-Protected Code Integrity)** and Virtualization-Based Security (VBS) to leverage CPU virtualization features, securing critical kernel operations in an isolated hypervisor ring. Additionally, audit process memory spaces continuously using behavior heuristics, checking for unmapped memory pages flagged as both Writable and Executable (W^X violations).',
    tools: 'Crucial system boot and process auditing utilities include: `Sysinternals Suite` (Autoruns for boot persistence, Process Explorer/ProcMon for thread/DLL inspection), `rkhunter` and `chkrootkit` (for rootkit signatures scanning), and standard system monitoring tools like `htop` and `systemctl`.'
  },
  networking: {
    core: 'Modern communication maps to the **7-Layer OSI Model** and the **4-Layer TCP/IP stack**. As application data travels down the network stack, it is wrapped in protocol headers (Encapsulation). The Application layer payload is formatted as a **Segment** at the Transport layer (injecting TCP/UDP port identifiers), encapsulated into a **Packet** at the Network layer (adding logical source and destination IP addresses), and structured into a **Frame** at the Data Link layer (adding physical MAC addresses) before being transmitted as raw **Bits** over the Physical layer. Physical Layer 2 switches map frames via MAC CAM tables, while Layer 3 routers parse logical IP headers against IP routing tables to calculate next-hop gateways.',
    attack: 'Attackers exploit structural network protocol designs. Layer 2 networks are vulnerable to **MAC Flooding** (filling switch CAM tables with dummy addresses to force the switch to act as a hub, leaking all traffic to a sniffer port) and **ARP Spoofing** (broadcasting poisoned MAC-IP bindings to act as a Man-in-the-Middle). Layer 3 protocols are vulnerable to **IP Spoofing** and logical route hijacking, while Transport protocols suffer from resource starvation via **SYN Flooding**, which exhausts server handshake connection queues.',
    defense: 'Defend physical switches by enabling **MAC-Limiting Port Security** to prevent CAM table overflows. Enforce **DHCP Snooping** to block rogue DHCP servers, and combine it with **Dynamic ARP Inspection (DAI)** to validate MAC-to-IP binds against a trusted database. Segment corporate networks strictly using **Virtual Local Area Networks (VLANs)** and configure stateful ACLs at inter-vLAN routing interfaces to prevent unauthorized host-to-host lateral movement.',
    tools: 'Standard diagnostic and capture utilities include: `Wireshark` and `tcpdump` (for deep packet inspection and sniffing), `arp` and `ip addr` (for interface validation), `nmap` (for network service discovery), and `traceroute` (to trace routing paths).'
  },
  protocols: {
    core: 'Infrastructure helper protocols automate network maintenance and resolution. **DNS (Domain Name System)** translates human-readable hostnames to IP addresses over UDP Port 53. **DHCP (Dynamic Host Configuration Protocol)** dynamically leases IP settings using the 4-stage DORA handshake (Discover, Offer, Request, Acknowledge) over UDP Ports 67/68. **NAT (Network Address Translation)** translates internal RFC 1918 private subnets into single public IP addresses, while **ICMP (Internet Control Message Protocol)** provides diagnostic messaging and feedback.',
    attack: 'Threat actors leverage unauthenticated protocols for hijacking. DNS is highly susceptible to **DNS Cache Poisoning / Spoofing** (injecting rogue resolution mappings into name server caches). Attackers also use DNS for **Amplification DDoS attacks**, querying open resolvers with spoofed source IPs. DHCP networks are vulnerable to **DHCP Starvation** (exhausting IP ranges using spoofed MACs) and **Rogue DHCP server spoofing** to redirect client gateways and capture private traffic.',
    defense: 'Enforce cryptographic integrity on domain zones by deploying **DNSSEC (Domain Name System Security Extensions)**, validating record signatures at resolvers. On the local switch level, configure **DHCP Snooping** to drop DHCP leases from unauthorized ports, and restrict DNS queries to internal authoritative servers. Implement rate-limiting on ICMP queries to mitigate mapping scans and block network ping sweeps.',
    tools: 'Key infrastructure testing utilities include: `dig` (domain information groper), `nslookup` (name server lookup diagnostics), `ipcalc` (subnet calculator), and `Scapy` (Python-based interactive packet generation and manipulation engine).'
  },
  linux: {
    core: 'The Linux operating system is built on a monolithic kernel architecture where all hardware devices, files, and runtime variables are abstracted as file nodes in a unified **Root Directory (/)**. Access is strictly governed by **POSIX permission bits** representing Read (4), Write (2), and Execute (1) privileges across User, Group, and Others classes. Critical configurations are stored in plain text files under `/etc`, log events are streamed to `/var/log`, and system services are controlled via the `systemd` daemon framework.',
    attack: 'Linux systems are compromised via access control slipups. **SUID (Set Owner User ID) exploitation** occurs when executable files marked with SUID permission bits run with owner permissions (such as root) but contain code execution flaws. Attackers also exploit writeable **cron jobs** to achieve scheduled root execution, hijack shared write permissions in `/tmp` directories, and crack weak hashes stored in `/etc/shadow`.',
    defense: 'Audit system file systems regularly to locate SUID files with `find / -perm -4000 -type f 2>/dev/null` and remove unneeded elevation flags. Restrict root logins and configure robust authentication rules within `/etc/ssh/sshd_config`. Deploy **Auditd (Linux Audit Daemon)** to write immutable security event trails, and utilize **PAM (Pluggable Authentication Modules)** to enforce password complexity and MFA across console sessions.',
    tools: 'Linux administration and hardening tools include: `Lynis` (comprehensive security auditing engine), `Fail2ban` (brute-force firewall banner), `Aide` (Advanced Intrusion Detection Environment for file integrity checks), and core CLI tools like `chmod`, `chown`, `systemctl`, `journalctl`, and `grep`.'
  },
  windows: {
    core: 'Windows architecture utilizes a centralized directory service called **Active Directory (AD)** to manage domain memberships, security policies, and group privileges. On the local host, security is governed by the **Local Security Authority Subsystem Service (LSASS)**, which manages active user credential handles in memory, and the **Windows Registry**, a hierarchical database storing OS configurations, drivers, and user parameters.',
    attack: 'Threat actors target Windows credentials and domain relationships. Attackers dump LSASS memory processes using administrative tools to harvest cleartext passwords or NTLM hashes. Inside Active Directory, attackers execute **Kerberoasting** (requesting service tickets for service accounts and cracking them offline) or deploy **Active Directory Certificate Services (ADCS)** exploits to elevate standard accounts to Domain Admin privileges.',
    defense: 'Harden LSASS memory spaces by deploying **Credential Guard**, which utilizes CPU virtualization-based isolation to prevent credential dumping. Implement the **Active Directory Administrative Tiering Model**, isolating domain administrator credentials from standard workstations. Enforce Group Policy Objects (GPOs) to restrict local administrative privileges and log security events using customized **Sysmon (System Monitor)** rulesets.',
    tools: 'Windows administration and testing suites include: `Sysmon` (detailed logging), `Mimikatz` (credential security assessment), `BloodHound` (Active Directory attack path visualizer), `ADExplorer` (Active Directory object viewer), and `PowerShell` / `CMD` environments.'
  },
  containers: {
    core: 'Containerization provides light system isolation. **Docker** leverages native Linux kernel features: **Namespaces** (isolating file systems, process trees, network adapters, and mount paths) and **Control Groups (Cgroups)** (limiting CPU, RAM, and disk utilization). **Kubernetes** extends this, orchestrating container deployments across clusters of nodes using APIs to declare desired states of Pods, Services, and Volume volumes.',
    attack: 'Security boundaries in containers can leak. **Container Breakout attacks** exploit kernel vulnerabilities (e.g., Dirty COW) or mount exposures (such as mounting the host `/var/run/docker.sock` socket inside a guest) to gain root shell execution on the physical host. Attackers also exploit **Privileged Containers** (which disable namespace protections) or execute attacks via vulnerable container images.',
    defense: 'Harden containers by running processes as dedicated, non-root user accounts. Configure filesystems as read-only (`--read-only`) to block persistent malware payloads. Secure Kubernetes clusters by enabling **Role-Based Access Control (RBAC)**, implementing strict Pod Security Standards (PSS), blocking direct API exposures, and scanning container images for vulnerabilities.',
    tools: 'Container security utilities include: `Trivy` and `Clair` (vulnerability scanners for images), `kube-bench` (checks Kubernetes deployments against CIS benchmarks), `Falco` (runtime threat detection engine for containers), and the `kubectl` orchestration command client.'
  },
  python: {
    core: 'Python is a high-level, interpreted programming language widely used in cybersecurity for automation, exploit development, and custom tool construction. By utilizing extensive library ecosystems, analysts build script hooks to parse logs, query system APIs, manipulate raw network packet streams, and orchestrate large-scale configuration scanning tasks.',
    attack: 'Custom Python scripts are vulnerable to severe logic flaws. Using `os.system()` or `subprocess.Popen(shell=True)` with unvalidated user inputs leads to **Command Injection**. Relying on the `pickle` library for object deserialization allows attackers to execute arbitrary system code, and hardcoding secrets inside Python files exposes API keys during static scanning.',
    defense: 'Sanitize all user inputs before processing. Avoid shell execution; use `subprocess.run` with list arguments instead of raw strings to prevent shell parsing. Use secure serialization formats like JSON instead of pickle, and pull secrets dynamically from system environment variables or secure vault APIs.',
    tools: 'Python security utilities include: `Bandit` (dedicated security linter for finding bugs in Python code), `Black` (formatter), `Scapy` (packet generator), and `PyCryptodome` (cryptographic library).'
  },
  defensive_soc: {
    core: 'Defensive security structures are built on the **CIA Triad** (Confidentiality, Integrity, Availability) and the **AAA Model** (Authentication, Authorization, Accounting). A **Security Operations Center (SOC)** monitors enterprise boundaries using **SIEM (Security Information and Event Management)** systems, which ingest active event telemetry logs, parse them via detection pipelines, and alert analysts to anomalous indicators of compromise (IoCs).',
    attack: 'Attackers exploit logging gaps by executing commands on unmonitored assets (blindspots), using evasion strategies like log tampering (attempting to clear or modify event logs), or launching noise injection attacks to overwhelm SOC queues with false alerts.',
    defense: 'Configure central **Log Shipping** using secure TLS channels to transmit logs to write-once (WORM) storage. Automate SOC operations using **SOAR (Security Orchestration, Automation, and Response)** runbooks to block active indicators instantly, and implement **Threat Modeling (STRIDE)** early in software cycles to prevent structural gaps.',
    tools: 'Industry-standard SOC and SIEM suites include: `Splunk Enterprise Security`, `Elastic (ELK) Stack`, `Microsoft Sentinel`, and local auditing agents like `Sysmon` and `Auditd`.'
  },
  offensive: {
    core: 'Offensive security validates defensive postures. This methodology progresses through: passive OSINT reconnaissance, active vulnerability scanning (to identify open ports, misconfigured services, or outdated patch levels), exploit delivery, post-exploitation (to discover local resources), and privilege escalation to capture complete system control.',
    attack: 'Attackers target structural applications using OWASP Top 10 vectors: **SQL Injection (SQLi)** (tampering with database queries to leak records), **Cross-Site Scripting (XSS)** (injecting malicious client-side scripts), **Remote Code Execution (RCE)** (exploiting software bugs to run commands), and **Active Directory Exploits** (Golden Ticket generation).',
    defense: 'Mitigate offensive vectors by adopting **Secure Software Development Lifecycles (SSDLC)**. Enforce parameterized queries to block SQLi, use robust output encoding to prevent XSS, disable unnecessary network services, apply software patches immediately, and perform regular penetration testing to locate weak links.',
    tools: 'Key offensive testing frameworks include: `Burp Suite` (web application proxy and vulnerability scanner), `Metasploit Framework` (exploit delivery), `Nmap` (network mapping and port validation), and password auditing suites like `John the Ripper` and `Hashcat`.'
  },
  cloud: {
    core: 'Cloud infrastructure utilizes software-defined boundaries to manage resources. **Identity & Access Management (IAM)** policies define logical permissions using JSON templates. Cloud security is based on the **Shared Responsibility Model**, where cloud service providers (AWS, Azure, GCP) protect physical layers and hypervisors, and customers secure configurations, access controls, data, and container fabrics.',
    attack: 'Attackers exploit cloud environments via IAM credential theft, SSRF (Server-Side Request Forgery) attacks targeting metadata services (IMDSv1) to harvest temporary security tokens, and public exposure of misconfigured S3/Blob storage buckets.',
    defense: 'Enforce strict multi-factor authentication (MFA) across all cloud identities. Implement the principle of least privilege in IAM policies by avoiding wildcard permissions, upgrade metadata interfaces to IMDSv2, enforce default encryption on cloud buckets, and run continuous cloud posture compliance monitoring.',
    tools: 'Cloud security audit software includes: `Prowler` (AWS/Azure/GCP CIS benchmark scanner), `Scout Suite` (multi-cloud security posture assessment tool), `Pacu` (cloud exploitation framework), and native auditing tools like `AWS CloudTrail` and `GuardDuty`.'
  },
  malware_assembly: {
    core: 'Software execution compiles down to assembly instruction languages (e.g., x86/x64). Analyzing compiled files requires reverse engineering. Analysts perform **Static Analysis** (examining executable code metadata, strings, and instruction structures without running the binary) and **Dynamic Analysis** (running the binary inside isolated sandboxes to monitor filesystem, registry, and network system calls).',
    attack: 'Threat actors employ advanced evasion techniques: **Obfuscation** (scrambling strings and import names), **Anti-Debugging hooks** (checking system variables to detect analyze tools), and **Packers** (compressing malicious code inside benign shells) to prevent security agents from scanning files.',
    defense: 'Defend systems using deep signature rules (YARA) and behavioral heuristics. Perform dynamic analysis inside highly secure, non-networked sandboxes. Implement endpoint security controls like AppLocker to block execution of unhashed software and audit process parent-child relationships.',
    tools: 'Reverse engineering and malware analysis utilities include: `Ghidra` and `IDA Pro` (decompilers and static code visualizers), `x64dbg` and `OllyDbg` (interactive debuggers), `PEview` and `Detect It Easy` (executable structure analyzers), and `YARA` (signature definition engine).'
  },
  cryptography: {
    core: 'Cryptography secures data using mathematical functions. **Symmetric Encryption** uses a single shared key for rapid encryption/decryption (e.g., AES-256). **Asymmetric Encryption** uses public-private key pairs for secure key exchange (e.g., RSA, ECC). **Hashing** provides data integrity verification via one-way cryptographic functions (e.g., SHA-256), while **TLS (Transport Layer Security)** secures network streams through symmetric session keys.',
    attack: 'Threat actors exploit weak cryptographic implementations. Attackers exploit **Weak Cipher Suites** (like RC4 or MD5), launch **Padding Oracle Attacks** to decrypt block ciphers, execute Man-in-the-Middle (MitM) attacks against unauthenticated certificates, or crack weak password hashes using dictionary attacks.',
    defense: 'Harden cryptographic systems by standardizing on modern, secure algorithms: AES-256 for symmetric data-at-rest, ECC or RSA-4096 for asymmetric exchanges, and SHA-256/SHA-512 for file hashing. Disable outdated TLS versions (TLS 1.0 and 1.1), enforcing TLS 1.2 or 1.3 only, and protect certificate trust roots.',
    tools: 'Key cryptographic utilities include: `OpenSSL` (command-line certificate management and file cryptographic operations), `CrypTool` (educational crypto analysis software), and `Hashcat` / `John the Ripper` (for auditing password hash strengths).'
  },
  perimeter_security: {
    core: 'Network perimeter and inline traffic security enforce strict policy boundaries between untrusted and internal zones. **Firewalls** filter traffic using stateful connection tables and 5-tuple rules (source IP, destination IP, source port, destination port, protocol), **VPNs (WireGuard, IPsec, OpenVPN)** establish cryptographically authenticated encrypted tunnels across untrusted links, and **IDS/IPS sensors (Snort, Suricata)** inspect packet payloads against threat signatures and protocol anomalies.',
    attack: 'Attackers evade weak perimeter controls through overly permissive egress/ingress ACLs, split-tunnel VPN leaks, unmonitored encrypted C2 channels, fragmented packet evasion, and signature bypasses targeting unpatched edge appliances.',
    defense: 'Adopt a default-deny firewall posture with explicit least-privilege rules, disable split tunneling on privileged remote access VPNs, deploy TLS inspection or behavioral telemetry where authorized, and continuously tune IDS/IPS rulesets while validating captures in Wireshark or tcpdump.',
    tools: 'Standard perimeter and packet inspection tools include: `iptables` / `nftables`, `pfSense` / `OPNsense`, `WireGuard`, `Suricata`, `Snort`, `tcpdump`, and `Wireshark`.'
  },
  dev_workflows: {
    core: 'Modern security engineering relies on clean version control and structured configuration formats. **Git** tracks every source change using cryptographic SHA hashes across branches and pull requests, while structured data formats like **JSON** and **YAML** standardize infrastructure-as-code manifests, SIEM detection rules, and API payloads.',
    attack: 'Development pipelines are compromised when secrets (API keys, private keys, cloud tokens) are committed to Git history, unreviewed changes bypass branch protections, or unsafe deserialization parsers (such as Python `yaml.load` without `SafeLoader`) execute arbitrary payloads embedded in YAML/JSON inputs.',
    defense: 'Enforce signed commits, branch protection rules with mandatory code review, pre-commit secret scanning (`gitleaks` / `trufflehog`), strict schema validation for JSON/YAML configs, and safe parser loaders (`yaml.safe_load`, `JSON.parse`).',
    tools: 'Core workflow and hygiene utilities include: `git`, `gh` CLI, `gitleaks`, `jq` (JSON query processor), `yamllint`, and pre-commit security hooks.'
  },
  grc_ctf_career: {
    core: 'Governance, Risk, and Compliance (GRC) coordinates security efforts with business policies and regulatory frameworks (PCI-DSS, HIPAA, GDPR, ISO 27001). GRC defines security baselines, manages risks, and implements corporate guidelines. Hands-on learning environments like Capture the Flag (CTF) competitions build practical technical abilities, validating credentials and pathways for security careers.',
    attack: 'GRC failures lead to severe compliance penalties, unauthorized data exposures, and operational vulnerability. Systemic gaps stem from incomplete risk registries, unmanaged third-party vendor access, and lack of regular employee security awareness training.',
    defense: 'Implement continuous risk assessment methodologies, map control checks directly to compliance regulations, schedule frequent third-party security audits, perform security tabletop exercises, and integrate CTF scenarios into corporate training loops.',
    tools: 'GRC management applications include: `OneTrust`, `ZenGRC`, `ComplianceForge` frameworks, and native corporate security training modules.'
  }
};

/**
 * Deterministic lessonId -> domain guide lookup.
 * Returns null for unknown lesson IDs so arbitrary fallback material is never injected.
 */
export function getExplicitDomainKey(lessonId: string): DomainGuideKey | null {
  return EXPLICIT_LESSON_DOMAIN_MAP[lessonId] || null;
}

function extractObjectivesFromContent(content: string): string[] {
  const match = content.match(/####\s*Learning Objectives\s*\n([\s\S]*?)(?=\n#{2,4}\s|\n---|$)/i);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean);
}

function parseMinutesFromDuration(duration: string): number {
  const match = duration.match(/(\d+)/);
  return match ? Number(match[1]) : 15;
}

export function enhanceCurriculum(tiers: Tier[]): Tier[] {
  return tiers.map((tier, tierIdx) => {
    const tierMeta = TIER_METADATA[tier.id];
    return {
      ...tier,
      order: tierMeta?.order ?? tier.order ?? tierIdx + 1,
      defaultRequired: tierMeta?.defaultRequired ?? tier.defaultRequired ?? true,
      topics: tier.topics.map((topic, topicIdx) => {
        const topicMeta = TOPIC_METADATA[topic.id];
        return {
          ...topic,
          order: topicMeta?.order ?? topic.order ?? topicIdx + 1,
          tierId: topicMeta?.tierId ?? topic.tierId ?? tier.id,
          lessons: topic.lessons.map((lesson, lessonIdx) => {
            const lessonMeta = LESSON_METADATA[lesson.id];
            const domainKey = getExplicitDomainKey(lesson.id);
            const sections = domainKey ? DOMAIN_DATA[domainKey] : undefined;

            const alreadyEnhanced = lesson.content.includes('IN-DEPTH TECHNICAL SECURITY GUIDE');
            let enhancedContent = lesson.content;

            if (!alreadyEnhanced && sections) {
              const deepDiveContent = `

---

### 🛡️ IN-DEPTH TECHNICAL SECURITY GUIDE

#### 🌐 1. Core Architecture & Concepts
${sections.core}

#### ⚠️ 2. Attack Vectors & Vulnerabilities
${sections.attack}

#### 🔒 3. Defense & Hardening Best Practices
${sections.defense}

#### ⚙️ 4. Industry Standard Tools
${sections.tools}`;
              enhancedContent = `${lesson.content}${deepDiveContent}`;
            }

            // Check if there is local terminal homework metadata
            const terminalConfig = LESSON_TERMINALS[lesson.id];
            const parsedObjectives =
              lesson.learningObjectives && lesson.learningObjectives.length > 0
                ? lesson.learningObjectives
                : extractObjectivesFromContent(lesson.content);

            return {
              ...lesson,
              content: enhancedContent,
              requiresTerminal: lesson.requiresTerminal ?? !!terminalConfig,
              homeworkCommand: lesson.homeworkCommand ?? terminalConfig?.command,
              homeworkInstruction: lesson.homeworkInstruction ?? terminalConfig?.instruction,
              homeworkHint: lesson.homeworkHint ?? terminalConfig?.hint,
              homeworkValidateRegex: lesson.homeworkValidateRegex ?? terminalConfig?.regex,
              order: lessonMeta?.order ?? lesson.order ?? lessonIdx + 1,
              tierId: lessonMeta?.tierId ?? lesson.tierId ?? tier.id,
              topicId: lessonMeta?.topicId ?? lesson.topicId ?? topic.id,
              difficulty: lessonMeta?.difficulty ?? lesson.difficulty ?? 'beginner',
              estimatedMinutes:
                lessonMeta?.estimatedMinutes ??
                lesson.estimatedMinutes ??
                parseMinutesFromDuration(lesson.duration),
              learningObjectives: parsedObjectives,
              prerequisites: lessonMeta?.prerequisites ?? lesson.prerequisites ?? [],
              recommendedPrerequisites:
                lessonMeta?.recommendedPrerequisites ?? lesson.recommendedPrerequisites ?? [],
              required: lessonMeta?.required ?? lesson.required ?? true,
              completionRequirements: lessonMeta?.completionRequirements ??
                lesson.completionRequirements ?? {
                  requireQuiz: true,
                  requirePracticalLab: false,
                  requireHomework: false,
                  minQuizScorePercent: 100,
                },
            };
          }),
        };
      }),
    };
  });
}
